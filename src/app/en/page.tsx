import { VisitorHome } from '@/components/home/visitor-home';
import { homeMetadata } from '@/lib/home-metadata';

export const metadata = homeMetadata('en');

export default function LandingPage() {
  return <VisitorHome locale="en" />;
}
