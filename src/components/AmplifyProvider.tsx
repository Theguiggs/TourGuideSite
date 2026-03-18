'use client';

import { configureAmplify } from '@/lib/amplify/config';

configureAmplify();

export default function AmplifyProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
