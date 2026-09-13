import { CreatorHome } from '@/components/home/creator-home';
import { creatorMetadata } from '@/lib/creator-metadata';
export const metadata = creatorMetadata('fr');
export default function Page() { return <CreatorHome locale="fr" />; }
