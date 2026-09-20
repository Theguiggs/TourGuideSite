import { VisitorHome } from '@/components/home/visitor-home';
import { homeMetadata } from '@/lib/home-metadata';
import type { Metadata } from 'next';

export function generateMetadata(): Metadata { return homeMetadata('en'); }

export default function LandingPage() {
  return <VisitorHome locale="en" />;
}
