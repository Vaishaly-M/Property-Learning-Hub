'use client';

import { redirect } from 'next/navigation';

export default function InstructorSessionsRedirect() {
  redirect('/dashboard/my-meetings');
}
