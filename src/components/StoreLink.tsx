'use client';

/**
 * Lien « Télécharger l'app » vers le magasin du visiteur.
 *
 * Rendu au serveur avec le magasin par défaut (s'il existe), puis ajusté à la
 * plateforme réelle une fois hydraté. Sans aucune URL de magasin, rien n'est
 * affiché : un bouton qui mène à `#` est pire qu'aucun bouton.
 */

import { getStoreUrl } from '@/lib/app-store';
import { useUserAgent } from '@/lib/use-user-agent';

interface StoreLinkProps {
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  children: React.ReactNode;
}

export default function StoreLink({ className, style, onClick, children }: StoreLinkProps) {
  const ua = useUserAgent();
  const href = getStoreUrl(ua ?? undefined);

  if (!href) return null;
  return (
    <a href={href} className={className} style={style} onClick={onClick} rel="noopener">
      {children}
    </a>
  );
}
