'use client';

import { Video, Copy, ExternalLink, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateTimeInTimezone, resolveMeetingTimezone } from '../../utils/meetingTimezone';
import {
  getMeetingJoinUrl,
  getMeetingProviderLabel,
  type PlatformMeeting,
} from '../../types/platformMeetings';

export default function MeetingConfirmationCard({ meeting }: { meeting: PlatformMeeting }) {
  const timeZone = resolveMeetingTimezone(meeting.timezone);
  const joinUrl = getMeetingJoinUrl(meeting);
  const providerLabel = getMeetingProviderLabel(meeting);

  const copyLink = async () => {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
    toast.success(`${providerLabel} link copied!`);
  };

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-6 space-y-4">
      <h2 className="text-xl font-bold text-green-900">Meeting confirmed</h2>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="flex items-start gap-2">
          <Calendar className="w-4 h-4 mt-0.5 text-green-800" />
          <div>
            <p className="text-slate-500">When</p>
            <p className="font-medium text-slate-900">
              {formatDateTimeInTimezone(meeting.start_time, timeZone)}
              {' – '}
              {new Date(meeting.end_time).toLocaleTimeString('en-GB', {
                timeZone,
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{timeZone}</p>
          </div>
        </div>
        <div>
          <p className="text-slate-500">Type</p>
          <p className="font-medium text-slate-900">{meeting.meeting_type_label}</p>
        </div>
        <div>
          <p className="text-slate-500">Platform</p>
          <p className="font-medium text-slate-900">{providerLabel}</p>
        </div>
      </div>

      {joinUrl ? (
        <div className="rounded-lg border border-blue-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Video className="w-5 h-5 text-blue-900" />
            <h3 className="font-semibold text-blue-900">{providerLabel}</h3>
          </div>
          <p className="text-sm text-slate-600 break-all mb-3">{joinUrl}</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 text-white text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Join Meeting
            </a>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 text-blue-900 text-sm"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-600">Meeting link will be sent to your email shortly.</p>
      )}
    </div>
  );
}
