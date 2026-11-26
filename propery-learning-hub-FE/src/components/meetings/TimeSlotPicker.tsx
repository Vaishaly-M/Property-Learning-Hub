'use client';

import { Loader2 } from 'lucide-react';
import type { AvailabilitySlot } from '../../types/platformMeetings';

interface TimeSlotPickerProps {
  slots: AvailabilitySlot[];
  isLoading?: boolean;
  isError?: boolean;
  selectedStart?: string | null;
  onSelect: (slot: AvailabilitySlot) => void;
}

export default function TimeSlotPicker({
  slots,
  isLoading,
  isError,
  selectedStart,
  onSelect,
}: TimeSlotPickerProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-6">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading available times...
      </div>
    );
  }

  if (isError) {
    return <p className="text-red-600 text-sm">Unable to load availability. Please try again.</p>;
  }

  if (slots.length === 0) {
    return <p className="text-slate-500 text-sm py-4">No available slots for this date.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {slots.map((slot) => {
        const isSelected = selectedStart === slot.start;
        return (
          <button
            key={slot.start}
            type="button"
            onClick={() => onSelect(slot)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              isSelected
                ? 'bg-blue-900 text-white border-blue-900'
                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            {slot.label}
          </button>
        );
      })}
    </div>
  );
}
