'use client';

import { Video, Calendar } from 'lucide-react';
import type { PlatformMeeting } from '../../types/platformMeetings';
import { getAllMeetingParticipants } from '../../types/platformMeetings';
import { getMeetingJoinUrl, isActivePlatformMeeting } from '../../types/platformMeetings';
import { DEFAULT_TIMEZONE } from '../../constants/timezone';
import { formatDateTimeInTimezone, meetingDisplayTimezone } from '../../utils/meetingTimezone';

interface MyMeetingsTableProps {
  meetings: PlatformMeeting[];
  onCancel?: (id: number) => void;
  detailsPath?: string;
  displayTimezone?: string;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-green-100 text-green-800',
  booked: 'bg-green-100 text-green-800',
  rescheduled: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-slate-100 text-slate-700',
};

export default function MyMeetingsTable({
  meetings,
  onCancel,
  detailsPath = '/dashboard/my-meetings',
  displayTimezone = DEFAULT_TIMEZONE,
}: MyMeetingsTableProps) {
  if (meetings.length === 0) {
    return <p className="text-slate-500 py-8 text-center">No meetings scheduled.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Meeting</th>
            <th className="text-left px-4 py-3 font-medium">Participant</th>
            <th className="text-left px-4 py-3 font-medium">When</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {meetings.map((meeting) => {
            const joinUrl = getMeetingJoinUrl(meeting);
            const attendees = getAllMeetingParticipants(meeting);
            const primaryAttendee = attendees[0];
            const extraCount = Math.max(0, attendees.length - 1);
            return (
            <tr key={meeting.id} className="hover:bg-slate-50/50">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-900">{meeting.meeting_type_label}</p>
                <p className="text-slate-500 text-xs">{meeting.name}</p>
              </td>
              <td className="px-4 py-3">
                <p className="text-slate-900">{primaryAttendee?.name ?? meeting.name}</p>
                <p className="text-slate-500 text-xs">{primaryAttendee?.email ?? meeting.email}</p>
                {extraCount > 0 && (
                  <p className="text-slate-500 text-xs mt-1">+{extraCount} more participant{extraCount === 1 ? '' : 's'}</p>
                )}
              </td>
              <td className="px-4 py-3 text-slate-700">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {formatDateTimeInTimezone(
                    meeting.start_time,
                    meetingDisplayTimezone(meeting.timezone, displayTimezone)
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColors[meeting.status]}`}>
                  {meeting.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  {joinUrl && isActivePlatformMeeting(meeting.status) && (
                    <a
                      href={joinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Join
                    </a>
                  )}
                  {onCancel && isActivePlatformMeeting(meeting.status) && (
                    <button
                      type="button"
                      onClick={() => onCancel(meeting.id)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </td>
            </tr>
          );
          })}
        </tbody>
      </table>
    </div>
  );
}
