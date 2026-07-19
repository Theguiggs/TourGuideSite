import { permanentRedirect } from 'next/navigation';

export default function LegacyGuideDashboardPage() {
  permanentRedirect('/guide/studio');
}
