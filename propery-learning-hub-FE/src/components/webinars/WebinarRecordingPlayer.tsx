'use client';

import React, { useEffect, useState } from 'react';
import { Close } from '@mui/icons-material';
import { resolveStorageUrl } from '../../utils/mediaUrl';

interface WebinarRecordingPlayerProps {
  title: string;
  streamUrl: string;
  onClose: () => void;
}

export default function WebinarRecordingPlayer({
  title,
  streamUrl,
  onClose,
}: WebinarRecordingPlayerProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolved = resolveStorageUrl(streamUrl) ?? streamUrl;
    if (!resolved) {
      setError('Unable to load recording playback URL.');
      return;
    }
    setResolvedUrl(resolved);
  }, [streamUrl]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-5xl bg-black rounded-xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
          <h3 className="text-sm font-semibold truncate pr-4">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close player"
          >
            <Close className="w-5 h-5" />
          </button>
        </div>
        <div className="bg-black aspect-video flex items-center justify-center">
          {error ? (
            <p className="text-sm text-red-300 px-6 text-center">{error}</p>
          ) : resolvedUrl ? (
            <video
              key={resolvedUrl}
              src={resolvedUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full"
            />
          ) : (
            <p className="text-sm text-slate-300">Loading recording...</p>
          )}
        </div>
      </div>
    </div>
  );
}
