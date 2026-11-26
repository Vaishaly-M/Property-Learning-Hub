'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ContactDetailView from '../../../../../components/admin/crm/CrmContactDetail';

export default function ContactDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  if (!id || Number.isNaN(id)) return null;
  return <ContactDetailView contactId={id} />;
}
