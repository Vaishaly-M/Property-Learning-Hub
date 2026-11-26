// src/app/admin/content/[id]/preview/lessons/[lessonId]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import LessonPlayer from '../../../../../../../components/learner/LessonPlayer';

export default function LessonPreviewPage() {
  const params = useParams();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;

  if (!courseId || !lessonId) {
    return <div className="p-8 text-center text-red-600">Lesson not found</div>;
  }

  return <LessonPlayer courseId={courseId} lessonId={lessonId} previewMode={true} />;
}
