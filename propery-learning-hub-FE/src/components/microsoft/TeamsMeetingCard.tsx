'use client';

import { Video, Copy, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import type { MentorSession } from '../../types/microsoft';

export default function TeamsMeetingCard({ session }: { session: MentorSession }) {
  const copyLink = async () => {
    if (!session.join_url) return;
    await navigator.clipboard.writeText(session.join_url);
    toast.success('Teams link copied!');
  };

  if (!session.join_url) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        Teams meeting link is not available yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Video className="w-5 h-5 text-blue-900" />
        <h3 className="font-semibold text-blue-900">Microsoft Teams Meeting</h3>
      </div>
      <p className="text-sm text-slate-600 mb-4 break-all">{session.join_url}</p>
      <div className="flex flex-wrap gap-2">
        <a
          href={session.join_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-800"
        >
          <ExternalLink className="w-4 h-4" />
          Join Meeting
        </a>
        <button
          onClick={copyLink}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 text-blue-900 text-sm hover:bg-white"
        >
          <Copy className="w-4 h-4" />
          Copy Link
        </button>
      </div>
    </div>
  );
}
