'use client';

interface SmartAppLinkProps {
  tourId: string;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
  children: React.ReactNode;
}

/**
 * Tries to open the app via deep link, then falls back to the app store.
 * On iOS Safari, the deep link either opens the app or silently fails.
 * After a short timeout, we redirect to the store.
 */
export default function SmartAppLink({
  tourId,
  className,
  style,
  'aria-label': ariaLabel,
  children,
}: SmartAppLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const deepLink = `tourguide://tour/${tourId}`;
    const storeUrl = process.env.NEXT_PUBLIC_APP_STORE_ANDROID || '#';

    // Try deep link
    window.location.href = deepLink;

    // If app not installed, deep link fails silently — redirect to store after delay
    setTimeout(() => {
      if (!document.hidden) {
        window.location.href = storeUrl;
      }
    }, 1500);
  };

  return (
    <a href="#" onClick={handleClick} className={className} style={style} aria-label={ariaLabel}>
      {children}
    </a>
  );
}
