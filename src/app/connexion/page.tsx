import type { Metadata } from 'next';
import { VisitorAuth } from '@/components/auth/visitor-auth';

export const metadata: Metadata = { title: 'Se connecter', robots: { index: false, follow: false } };

export default function Page() {
  return <VisitorAuth locale="fr" mode="login" />;
}
