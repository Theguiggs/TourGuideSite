import { render, screen } from '@testing-library/react';
import { VisitReadiness } from '../VisitReadiness';
import { evaluateVisitCompleteness, evaluateStudioVisit } from '@/lib/studio/visit-completeness';

const scenes = [
  { id: 's1', title: 'Le port', transcriptText: 'Texte', studioAudioKey: 'a.wav', originalAudioKey: null, baseAudioSource: 'recording' as const, archived: false },
  { id: 's2', title: null, transcriptText: '', studioAudioKey: null, originalAudioKey: null, baseAudioSource: null, archived: false },
];

describe('VisitReadiness (lot 6.1)', () => {
  it('nomme chaque point bloquant et relie la scène fautive à l’étape Scènes', () => {
    const report = evaluateVisitCompleteness({ narrationMode: 'recording', sourceLanguage: 'fr', scenes });
    render(<VisitReadiness report={report} sessionId="sess-1" scenes={scenes.map((s, i) => ({ id: s.id, title: s.title, order: i }))} />);

    expect(screen.getByTestId('visit-readiness')).toHaveAttribute('data-ready', 'false');
    expect(screen.getByTestId('readiness-source_text')).toHaveAttribute('data-passed', 'false');
    const links = screen.getAllByRole('link', { name: /Scène 2/ });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute('href', '/guide/studio/sess-1/scenes');
  });

  it('annonce « prête » quand tout passe', () => {
    const report = evaluateVisitCompleteness({ narrationMode: 'recording', sourceLanguage: 'fr', scenes: [scenes[0]] });
    render(<VisitReadiness report={report} sessionId="sess-1" scenes={[{ id: 's1', title: 'Le port' }]} />);
    expect(screen.getByTestId('visit-readiness')).toHaveAttribute('data-ready', 'true');
    expect(screen.getByText('Prête pour la modération')).toBeInTheDocument();
  });
});

it('relie un tracé absent à l’itinéraire avant la soumission', () => {
  const report = evaluateStudioVisit({narrationMode: 'recording', language: 'fr', routePath: null}, [scenes[0]]);
  render(<VisitReadiness report={report} sessionId="sess-1" scenes={[scenes[0]]} />);
  expect(screen.getByTestId('visit-readiness')).toHaveAttribute('data-ready', 'false');
  expect(screen.getByTestId('readiness-route')).toHaveAttribute('data-passed', 'false');
  expect(screen.getByRole('link', {name: 'Itinéraire'})).toHaveAttribute('href', '/guide/studio/sess-1/itinerary');
});
