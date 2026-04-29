'use client';

import * as React from 'react';
import { tgColors, tgRadius, tgShadow, tgFonts, tgDuration, tgEase } from '../tokens';

/**
 * <Button>
 * Variantes : primary | accent | ghost
 * Tailles    : sm | md | lg
 *
 * Choix : primary = encre (action standard) ; accent = grenadine (call-to-action fort) ;
 * ghost = transparent + bord encre (action secondaire ou inverse).
 *
 * États interactifs : hover (opacity 0.9), focus-visible (outline 2px ink),
 * disabled (opacity 0.4, pointer-events: none, cursor: not-allowed).
 *
 * Story 2.1 — polish Web : ajout `accessibilityLabel` (→ `aria-label`),
 * `testID` (→ `data-testid`), états interactifs via state React + onFocus/onBlur.
 */
export type ButtonVariant = 'primary' | 'accent' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  /** Mappé vers `aria-label` (parité API avec le miroir RN). */
  accessibilityLabel?: string;
  /** Mappé vers `data-testid` (parité API avec le miroir RN). */
  testID?: string;
};

type ButtonAsButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

type ButtonAsAnchorProps = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    /**
     * Si fourni, rend un `<a>` au lieu d'un `<button>` — évite l'imbrication
     * `<a><button></button></a>` invalide quand le bouton sert de lien
     * (Story 4.2 — fix a11y hero CTA).
     */
    href: string;
  };

export type ButtonProps = ButtonAsButtonProps | ButtonAsAnchorProps;

const sizes: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '8px 14px',  fontSize: 13, gap: 6,  borderRadius: tgRadius.pill },
  md: { padding: '11px 18px', fontSize: 14, gap: 8,  borderRadius: tgRadius.pill },
  lg: { padding: '14px 24px', fontSize: 15, gap: 10, borderRadius: tgRadius.pill },
};

const variants: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: tgColors.ink,
    color: tgColors.paper,
    border: '1.5px solid transparent',
  },
  accent: {
    background: tgColors.grenadine,
    color: tgColors.paper,
    border: '1.5px solid transparent',
    boxShadow: tgShadow.accent,
  },
  ghost: {
    background: 'transparent',
    color: tgColors.ink,
    border: `1.5px solid ${tgColors.ink}`,
  },
};

export const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button(props, ref) {
    const {
      variant = 'primary',
      size = 'md',
      iconLeft,
      iconRight,
      fullWidth,
      style,
      children,
      accessibilityLabel,
      testID,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
    } = props;

    const [hovered, setHovered] = React.useState(false);
    const [focused, setFocused] = React.useState(false);

    const isAnchor = 'href' in props && props.href !== undefined;
    const isDisabled = !isAnchor && !!(props as ButtonAsButtonProps).disabled;
    const showHover = hovered && !isDisabled;
    const showFocus = focused && !isDisabled;

    const ariaLabel =
      accessibilityLabel ?? (props as React.HTMLAttributes<HTMLElement>)['aria-label'];

    const sharedStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: tgFonts.sans,
      fontWeight: 600,
      textDecoration: 'none',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      pointerEvents: isDisabled ? 'none' : undefined,
      opacity: isDisabled ? 0.4 : showHover ? 0.9 : 1,
      outline: showFocus ? `2px solid ${tgColors.ink}` : 'none',
      outlineOffset: showFocus ? 2 : 0,
      transition: `opacity ${tgDuration.fast}ms ${tgEase.out}, box-shadow ${tgDuration.base}ms ${tgEase.out}`,
      width: fullWidth ? '100%' : undefined,
      ...sizes[size],
      ...variants[variant],
      ...style,
    };

    const sharedHandlers = {
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
        setHovered(true);
        (onMouseEnter as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)?.(e);
      },
      onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
        setHovered(false);
        (onMouseLeave as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)?.(e);
      },
      onFocus: (e: React.FocusEvent<HTMLElement>) => {
        setFocused(true);
        (onFocus as ((e: React.FocusEvent<HTMLElement>) => void) | undefined)?.(e);
      },
      onBlur: (e: React.FocusEvent<HTMLElement>) => {
        setFocused(false);
        (onBlur as ((e: React.FocusEvent<HTMLElement>) => void) | undefined)?.(e);
      },
    };

    const content = (
      <>
        {iconLeft && <span style={{ display: 'inline-flex' }}>{iconLeft}</span>}
        <span>{children}</span>
        {iconRight && <span style={{ display: 'inline-flex' }}>{iconRight}</span>}
      </>
    );

    if (isAnchor) {
      const {
        variant: _v,
        size: _s,
        iconLeft: _il,
        iconRight: _ir,
        fullWidth: _fw,
        accessibilityLabel: _al,
        testID: _tid,
        style: _st,
        children: _c,
        onMouseEnter: _ome,
        onMouseLeave: _oml,
        onFocus: _of,
        onBlur: _ob,
        ...anchorRest
      } = props as ButtonAsAnchorProps;
      void _v; void _s; void _il; void _ir; void _fw; void _al; void _tid;
      void _st; void _c; void _ome; void _oml; void _of; void _ob;
      return (
        <a
          ref={ref as React.ForwardedRef<HTMLAnchorElement>}
          aria-label={ariaLabel}
          data-testid={testID}
          style={sharedStyle}
          {...sharedHandlers}
          {...anchorRest}
        >
          {content}
        </a>
      );
    }

    const {
      variant: _v,
      size: _s,
      iconLeft: _il,
      iconRight: _ir,
      fullWidth: _fw,
      accessibilityLabel: _al,
      testID: _tid,
      style: _st,
      children: _c,
      disabled: _d,
      onMouseEnter: _ome,
      onMouseLeave: _oml,
      onFocus: _of,
      onBlur: _ob,
      ...buttonRest
    } = props as ButtonAsButtonProps;
    void _v; void _s; void _il; void _ir; void _fw; void _al; void _tid;
    void _st; void _c; void _d; void _ome; void _oml; void _of; void _ob;

    return (
      <button
        ref={ref as React.ForwardedRef<HTMLButtonElement>}
        type={buttonRest.type ?? 'button'}
        disabled={isDisabled}
        aria-label={ariaLabel}
        data-testid={testID}
        style={sharedStyle}
        {...sharedHandlers}
        {...buttonRest}
      >
        {content}
      </button>
    );
  },
);
