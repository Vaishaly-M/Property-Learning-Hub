'use client';

import { redirect } from 'next/navigation';

export default function DashboardCreateSessionRedirect() {
  redirect('/instructor/sessions/create');
}
