import { VisitorHome } from '@/components/home/visitor-home';
import { homeMetadata } from '@/lib/home-metadata';
import type { Metadata } from 'next';

export function generateMetadata(): Metadata { return homeMetadata('fr'); }

export default function LandingPage() {
  return <VisitorHome locale="fr" />;
}
