'use client';

import { redirect } from 'next/navigation';

export default function InstructorSessionDetailRedirect() {
  redirect('/dashboard/my-meetings');
}
