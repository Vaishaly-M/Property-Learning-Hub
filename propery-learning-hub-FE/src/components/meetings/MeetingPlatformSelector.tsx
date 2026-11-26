'use client';

import type { MeetingProvider } from '../../types/platformMeetings';

export type { MeetingProvider };

export const MEETING_PROVIDER_LABELS: Record<MeetingProvider, string> = {
  teams: 'Microsoft Teams',
  zoom: 'Zoom',
};

const ALL_PROVIDERS: MeetingProvider[] = ['teams', 'zoom'];

interface MeetingPlatformSelectorProps {
  value: MeetingProvider;
  onChange: (value: MeetingProvider) => void;
  availableProviders?: MeetingProvider[];
  zoomEnabled?: boolean;
  className?: string;
}

export default function MeetingPlatformSelector({
  value,
  onChange,
  availableProviders,
  zoomEnabled = true,
  className = '',
}: MeetingPlatformSelectorProps) {
  const selectable = new Set(
    availableProviders?.length ? availableProviders : zoomEnabled ? ALL_PROVIDERS : (['teams'] as MeetingProvider[]),
  );

  return (
    <div className={className}>
      <p className="block text-sm font-medium text-slate-700 mb-2">Meeting platform</p>
      <div className="flex flex-wrap gap-4">
        {ALL_PROVIDERS.map((provider) => {
          const disabled = !selectable.has(provider);
          const label = MEETING_PROVIDER_LABELS[provider];

          return (
            <label
              key={provider}
              className={`inline-flex items-center gap-2 text-sm ${
                disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 cursor-pointer'
              }`}
            >
              <input
                type="radio"
                name="meeting_platform"
                value={provider}
                checked={value === provider}
                disabled={disabled}
                onChange={() => onChange(provider)}
                className="text-blue-900 focus:ring-blue-500 disabled:opacity-50"
              />
              {label}
            </label>
          );
        })}
      </div>
      {!zoomEnabled && (
        <p className="mt-2 text-xs text-slate-500">Zoom will be available soon. Microsoft Teams is used for now.</p>
      )}
    </div>
  );
}
