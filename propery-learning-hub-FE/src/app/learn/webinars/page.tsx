'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Webinars from '../../../components/learner/Webinars';

function WebinarsPageContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const webinarId = searchParams.get('webinarId');
    if (webinarId) {
      sessionStorage.setItem('learner_open_webinar_id', webinarId);
    }
  }, [searchParams]);

  return <Webinars />;
}

export default function WebinarsPage() {
  return (
    <Suspense fallback={null}>
      <WebinarsPageContent />
    </Suspense>
  );
}