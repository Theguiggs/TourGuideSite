import type { Metadata } from 'next';
import { VisitorAuth } from '@/components/auth/visitor-auth';

export const metadata: Metadata = { title: 'Reset my password', robots: { index: false, follow: false } };

export default function Page() {
  return <VisitorAuth locale="en" mode="reset" />;
}
