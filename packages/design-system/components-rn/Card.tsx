import * as React from 'react';
import {
  View,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { tgColors, tgRadius, tgSpace } from '../tokens';
import {
  CARD_DEFAULT_VARIANT,
  type CardVariant,
} from '../components/Card.constants';
import { CARD_ELEVATION_MAP, CARD_IOS_SHADOW_MAP } from './Card.constants';

/**
 * <Card> — miroir React Native du composant Web `components/Card.tsx`.
 *
 * Story 2.3 — AC 7 :
 *   - même API publique : `variant?: 'flat' | 'sm' | 'md' | 'lg'` (default `md`)
 *   - sous-composants compound : `Card.Header` / `Card.Body` / `Card.Footer`
 *   - shadows iOS via `shadowColor/Offset/Radius/Opacity`
 *   - elevation Android via `elevation` (`flat:0, sm:1, md:4, lg:12`)
 *   - `borderRadius: 18`, `overflow: 'hidden'`, `borderWidth: 1`, `borderColor: tgColors.line`
 *   - paddings 4pt grid : Header 16/20, Body 20/20, Footer 16/20 (tokens `tgSpace`)
 *   - séparateurs 1px line portés par Header (bottom) et Footer (top)
 *
 * Composition (identique au Web) :
 *   <Card variant="md">
 *     <Card.Header>...</Card.Header>
 *     <Card.Body>...</Card.Body>
 *     <Card.Footer>...</Card.Footer>
 *   </Card>
 */

export type { CardVariant };

export interface CardRNProps extends ViewProps {
  variant?: CardVariant;
}

const variantElevationStyle = (variant: CardVariant): ViewStyle => {
  if (Platform.OS === 'android') {
    return { elevation: CARD_ELEVATION_MAP[variant] };
  }
  // iOS (et autres) : shadow props natives RN.
  return CARD_IOS_SHADOW_MAP[variant];
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: tgColors.card,
    borderRadius:    tgRadius.lg,
    borderWidth:     1,
    borderColor:     tgColors.line,
    overflow:        'hidden',
  },
  header: {
    paddingVertical:    tgSpace[4],
    paddingHorizontal:  tgSpace[5],
    borderBottomWidth:  1,
    borderBottomColor:  tgColors.line,
  },
  body: {
    paddingVertical:    tgSpace[5],
    paddingHorizontal:  tgSpace[5],
  },
  footer: {
    paddingVertical:    tgSpace[4],
    paddingHorizontal:  tgSpace[5],
    borderTopWidth:     1,
    borderTopColor:     tgColors.line,
    backgroundColor:    tgColors.paperSoft,
  },
});

export function Card({
  variant = CARD_DEFAULT_VARIANT,
  style,
  children,
  ...rest
}: CardRNProps) {
  const cardStyle: StyleProp<ViewStyle> = [styles.card, variantElevationStyle(variant), style];
  return (
    <View style={cardStyle} {...rest}>
      {children}
    </View>
  );
}

Card.Header = function CardHeader({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.header, style]} {...rest}>
      {children}
    </View>
  );
};

Card.Body = function CardBody({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.body, style]} {...rest}>
      {children}
    </View>
  );
};

Card.Footer = function CardFooter({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.footer, style]} {...rest}>
      {children}
    </View>
  );
};
