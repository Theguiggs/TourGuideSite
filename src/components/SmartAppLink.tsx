'use client';

import { getStoreUrl, isMobileUserAgent } from '@/lib/app-store';
import { useUserAgent } from '@/lib/use-user-agent';

interface SmartAppLinkProps {
  tourId: string;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
  children: React.ReactNode;
}

/**
 * « Ouvrir dans l'app » : sur mobile, tente le lien profond `murmure://`
 * puis retombe sur le magasin si l'app n'est pas installée. Sur ordinateur,
 * `murmure://` ne mène nulle part : le lien pointe vers le magasin, ou
 * disparaît s'il n'y en a pas — il naviguait vers `#` jusqu'ici.
 */
export default function SmartAppLink({
  tourId,
  className,
  style,
  'aria-label': ariaLabel,
  children,
}: SmartAppLinkProps) {
  const ua = useUserAgent();
  // `null` = rendu serveur / hydratation : on rend le lien, la décision
  // « ordinateur sans magasin » n'est prise qu'une fois le navigateur connu.
  const env = ua === null ? null : { mobile: isMobileUserAgent(ua), storeUrl: getStoreUrl(ua) };

  if (env && !env.mobile && !env.storeUrl) return null;

  const handleClick = (e: React.MouseEvent) => {
    if (!env?.mobile) {
      // Ordinateur : navigation ordinaire vers le magasin (ou rien).
      if (!env?.storeUrl) e.preventDefault();
      return;
    }
    e.preventDefault();
    window.location.href = `murmure://tour/${tourId}`;
    const storeUrl = env.storeUrl;
    if (!storeUrl) return;
    // App absente : le lien profond échoue en silence, on part au magasin.
    setTimeout(() => {
      if (!document.hidden) window.location.href = storeUrl;
    }, 1500);
  };

  return (
    <a href={env?.storeUrl ?? '#'} onClick={handleClick} className={className} style={style} aria-label={ariaLabel}>
      {children}
    </a>
  );
}
