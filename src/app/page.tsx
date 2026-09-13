import { VisitorHome } from '@/components/home/visitor-home';
import { homeMetadata } from '@/lib/home-metadata';

export const metadata = homeMetadata('fr');

export default function LandingPage() {
  return <VisitorHome locale="fr" />;
}
