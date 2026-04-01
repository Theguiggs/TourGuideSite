/**
 * generate-tour-audio.mjs — Génère les fichiers audio TTS à partir des scripts de narration
 * et les upload dans S3 pour chaque scène de chaque tour premium.
 *
 * Auteur : Steffen Guillaume (steffen.guillaume@gmail.com)
 *
 * Providers supportés :
 *   - qwen        : Qwen3-TTS local, clonage vocal gratuit — RECOMMANDÉ
 *   - elevenlabs  : Clonage vocal cloud (ta voix)
 *   - openai      : Voix synthétiques HD (onyx, nova, shimmer...)
 *   - polly       : AWS Polly Neural (Léa, Rémi) — déjà sur AWS
 *
 * Usage :
 *   # Avec Qwen3-TTS local (GRATUIT, clonage vocal)
 *   TTS_PROVIDER=qwen QWEN_REF_AUDIO=ma-voix.wav node scripts/generate-tour-audio.mjs
 *
 *   # Avec ElevenLabs (clonage vocal cloud)
 *   TTS_PROVIDER=elevenlabs ELEVENLABS_API_KEY=sk_xxx ELEVENLABS_VOICE_ID=xxx node scripts/generate-tour-audio.mjs
 *
 *   # Avec OpenAI
 *   TTS_PROVIDER=openai OPENAI_API_KEY=sk-xxx node scripts/generate-tour-audio.mjs
 *
 *   # Avec AWS Polly
 *   TTS_PROVIDER=polly node scripts/generate-tour-audio.mjs
 *
 *   # Options
 *   --upload          Upload vers S3 après génération
 *   --tour <slug>     Générer un seul tour (ex: --tour crimes-scandales-riviera)
 *   --scene <n>       Générer une seule scène (ex: --scene 3)
 *   --dry-run         Afficher ce qui serait généré sans appeler l'API
 *   --output <dir>    Répertoire de sortie (défaut: output/audio)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { readdir } from 'fs/promises';
import { join, basename } from 'path';

// ── Config ──────────────────────────────────────────────

const PROVIDER = process.env.TTS_PROVIDER || 'qwen';
const OUTPUT_DIR = getArg('--output') || join(import.meta.dirname, '..', 'output', 'audio');
const CONTENT_DIR = join(import.meta.dirname, '..', 'content', 'tours');
const DRY_RUN = process.argv.includes('--dry-run');
const DO_UPLOAD = process.argv.includes('--upload');
const ONLY_TOUR = getArg('--tour');
const ONLY_SCENE = getArg('--scene') ? parseInt(getArg('--scene')) : null;

// S3 config
const S3_BUCKET = 'amplify-tourguide-steff-s-tourguideassetsbucket8b8-zj0ssbc9viom';
const S3_REGION = 'us-east-1';
const SEED_PREFIX = 'seed-pm-';

// Provider configs
const QWEN = {
  model: process.env.QWEN_MODEL || 'Qwen/Qwen3-TTS-12Hz-0.6B-Base', // 0.6B=4-6GB VRAM, 1.7B=24GB
  refAudio: process.env.QWEN_REF_AUDIO || null, // Chemin vers ton sample vocal (30s-5min .wav)
  refText: process.env.QWEN_REF_TEXT || null,    // Transcription du sample (optionnel, auto-détecté)
  serverUrl: process.env.QWEN_SERVER_URL || 'http://localhost:8000', // URL du serveur Qwen3-TTS
  maxChars: 10000, // Pas de limite stricte en local
  format: 'wav',
};

const ELEVENLABS = {
  apiKey: process.env.ELEVENLABS_API_KEY,
  voiceId: process.env.ELEVENLABS_VOICE_ID,
  model: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2',
  baseUrl: 'https://api.elevenlabs.io/v1',
  maxChars: 5000,
  format: 'mp3',
};

const OPENAI = {
  apiKey: process.env.OPENAI_API_KEY,
  voice: process.env.OPENAI_VOICE || 'onyx', // onyx=grave, nova=douce, shimmer=chaleureuse
  model: process.env.OPENAI_MODEL || 'tts-1-hd',
  maxChars: 4096,
  format: 'mp3',
};

const POLLY = {
  voiceId: process.env.POLLY_VOICE || 'Remi', // Remi=homme, Lea=femme (Neural French)
  engine: 'neural',
  maxChars: 3000,
  format: 'mp3',
};

// ── Helpers ─────────────────────────────────────────────

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Parse un fichier script-narration.md et extrait les scènes.
 * Retourne [{ index, title, gps, text }]
 */
function parseNarrationScript(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const scenes = [];

  // Split par "## Scène" ou "---" sections
  const parts = content.split(/^## Scène \d+/m);

  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];

    // Extraire le titre (première ligne après le split)
    const titleMatch = block.match(/^[^\n]*—\s*(.+)/m);
    const title = titleMatch ? titleMatch[1].trim() : `Scène ${i}`;

    // Extraire le GPS
    const gpsMatch = block.match(/\*\*GPS\s*:\*\*\s*([\d.]+),\s*([\d.]+)/);
    const gps = gpsMatch ? { lat: parseFloat(gpsMatch[1]), lng: parseFloat(gpsMatch[2]) } : null;

    // Extraire le texte de narration (tout après le GPS/desc, avant le prochain ---)
    // On prend tout le texte qui n'est pas un header markdown
    const lines = block.split('\n');
    const textLines = [];
    let inText = false;

    for (const line of lines) {
      // Skip headers, GPS lines, empty lines at start
      if (line.startsWith('**GPS') || line.startsWith('**') || line.startsWith('#')) {
        if (inText) continue; // skip embedded metadata
        continue;
      }
      if (line.startsWith('---')) {
        if (inText) break; // end of scene
        continue;
      }
      if (line.trim() === '' && !inText) continue;

      inText = true;
      textLines.push(line);
    }

    const text = textLines.join('\n').trim();
    if (text.length > 50) { // Skip empty/too-short scenes
      scenes.push({ index: i - 1, title, gps, text });
    }
  }

  return scenes;
}

/**
 * Découpe un texte long en chunks respectant la limite de caractères.
 * Coupe sur les paragraphes ou les phrases, jamais au milieu d'un mot.
 */
function chunkText(text, maxChars) {
  if (text.length <= maxChars) return [text];

  const chunks = [];
  const paragraphs = text.split(/\n\n+/);
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  // Si un chunk est encore trop long, couper par phrases
  const result = [];
  for (const chunk of chunks) {
    if (chunk.length <= maxChars) {
      result.push(chunk);
    } else {
      const sentences = chunk.split(/(?<=[.!?])\s+/);
      let sub = '';
      for (const sentence of sentences) {
        if ((sub + ' ' + sentence).length > maxChars && sub.length > 0) {
          result.push(sub.trim());
          sub = sentence;
        } else {
          sub = sub ? sub + ' ' + sentence : sentence;
        }
      }
      if (sub.trim()) result.push(sub.trim());
    }
  }

  return result;
}

/**
 * Concatène des buffers MP3.
 * Simple concatenation — fonctionne pour la plupart des lecteurs.
 */
function concatMp3Buffers(buffers) {
  const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);
  const result = Buffer.alloc(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    buf.copy(result, offset);
    offset += buf.length;
  }
  return result;
}

// ── TTS Providers ───────────────────────────────────────

/**
 * Qwen3-TTS — Tourne en local via un serveur Python.
 *
 * Prérequis :
 *   1. pip install -U qwen-tts
 *   2. Lancer le serveur : qwen-tts-server Qwen/Qwen3-TTS-12Hz-0.6B-Base --port 8000
 *      (ou le 1.7B pour meilleure qualité si tu as 24GB VRAM)
 *   3. Pour le clonage vocal, passer QWEN_REF_AUDIO=chemin/vers/ta-voix.wav
 *
 * Si le serveur Qwen n'est pas dispo, le script lance un subprocess Python inline.
 */
async function ttsQwen(text) {
  const chunks = chunkText(text, QWEN.maxChars);
  const audioBuffers = [];

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await sleep(300);

    // Essayer le serveur HTTP d'abord
    try {
      const body = {
        text: chunks[i],
        language: 'French',
      };
      if (QWEN.refAudio) {
        // Lire le fichier audio de référence en base64
        const audioData = readFileSync(QWEN.refAudio);
        body.ref_audio = audioData.toString('base64');
        if (QWEN.refText) body.ref_text = QWEN.refText;
      }

      const response = await fetch(`${QWEN.serverUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        audioBuffers.push(buffer);
        if (chunks.length > 1) process.stdout.write(`    chunk ${i + 1}/${chunks.length} `);
        continue;
      }
    } catch {
      // Serveur pas dispo, fallback subprocess
    }

    // Fallback : appel Python inline
    const { execSync } = await import('child_process');
    const tmpInput = join(OUTPUT_DIR, `_tmp_input_${i}.txt`);
    const tmpOutput = join(OUTPUT_DIR, `_tmp_output_${i}.wav`);
    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(tmpInput, chunks[i]);

    const refArg = QWEN.refAudio ? `--ref_audio "${QWEN.refAudio}"` : '';
    const refTextArg = QWEN.refText ? `--ref_text "${QWEN.refText}"` : '';

    const pythonScript = `
import sys
from qwen_tts import Qwen3TTSModel
import soundfile as sf

model = Qwen3TTSModel.from_pretrained("${QWEN.model}", device_map="auto")
text = open("${tmpInput.replace(/\\/g, '/')}", "r", encoding="utf-8").read()

ref_audio = ${QWEN.refAudio ? `"${QWEN.refAudio.replace(/\\/g, '/')}"` : 'None'}
ref_text = ${QWEN.refText ? `"${QWEN.refText}"` : 'None'}

if ref_audio:
    wavs, sr = model.generate_voice_clone(text=text, language="French", ref_audio=ref_audio, ref_text=ref_text)
else:
    wavs, sr = model.generate(text=text, language="French")

sf.write("${tmpOutput.replace(/\\/g, '/')}", wavs[0], sr)
print("OK")
`;

    try {
      execSync(`python -c ${JSON.stringify(pythonScript)}`, {
        timeout: 300000, // 5 min max par chunk
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const buffer = readFileSync(tmpOutput);
      audioBuffers.push(buffer);
      if (chunks.length > 1) process.stdout.write(`    chunk ${i + 1}/${chunks.length} `);
    } finally {
      // Cleanup temp files
      try { const { unlinkSync } = await import('fs'); unlinkSync(tmpInput); unlinkSync(tmpOutput); } catch {}
    }
  }

  return chunks.length > 1 ? concatMp3Buffers(audioBuffers) : audioBuffers[0];
}

async function ttsElevenLabs(text) {
  if (!ELEVENLABS.apiKey) throw new Error('ELEVENLABS_API_KEY non défini');
  if (!ELEVENLABS.voiceId) throw new Error('ELEVENLABS_VOICE_ID non défini. Crée un clone vocal sur elevenlabs.io puis copie le voice_id.');

  const chunks = chunkText(text, ELEVENLABS.maxChars);
  const audioBuffers = [];

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await sleep(500); // Rate limiting

    const response = await fetch(
      `${ELEVENLABS.baseUrl}/text-to-speech/${ELEVENLABS.voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: chunks[i],
          model_id: ELEVENLABS.model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`ElevenLabs API error (${response.status}): ${err}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    audioBuffers.push(buffer);

    if (chunks.length > 1) {
      process.stdout.write(`    chunk ${i + 1}/${chunks.length} `);
    }
  }

  return chunks.length > 1 ? concatMp3Buffers(audioBuffers) : audioBuffers[0];
}

async function ttsOpenAI(text) {
  if (!OPENAI.apiKey) throw new Error('OPENAI_API_KEY non défini');

  const chunks = chunkText(text, OPENAI.maxChars);
  const audioBuffers = [];

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await sleep(300);

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI.model,
        voice: OPENAI.voice,
        input: chunks[i],
        response_format: 'mp3',
        speed: 0.95, // Légèrement plus lent pour un guide touristique
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${err}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    audioBuffers.push(buffer);

    if (chunks.length > 1) {
      process.stdout.write(`    chunk ${i + 1}/${chunks.length} `);
    }
  }

  return chunks.length > 1 ? concatMp3Buffers(audioBuffers) : audioBuffers[0];
}

async function ttsPolly(text) {
  // Import dynamique pour ne pas exiger le package si non utilisé
  const { PollyClient, SynthesizeSpeechCommand } = await import('@aws-sdk/client-polly');
  const polly = new PollyClient({ region: S3_REGION });

  const chunks = chunkText(text, POLLY.maxChars);
  const audioBuffers = [];

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await sleep(200);

    const command = new SynthesizeSpeechCommand({
      Text: chunks[i],
      OutputFormat: 'mp3',
      VoiceId: POLLY.voiceId,
      Engine: POLLY.engine,
      LanguageCode: 'fr-FR',
      SampleRate: '24000',
    });

    const result = await polly.send(command);
    const stream = result.AudioStream;
    const chunks2 = [];
    for await (const chunk of stream) {
      chunks2.push(chunk);
    }
    audioBuffers.push(Buffer.concat(chunks2));

    if (chunks.length > 1) {
      process.stdout.write(`    chunk ${i + 1}/${chunks.length} `);
    }
  }

  return chunks.length > 1 ? concatMp3Buffers(audioBuffers) : audioBuffers[0];
}

async function generateAudio(text) {
  switch (PROVIDER) {
    case 'qwen': return ttsQwen(text);
    case 'elevenlabs': return ttsElevenLabs(text);
    case 'openai': return ttsOpenAI(text);
    case 'polly': return ttsPolly(text);
    default: throw new Error(`Provider inconnu: ${PROVIDER}. Utilise: qwen, elevenlabs, openai, polly`);
  }
}

// ── S3 Upload ───────────────────────────────────────────

async function uploadToS3(filePath, s3Key) {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({ region: S3_REGION });

  const fileContent = readFileSync(filePath);

  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: fileContent,
    ContentType: 'audio/mpeg',
  }));

  return `s3://${S3_BUCKET}/${s3Key}`;
}

// ── Main ────────────────────────────────────────────────

async function run() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Génération Audio TTS — Tours Premium        ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Provider : ${PROVIDER}`);
  console.log(`  Output   : ${OUTPUT_DIR}`);
  console.log(`  Upload S3: ${DO_UPLOAD ? 'oui' : 'non (ajouter --upload)'}`);
  console.log(`  Dry run  : ${DRY_RUN ? 'oui' : 'non'}`);
  if (ONLY_TOUR) console.log(`  Tour     : ${ONLY_TOUR}`);
  if (ONLY_SCENE !== null) console.log(`  Scène    : ${ONLY_SCENE}`);
  console.log();

  // Validate provider config
  if (!DRY_RUN) {
    if (PROVIDER === 'qwen') {
      console.log('  Modèle  : ' + QWEN.model);
      console.log('  Ref audio: ' + (QWEN.refAudio || '(aucun — voix par défaut)'));
      console.log('  Serveur  : ' + QWEN.serverUrl);
      console.log('');
      console.log('  💡 Pour utiliser ta voix, enregistre un sample .wav et lance :');
      console.log('     QWEN_REF_AUDIO=ma-voix.wav node scripts/generate-tour-audio.mjs');
      console.log('');
      console.log('  Prérequis :');
      console.log('     pip install -U qwen-tts');
      console.log('     qwen-tts-server ' + QWEN.model + ' --port 8000');
      console.log('');
    }
    if (PROVIDER === 'elevenlabs' && !ELEVENLABS.apiKey) {
      console.error('❌ ELEVENLABS_API_KEY manquant.');
      console.error('');
      console.error('   Pour utiliser ElevenLabs avec ta voix :');
      console.error('   1. Crée un compte sur https://elevenlabs.io');
      console.error('   2. Va dans Voices → Add Voice → Instant Voice Cloning');
      console.error('   3. Upload un sample de ta voix (30s-5min, qualité micro)');
      console.error('   4. Copie le Voice ID et ta clé API');
      console.error('   5. Lance :');
      console.error('      TTS_PROVIDER=elevenlabs ELEVENLABS_API_KEY=sk_xxx ELEVENLABS_VOICE_ID=xxx node scripts/generate-tour-audio.mjs');
      console.error('');
      console.error('   Alternatives gratuites :');
      console.error('      TTS_PROVIDER=qwen node scripts/generate-tour-audio.mjs');
      process.exit(1);
    }
    if (PROVIDER === 'openai' && !OPENAI.apiKey) {
      console.error('❌ OPENAI_API_KEY manquant.');
      console.error('   TTS_PROVIDER=openai OPENAI_API_KEY=sk-xxx node scripts/generate-tour-audio.mjs');
      process.exit(1);
    }
  }

  // Find tour directories
  const entries = await readdir(CONTENT_DIR, { withFileTypes: true });
  const tourDirs = entries
    .filter(e => e.isDirectory() && e.name !== 'README.md')
    .map(e => e.name)
    .filter(name => !ONLY_TOUR || name.includes(ONLY_TOUR));

  if (tourDirs.length === 0) {
    console.error(`❌ Aucun tour trouvé${ONLY_TOUR ? ` pour "${ONLY_TOUR}"` : ''}`);
    process.exit(1);
  }

  let totalScenes = 0;
  let totalBytes = 0;
  let totalChars = 0;

  for (const tourSlug of tourDirs) {
    const scriptPath = join(CONTENT_DIR, tourSlug, 'script-narration.md');
    if (!existsSync(scriptPath)) {
      console.log(`⚠️  ${tourSlug}: pas de script-narration.md, ignoré`);
      continue;
    }

    console.log(`\n📍 ${tourSlug}`);
    console.log('─'.repeat(50));

    const scenes = parseNarrationScript(scriptPath);
    const tourId = `${SEED_PREFIX}tour-${tourSlug.split('-')[0]}`; // rough mapping

    // Mapping slug → seed tour ID
    const slugToId = {
      'crimes-scandales-riviera': `${SEED_PREFIX}tour-crimes`,
      'monaco-dynastie-demesure': `${SEED_PREFIX}tour-monaco`,
      'eze-nid-aigle': `${SEED_PREFIX}tour-eze`,
      'villefranche-cocteau-rade': `${SEED_PREFIX}tour-villefranche`,
      'cap-ferrat-milliardaires': `${SEED_PREFIX}tour-capferrat`,
    };
    const seedTourId = slugToId[tourSlug] || tourSlug;

    // Create output directory
    const tourOutputDir = join(OUTPUT_DIR, tourSlug);
    if (!DRY_RUN) {
      mkdirSync(tourOutputDir, { recursive: true });
    }

    for (const scene of scenes) {
      if (ONLY_SCENE !== null && scene.index !== ONLY_SCENE) continue;

      const chars = scene.text.length;
      const words = scene.text.split(/\s+/).length;
      const estMinutes = Math.round(words / 150);
      totalChars += chars;

      console.log(`  Scène ${scene.index}: ${scene.title} (${chars} chars, ~${estMinutes} min)`);

      if (DRY_RUN) {
        totalScenes++;
        continue;
      }

      try {
        // Generate audio
        const audioBuffer = await generateAudio(scene.text);
        totalBytes += audioBuffer.length;
        totalScenes++;

        // Save locally
        const fileName = `scene_${scene.index}.mp3`;
        const localPath = join(tourOutputDir, fileName);
        writeFileSync(localPath, audioBuffer);
        const sizeMB = (audioBuffer.length / 1024 / 1024).toFixed(1);
        console.log(`    ✅ ${fileName} (${sizeMB} MB)`);

        // Upload to S3
        if (DO_UPLOAD) {
          const s3Key = `guide-audio/${seedTourId}/scene_${scene.index}.mp3`;
          const s3Uri = await uploadToS3(localPath, s3Key);
          console.log(`    ☁️  ${s3Uri}`);
        }

        // Rate limit between scenes
        await sleep(1000);

      } catch (err) {
        console.error(`    ❌ Erreur: ${err.message}`);
        if (err.message.includes('429') || err.message.includes('rate')) {
          console.log('    ⏳ Rate limited, pause 30s...');
          await sleep(30000);
        }
      }
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log(`✅ ${totalScenes} scènes ${DRY_RUN ? '(dry run)' : 'générées'}`);
  console.log(`   ${totalChars.toLocaleString()} caractères envoyés au TTS`);
  if (!DRY_RUN) {
    const totalMB = (totalBytes / 1024 / 1024).toFixed(1);
    console.log(`   ${totalMB} MB audio total`);
    console.log(`   Fichiers dans: ${OUTPUT_DIR}`);
  }

  // Cost estimate
  console.log('\n💰 Estimation coût :');
  if (PROVIDER === 'qwen') {
    console.log(`   Qwen3-TTS: GRATUIT (local) — ${Math.ceil(totalChars / 1000)}k chars, seulement l'électricité GPU`);
  } else if (PROVIDER === 'elevenlabs') {
    console.log(`   ElevenLabs: ~${Math.ceil(totalChars / 1000)} × $0.30/1k chars = ~$${(totalChars / 1000 * 0.30).toFixed(2)}`);
  } else if (PROVIDER === 'openai') {
    console.log(`   OpenAI TTS HD: ~${Math.ceil(totalChars / 1000)} × $0.03/1k chars = ~$${(totalChars / 1000 * 0.03).toFixed(2)}`);
  } else if (PROVIDER === 'polly') {
    console.log(`   AWS Polly Neural: ~${Math.ceil(totalChars / 1000)} × $0.016/1k chars = ~$${(totalChars / 1000 * 0.016).toFixed(2)}`);
  }
}

run().catch(err => {
  console.error(`\n❌ Erreur fatale: ${err.message}`);
  process.exit(1);
});
