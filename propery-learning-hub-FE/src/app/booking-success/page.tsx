'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MeetingConfirmationCard from '../../components/meetings/MeetingConfirmationCard';
import { getMeetingProviderLabel } from '../../types/platformMeetings';
import type { PlatformMeeting } from '../../types/platformMeetings';

declare global {
  interface Window {
    fbq: (
      eventType: string,
      eventName: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

export default function BookingSuccessPage() {
  const [meeting, setMeeting] = useState<PlatformMeeting | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('last_booking');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setMeeting(parsed);
      } catch {
        //
      }
    }
  }, []);

  // Fire Facebook Lead event when page loads
  useEffect(() => {

    const leadFired = sessionStorage.getItem('fb_lead_fired');
    
    if (typeof window !== 'undefined' && window.fbq && !leadFired) {
      
      window.fbq('track', 'Lead', {
        content_name: 'Discovery Call Booking',
        content_category: 'Booking',
        value: 0,
        currency: 'GBP',
       
        ...(meeting && {
          meeting_type: meeting.meeting_type,
          meeting_provider: meeting.meeting_provider,
        })
      });

      sessionStorage.setItem('fb_lead_fired', 'true');
      
      console.log('Facebook Lead event fired successfully');
    }
  }, [meeting]);

  const providerLabel = meeting ? getMeetingProviderLabel(meeting) : 'Microsoft Teams';

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Thank you!</h1>
      <p className="text-slate-600">
        Your meeting has been booked. A confirmation email with your {providerLabel} join link has been sent.
      </p>

      {meeting && <MeetingConfirmationCard meeting={meeting} />}

      <Link href="/" className="inline-block text-blue-900 hover:underline">
        ← Back to home
      </Link>
    </div>
  );
}