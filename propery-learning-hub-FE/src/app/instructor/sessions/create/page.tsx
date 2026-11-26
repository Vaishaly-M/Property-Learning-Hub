'use client';

import { redirect } from 'next/navigation';

export default function InstructorSessionsCreateRedirect() {
  redirect('/dashboard/book-meeting');
}
