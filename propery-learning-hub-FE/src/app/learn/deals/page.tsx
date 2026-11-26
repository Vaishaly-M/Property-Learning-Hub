'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Deals from '../../../components/learner/Deals';

function DealsPageContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const dealId = searchParams.get('dealId');
    if (dealId) {
      const parsedDealId = Number(dealId);
      sessionStorage.setItem('learner_open_deal_id', dealId);
      if (Number.isFinite(parsedDealId)) {
        window.dispatchEvent(
          new CustomEvent('learner-open-deal', { detail: { dealId: parsedDealId } })
        );
      }
    }
  }, [searchParams]);

  return <Deals />;
}

export default function DealsPage() {
  return (
    <Suspense fallback={null}>
      <DealsPageContent />
    </Suspense>
  );
}