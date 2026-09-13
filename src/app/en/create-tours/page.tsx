import { CreatorHome } from '@/components/home/creator-home';
import { creatorMetadata } from '@/lib/creator-metadata';
export const metadata = creatorMetadata('en');
export default function Page() { return <CreatorHome locale="en" />; }
