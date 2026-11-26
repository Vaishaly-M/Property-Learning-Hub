// src/app/admin/content/[id]/preview/page.tsx
'use client';

import { useParams } from 'next/navigation';
import CourseDetailPage from '../../../../../components/learner/CourseDetailPage';

export default function PreviewPage() {
  const params = useParams();
  
  if (!params || !params.id) {
    return <div className="p-8 text-center text-red-600">Course not found</div>;
  }
  
  return <CourseDetailPage courseId={params.id as string} previewMode={true} />;
}
