/**
 * Lot 3.4 — les images du catalogue se chargeaient toutes d'un coup, sans
 * dimensions : chaque carte faisait sauter la page à l'arrivée du fichier.
 */
jest.mock('@/config/api-mode', () => ({ shouldUseStubs: () => false }));
jest.mock('@/lib/studio/studio-upload-service', () => ({
  getPlayableUrl: jest.fn(async (key: string) => `https://cdn.example/${key}`),
}));

import { render, screen, waitFor } from '@testing-library/react';
import { S3Image } from '../s3-image';

describe('S3Image', () => {
  it('charge en différé, décode en asynchrone, et porte ses dimensions', async () => {
    render(<S3Image s3Key="guide-1/cover.jpg" alt="Couverture" width={640} height={360} sizes="33vw" />);
    const img = await screen.findByRole('img', { name: 'Couverture' });
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
    expect(img).toHaveAttribute('width', '640');
    expect(img).toHaveAttribute('height', '360');
    expect(img).toHaveAttribute('sizes', '33vw');
  });

  it('charge tout de suite une image prioritaire', async () => {
    render(<S3Image s3Key="https://cdn.example/hero.jpg" alt="Héros" priority />);
    const img = await screen.findByRole('img', { name: 'Héros' });
    expect(img).toHaveAttribute('loading', 'eager');
  });

  it('réserve le ratio de l’image pendant la résolution de l’URL', () => {
    const { container } = render(<S3Image s3Key="guide-1/cover.jpg" alt="x" width={4} height={3} />);
    expect((container.firstChild as HTMLElement).style.aspectRatio).toBe('4 / 3');
  });

  it('reste compatible sans dimensions (appelants existants)', async () => {
    render(<S3Image s3Key="guide-1/cover.jpg" alt="Sans taille" />);
    const img = await screen.findByRole('img', { name: 'Sans taille' });
    expect(img).not.toHaveAttribute('width');
    await waitFor(() => expect(img).toHaveAttribute('src', 'https://cdn.example/guide-1/cover.jpg'));
  });
});
