import { act, render, screen, waitFor } from '@testing-library/react';
import { HomeResume, latestHomeResume } from '../home-resume';
import { clearAllResumes, resumeKey, writeResume, RESUME_MAX_AGE_MS } from '@/components/catalogue/scene-player/resume-store';

const tours = [{ id: 't1', title: 'Nice', citySlug: 'nice', slug: 'test' }, { id: 't2', title: 'Èze', citySlug: 'eze', slug: 'test' }];
beforeEach(() => localStorage.clear());
it('n’affiche rien sans reprise ou pour une visite absente du catalogue', () => {
  writeResume('autre', { sceneId: 'scene', position: 20 });
  const { container } = render(<HomeResume tours={tours} locale="fr" />);
  expect(container).toBeEmptyDOMElement();
});
it('ignore les données illisibles et trop anciennes', () => {
  localStorage.setItem(resumeKey('t1'), '{oops');
  localStorage.setItem(resumeKey('t2'), JSON.stringify({ sceneId: 's', position: 1, updatedAt: Date.now() - RESUME_MAX_AGE_MS - 1000 }));
  expect(latestHomeResume(tours)).toBe('');
});
it('pointe la reprise la plus récente vers une ancre sans déclenchement audio', () => {
  localStorage.setItem(resumeKey('t1'), JSON.stringify({ sceneId: 's', position: 1, updatedAt: Date.now() - 1000 }));
  writeResume('t2', { sceneId: 's2', position: 15, language: 'en' });
  render(<HomeResume tours={tours} locale="en" />);
  expect(screen.getByRole('link')).toHaveAttribute('href', '/en/catalogue/eze/test#itineraire');
  expect(screen.getByText(/On this device/)).toBeInTheDocument();
});
it('retire l’invitation après la purge de déconnexion', async () => {
  writeResume('t1', { sceneId: 's1', position: 10 });
  render(<HomeResume tours={tours} locale="fr" />);
  expect(screen.getByRole('link')).toBeInTheDocument();
  await act(async () => clearAllResumes());
  await waitFor(() => expect(screen.queryByRole('link')).not.toBeInTheDocument());
});
it('tolère un stockage indisponible', () => {
  const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('indisponible'); });
  expect(latestHomeResume(tours)).toBe(''); spy.mockRestore();
});
