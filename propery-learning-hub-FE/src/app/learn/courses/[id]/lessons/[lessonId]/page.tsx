//app/learn/courses/[id]/lessons/[lessonId]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import LessonPlayer from '../../../../../../components/learner/LessonPlayer';

export default function LessonPage() {
  const params = useParams();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;

  return <LessonPlayer courseId={courseId} lessonId={lessonId} />;
}