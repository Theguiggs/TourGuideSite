import { permanentRedirect } from 'next/navigation';

export default function LegacyGuideToursPage() {
  permanentRedirect('/guide/studio/tours');
}
