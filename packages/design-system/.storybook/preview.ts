/**
 * Story 2.7 — Preview global Storybook.
 *
 * - Importe `tokens.css` pour que les variables CSS (`--tg-color-*`,
 *   `--tg-radius-*`, etc.) soient disponibles dans toutes les stories.
 * - Décorateur global qui pose le fond `tg.colors.paper` (#F4ECDD) — le DS est
 *   pensé sur ce fond, pas sur le blanc Storybook par défaut.
 * - Backgrounds preset pour basculer entre paper / paperSoft / card / ink.
 */
import type { Preview } from '@storybook/react';
import { tgColors } from '../tokens';
import '../tokens.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'paper',
      values: [
        { name: 'paper', value: tgColors.paper },
        { name: 'paperSoft', value: tgColors.paperSoft },
        { name: 'paperDeep', value: tgColors.paperDeep },
        { name: 'card', value: tgColors.card },
        { name: 'ink', value: tgColors.ink },
      ],
    },
    layout: 'padded',
    options: {
      storySort: {
        order: [
          'Foundations',
          ['Tokens'],
          'Composants',
          ['Button', 'Card', 'Chip', 'Pin', 'PinNegatif', 'Player', 'Eyebrow', 'PullQuote', 'NumberMark'],
        ],
      },
    },
  },
};

export default preview;
