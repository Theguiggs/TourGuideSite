import { permanentRedirect } from 'next/navigation';

export default function LegacyGuideProfilePage() {
  permanentRedirect('/guide/studio/profil');
}
