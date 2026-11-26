'use client';

import { redirect } from 'next/navigation';

export default function LearnSessionsRedirect() {
  redirect('/dashboard/my-meetings');
}
