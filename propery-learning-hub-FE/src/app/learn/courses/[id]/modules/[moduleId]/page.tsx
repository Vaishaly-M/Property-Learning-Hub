'use client';

import { useParams } from 'next/navigation';
import CourseDetailPage from '../../../../../../components/learner/CourseDetailPage';

export default function CourseModulePage() {
  const params = useParams();

  if (!params?.id || !params?.moduleId) {
    return <div className="p-8 text-center text-slate-600">Module not found</div>;
  }

  return (
    <CourseDetailPage
      courseId={String(params.id)}
      moduleId={String(params.moduleId)}
    />
  );
}
