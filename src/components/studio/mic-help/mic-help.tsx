'use client';

import { useState } from 'react';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

interface MicHelpProps {
  onClose: () => void;
}

const BROWSER_INSTRUCTIONS = [
  {
    name: 'Chrome',
    icon: '🌐',
    steps: [
      'Cliquez sur l\'icône 🔒 à gauche de la barre d\'adresse',
      'Cliquez sur "Paramètres du site"',
      'Trouvez "Microphone" et sélectionnez "Autoriser"',
      'Rechargez la page',
    ],
  },
  {
    name: 'Firefox',
    icon: '🦊',
    steps: [
      'Cliquez sur l\'icône 🔒 à gauche de la barre d\'adresse',
      'Cliquez sur "Supprimer les permissions" pour le microphone',
      'Rechargez la page et acceptez la permission',
    ],
  },
  {
    name: 'Safari',
    icon: '🧭',
    steps: [
      'Allez dans Safari > Préférences > Sites web > Microphone',
      'Trouvez ce site et sélectionnez "Autoriser"',
      'Rechargez la page',
    ],
  },
  {
    name: 'Edge',
    icon: '📘',
    steps: [
      'Cliquez sur l\'icône 🔒 à gauche de la barre d\'adresse',
      'Cliquez sur "Autorisations du site"',
      'Activez "Microphone"',
      'Rechargez la page',
    ],
  },
];

const BROWSER_INSTRUCTIONS_EN: typeof BROWSER_INSTRUCTIONS = [
  {
    name: 'Chrome',
    icon: '🌐',
    steps: [
      'Click the 🔒 icon to the left of the address bar',
      'Click "Site settings"',
      'Find "Microphone" and select "Allow"',
      'Reload the page',
    ],
  },
  {
    name: 'Firefox',
    icon: '🦊',
    steps: [
      'Click the 🔒 icon to the left of the address bar',
      'Click "Clear permissions" for the microphone',
      'Reload the page and accept the permission',
    ],
  },
  {
    name: 'Safari',
    icon: '🧭',
    steps: [
      'Go to Safari > Preferences > Websites > Microphone',
      'Find this site and select "Allow"',
      'Reload the page',
    ],
  },
  {
    name: 'Edge',
    icon: '📘',
    steps: [
      'Click the 🔒 icon to the left of the address bar',
      'Click "Site permissions"',
      'Enable "Microphone"',
      'Reload the page',
    ],
  },
];

export function MicHelp({ onClose }: MicHelpProps) {
  const [selectedBrowser, setSelectedBrowser] = useState(0);
  const { t, locale } = useStudioLocale();
  const instructions = locale === 'en' ? BROWSER_INSTRUCTIONS_EN : BROWSER_INSTRUCTIONS;

  return (
    <div className="bg-card border border-ocre-soft rounded-lg p-4 shadow-lg max-w-lg" data-testid="mic-help">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-body-lg font-semibold text-ink">🎙️ {t('Aide — Permission micro', 'Help — Microphone permission')}</h3>
        <button onClick={onClose} className="text-ink-40 hover:text-ink-80 text-h6">&times;</button>
      </div>

      <p className="text-body text-ink-80 mb-3">
        {t("Le navigateur a bloqué l'accès au microphone. Suivez les instructions pour votre navigateur :", 'The browser blocked access to the microphone. Follow the instructions for your browser:')}
      </p>

      {/* Browser tabs */}
      <div className="flex gap-1 mb-3 border-b border-line">
        {instructions.map((browser, index) => (
          <button
            key={browser.name}
            onClick={() => setSelectedBrowser(index)}
            className={`px-3 py-1.5 text-body rounded-t transition ${
              selectedBrowser === index
                ? 'bg-grenadine-soft text-grenadine border-b-2 border-grenadine'
                : 'text-ink-60 hover:text-ink-80'
            }`}
            data-testid={`browser-tab-${browser.name.toLowerCase()}`}
          >
            {browser.icon} {browser.name}
          </button>
        ))}
      </div>

      {/* Instructions */}
      <ol className="space-y-2">
        {instructions[selectedBrowser].steps.map((step, i) => (
          <li key={i} className="flex gap-2 text-body text-ink-80">
            <span className="w-5 h-5 rounded-pill bg-grenadine-soft text-grenadine flex items-center justify-center text-meta font-bold flex-shrink-0">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <div className="mt-4 p-2 bg-mer-soft rounded text-meta text-mer">
        💡 <strong>{t('Alternative :', 'Alternative:')}</strong> {t('Vous pouvez aussi importer un fichier audio enregistré avec un autre outil.', 'You can also import an audio file recorded with another tool.')}
      </div>
    </div>
  );
}
