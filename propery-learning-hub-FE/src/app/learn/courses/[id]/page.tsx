// app/learn/courses/[id]/page.tsx

'use client';

import { useParams } from 'next/navigation';
import CourseDetailPage from '../../../../components/learner/CourseDetailPage';

export default function Page() {
  const params = useParams();
  
  if (!params || !params.id) {
    return <div>Course not found</div>;
  }
  
  return <CourseDetailPage courseId={params.id as string} />;
}