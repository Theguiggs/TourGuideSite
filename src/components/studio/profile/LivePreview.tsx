'use client';

import { Pin } from '@tourguide/design-system/web';
import { tgColors } from '@tourguide/design-system';
import { cityFamily, FAMILY_META } from '@/components/studio/shell';
import type { GuideProfileDraft } from '@/lib/studio/profile-helpers';

interface LivePreviewProps {
  value: GuideProfileDraft;
  /** Number of tours by this guide (real, from API). */
  toursCount: number;
  /** Total plays across the guide's tours, or null when analytics unavailable. */
  totalPlays?: number | null;
  /** Average rating, or null when no data. */
  averageRating?: number | null;
  /** Up to 2 sample tour titles + cities to feature in the preview ("Ses tours"). */
  sampleTours?: Array<{ city: string; title: string }>;
}

/**
 * <LivePreview> — colonne droite, mockup phone-ish montrant le profil tel
 * qu'il apparaît côté voyageur dans l'app Murmure. Mise à jour en direct.
 * Port de docs/design/ds/studio-profile.jsx:134-207.
 */
export function LivePreview({
  value,
  toursCount,
  totalPlays = null,
  averageRating = null,
  sampleTours = [],
}: LivePreviewProps) {
  const initial = (value.displayName ?? 'S').trim().charAt(0).toUpperCase() || 'S';
  const fam = cityFamily(value.city);
  const famMeta = FAMILY_META[fam];
  const visibleSpecialties = value.specialties.slice(0, 2);
  const extraSpecialtiesCount = Math.max(0, value.specialties.length - visibleSpecialties.length);

  return (
    <div className="sticky top-8" data-testid="live-preview">
      <div className="tg-eyebrow text-mer">Aperçu côté voyageur</div>
      <p className="text-meta text-ink-40 mt-1 italic">
        Ce que voient les utilisateurs Murmure quand ils écoutent un de vos tours.
      </p>

      {/* Phone-ish frame */}
      <div className="mt-3.5 bg-ink rounded-xl p-3">
        <div className="bg-paper rounded-lg overflow-hidden">
          {/* Status bar fake */}
          <div className="flex justify-between px-4 py-2.5 text-meta font-bold text-ink">
            <span>9:41</span>
            <span aria-hidden="true">●●●●</span>
          </div>

          {/* Hero — auteur */}
          <div className="px-5 pt-4 pb-5 border-b border-line">
            <div className="tg-eyebrow text-ink-60">L&apos;auteur</div>
            <div className="flex gap-4 mt-3 items-start">
              <div
                className={`w-[72px] h-[72px] rounded-full text-paper flex items-center justify-center font-display text-h4 shrink-0 ${famMeta.bg}`}
                aria-hidden="true"
              >
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-h5 leading-none text-ink">
                  {value.displayName || 'Votre nom'}
                </div>
                <div className={`tg-eyebrow ${famMeta.text} mt-1`}>
                  {value.city || 'Ville'}
                  {value.yearsExperience ? ` · depuis ${value.yearsExperience}` : ''}
                </div>
                {(visibleSpecialties.length > 0 || extraSpecialtiesCount > 0) && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {visibleSpecialties.map((s) => (
                      <span
                        key={s}
                        className={`text-[10px] px-2 py-0.5 rounded-pill font-bold ${famMeta.bgSoft} ${famMeta.text}`}
                      >
                        {s}
                      </span>
                    ))}
                    {extraSpecialtiesCount > 0 && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-pill font-bold ${famMeta.bgSoft} ${famMeta.text}`}
                      >
                        +{extraSpecialtiesCount}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {/* Bio block */}
            <div className={`mt-4 p-3.5 bg-paper-deep rounded-md border-l-2 ${famMeta.border}`}>
              <p className="font-editorial italic text-caption text-ink-80 leading-relaxed">
                {value.bio?.trim() ? (
                  `« ${value.bio} »`
                ) : (
                  <span className="text-ink-40">
                    « Votre biographie apparaîtra ici. Quelques lignes suffisent — les voyageurs lisent les guides qu&apos;ils sentent humains. »
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="px-5 py-5 border-b border-line flex justify-around">
            <Stat value={String(toursCount)} label="tours" />
            <Stat value={totalPlays !== null ? String(totalPlays) : '—'} label="écoutes" />
            <Stat
              value={averageRating !== null ? `${averageRating.toFixed(1).replace('.', ',')}★` : '—'}
              label="note moyenne"
            />
          </div>

          {/* Tours by author */}
          {sampleTours.length > 0 && (
            <div className="px-5 pt-4 pb-5">
              <div className="tg-eyebrow text-ink-60">
                Ses tours · {toursCount}
              </div>
              {sampleTours.slice(0, 2).map((t) => {
                const tFam = cityFamily(t.city);
                const tMeta = FAMILY_META[tFam];
                return (
                  <div
                    key={t.title}
                    className="mt-2.5 px-3 py-2.5 bg-card border border-line rounded-md flex items-center gap-2.5"
                  >
                    <div
                      className={`w-9 h-9 rounded-sm flex items-center justify-center ${tMeta.bgSoft}`}
                    >
                      <Pin size={18} color={tgColors[tFam]} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`tg-eyebrow ${tMeta.text}`}>{t.city}</div>
                      <div className="font-display text-caption text-ink mt-0.5 truncate">
                        {t.title}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="text-meta text-ink-40 mt-3 text-center italic">
        La preview se met à jour en direct quand vous éditez à gauche.
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-h6 text-ink leading-none">{value}</div>
      <div className="tg-eyebrow text-ink-60 mt-1">{label}</div>
    </div>
  );
}
