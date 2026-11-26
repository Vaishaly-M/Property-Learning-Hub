import type { Metadata } from 'next';
import DiscoveryCallPageContent from '@/components/meetings/DiscoveryCallPageContent';

export const metadata: Metadata = {
  title: 'Book a Discovery Call | Freedom Property Academy',
  description:
    'Book a free 30-minute discovery call with Andrei. Choose a time, get a Zoom invite by email, and take the next step in your property journey.',
};

export default function DiscoveryCallPage() {
  return <DiscoveryCallPageContent />;
}
