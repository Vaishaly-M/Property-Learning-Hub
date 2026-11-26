'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCreateSession } from '../../hooks/useSessions';
import CalendarAvailability from './CalendarAvailability';

interface BookingFormProps {
  mentorId: number;
  studentId?: number;
  timezone?: string;
  onSuccess?: () => void;
}

export default function BookingForm({ mentorId, studentId, timezone = 'UTC', onSuccess }: BookingFormProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [subject, setSubject] = useState('Mentor Session');
  const [description, setDescription] = useState('');
  const createSession = useCreateSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSlot) {
      toast.error('Please select an available time slot.');
      return;
    }

    try {
      await createSession.mutateAsync({
        mentor_id: mentorId,
        student_id: studentId,
        subject,
        description,
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        timezone,
      });
      toast.success('Session booked successfully!');
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to book session.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
        <input
          type="date"
          value={date}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => {
            setDate(e.target.value);
            setSelectedSlot(null);
          }}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Available Slots</label>
        <CalendarAvailability
          mentorId={mentorId}
          date={date}
          timezone={timezone}
          selectedSlot={selectedSlot?.start}
          onSelectSlot={setSelectedSlot}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        />
      </div>

      <button
        type="submit"
        disabled={createSession.isPending || !selectedSlot}
        className="w-full py-2.5 rounded-lg bg-blue-900 text-white font-semibold hover:bg-blue-800 disabled:opacity-50"
      >
        {createSession.isPending ? 'Booking...' : 'Book Session'}
      </button>
    </form>
  );
}
