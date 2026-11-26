'use client';

import { Suspense } from 'react';
import Deals from '../../../components/learner/Deals';

function DealReviewPageContent() {
  return <Deals listingKind="review" />;
}

export default function DealReviewPage() {
  return (
    <Suspense fallback={null}>
      <DealReviewPageContent />
    </Suspense>
  );
}
