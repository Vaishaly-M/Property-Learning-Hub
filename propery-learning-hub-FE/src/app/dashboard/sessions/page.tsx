'use client';

import { redirect } from 'next/navigation';

export default function DashboardSessionsRedirect() {
  redirect('/dashboard/my-meetings');
}
