'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import AvailabilityCalendar from './AvailabilityCalendar';
import { useBookMeeting, useBookMeetingAuthenticated } from '../../hooks/usePlatformMeetings';
import {
  BOOKABLE_MEETING_TYPES,
  MEETING_TYPE_LABELS,
  getProviderInviteLabel,
  type AvailabilitySlot,
  type MeetingParticipant,
  type PlatformMeeting,
} from '../../types/platformMeetings';
import { DEFAULT_TIMEZONE } from '../../constants/timezone';
import { useCurrentUser } from '../../hooks/useCurrentUser';

const DEFAULT_MEETING_PROVIDER = 'zoom' as const;

interface MeetingBookingFormProps {
  variant?: 'public' | 'authenticated';
  timezone?: string;
  successPath?: string;
  compact?: boolean;
  currentUser?: { name: string; email: string };
  onBooked?: (meeting: PlatformMeeting) => void;
}

type ParticipantRow = MeetingParticipant & { clientId: string };

const emptyParticipant = (): ParticipantRow => ({
  clientId: crypto.randomUUID(),
  name: '',
  email: '',
});

export default function MeetingBookingForm({
  variant = 'public',
  timezone = DEFAULT_TIMEZONE,
  successPath = '/booking-success',
  compact = false,
  currentUser: propCurrentUser,
  onBooked,
}: MeetingBookingFormProps) {
  const router = useRouter();
  const { user: hookCurrentUser, refreshUser } = useCurrentUser();
  const publicBook = useBookMeeting();
  const authBook = useBookMeetingAuthenticated();
  const bookMutation = variant === 'authenticated' ? authBook : publicBook;

  // Use the hook's user data if available, otherwise use the prop
  const effectiveCurrentUser = variant === 'authenticated' 
    ? (hookCurrentUser || propCurrentUser)
    : propCurrentUser;

  // Refresh user data on mount
  useEffect(() => {
    if (variant === 'authenticated') {
      refreshUser();
    }
  }, [variant, refreshUser]);

  // Listen for user updates
  useEffect(() => {
    const handleUserUpdated = () => {
      if (variant === 'authenticated') {
        refreshUser();
      }
    };

    window.addEventListener('userUpdated', handleUserUpdated);
    return () => {
      window.removeEventListener('userUpdated', handleUserUpdated);
    };
  }, [variant, refreshUser]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [meetingType, setMeetingType] = useState('discovery_call');
  const [notes, setNotes] = useState('');
  const [includeSelf, setIncludeSelf] = useState(true);
  const [extraParticipants, setExtraParticipants] = useState<ParticipantRow[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [bookingTimezone, setBookingTimezone] = useState(timezone);

  useEffect(() => {
    setBookingTimezone(timezone);
  }, [timezone]);

  // Use effective current user data
  const selfEmail = effectiveCurrentUser?.email?.trim().toLowerCase() ?? '';
  const selfName = effectiveCurrentUser?.name?.trim() || effectiveCurrentUser?.email?.trim() || '';

  const selfParticipant = useMemo<MeetingParticipant | null>(() => {
    if (!selfEmail || !effectiveCurrentUser?.email) return null;
    return {
      name: selfName || selfEmail.split('@')[0],
      email: effectiveCurrentUser.email.trim(),
    };
  }, [selfEmail, selfName, effectiveCurrentUser?.email]);

  // Update name/email fields when currentUser changes
  useEffect(() => {
    if (variant === 'authenticated' && effectiveCurrentUser) {
      if (effectiveCurrentUser.name && !name) {
        setName(effectiveCurrentUser.name);
      }
      if (effectiveCurrentUser.email && !email) {
        setEmail(effectiveCurrentUser.email);
      }
    }
  }, [effectiveCurrentUser, variant, name, email]);

  const addParticipant = () => {
    const maxExtras = selfParticipant && includeSelf ? 9 : 10;
    if (extraParticipants.length >= maxExtras) {
      toast.error(`Maximum ${maxExtras} additional participants.`);
      return;
    }
    setExtraParticipants((prev) => [...prev, emptyParticipant()]);
  };

  const updateParticipant = (clientId: string, field: keyof MeetingParticipant, value: string) => {
    setExtraParticipants((prev) =>
      prev.map((p) => (p.clientId === clientId ? { ...p, [field]: value } : p))
    );
  };

  const removeParticipant = (clientId: string) => {
    setExtraParticipants((prev) => prev.filter((p) => p.clientId !== clientId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSlot) {
      toast.error('Please select a time slot.');
      return;
    }

    const extras = extraParticipants
      .filter((p) => p.name.trim() && p.email.trim())
      .map((p) => ({ name: p.name.trim(), email: p.email.trim() }));

    if (variant === 'authenticated' && !includeSelf && extras.length === 0) {
      toast.error('Add at least one participant or include yourself in the booking.');
      return;
    }

    let bookingName: string | undefined;
    let bookingEmail: string | undefined;
    let bookingParticipants: MeetingParticipant[] | undefined;

    if (variant === 'authenticated' && !includeSelf && extras.length > 0) {
      bookingName = extras[0].name;
      bookingEmail = extras[0].email;
      bookingParticipants = extras.length > 1 ? extras.slice(1) : undefined;
    } else if (variant === 'authenticated') {
      bookingParticipants = extras.length > 0 ? extras : undefined;
    }

    try {
      const meeting = await bookMutation.mutateAsync({
        name: variant === 'public' ? name : bookingName,
        email: variant === 'public' ? email : bookingEmail,
        phone: variant === 'public' ? phone || undefined : undefined,
        meeting_type: meetingType,
        meeting_provider: DEFAULT_MEETING_PROVIDER,
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        timezone: bookingTimezone,
        notes: notes || undefined,
        participants:
          variant === 'public'
            ? extras.length > 0
              ? extras
              : undefined
            : bookingParticipants,
      });

      if (variant === 'public') {
        sessionStorage.setItem('last_booking', JSON.stringify(meeting));
      }

      const attendeeCount = meeting.all_participants?.length ?? 1 + extras.length;

      if (onBooked) {
        onBooked(meeting);
        setNotes('');
        setSelectedSlot(null);
        setIncludeSelf(true);
        setExtraParticipants([]);
        return;
      }

      toast.success(
        `Meeting booked successfully for ${attendeeCount} participant${attendeeCount === 1 ? '' : 's'}!`
      );
      router.push(successPath);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to book meeting.';
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-5 ${compact ? '' : 'max-w-xl'}`}>
      {variant === 'public' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Meeting type</label>
        <select
          value={meetingType}
          onChange={(e) => setMeetingType(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        >
          {BOOKABLE_MEETING_TYPES.map((value) => (
            <option key={value} value={value}>
              {MEETING_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">Participants</label>
          <button
            type="button"
            onClick={addParticipant}
            className="inline-flex items-center gap-1 text-sm text-blue-900 hover:underline"
          >
            <Plus className="w-4 h-4" />
            Add participant
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {variant === 'authenticated'
            ? 'You are added automatically. Add colleagues or remove yourself if booking for someone else.'
            : `Optional. All participants receive a ${getProviderInviteLabel(DEFAULT_MEETING_PROVIDER)} invite and confirmation email.`}
        </p>
        {variant === 'authenticated' && selfParticipant && includeSelf && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 grid sm:grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-slate-500 mb-1">Name (you)</p>
              <p className="font-medium text-slate-800">{selfParticipant.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Email (you)</p>
              <p className="font-medium text-slate-800">{selfParticipant.email}</p>
            </div>
          </div>
        )}
        {extraParticipants.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No additional participants added.</p>
        ) : (
          <div className="space-y-3">
            {extraParticipants.map((participant) => (
              <div key={participant.clientId} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Name</label>
                  <input
                    type="text"
                    value={participant.name}
                    onChange={(e) => updateParticipant(participant.clientId, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={participant.email}
                    onChange={(e) => updateParticipant(participant.clientId, 'email', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeParticipant(participant.clientId)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  aria-label="Remove participant"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        {variant === 'authenticated' && selfParticipant && !includeSelf && (
          <button
            type="button"
            onClick={() => setIncludeSelf(true)}
            className="text-sm text-blue-900 hover:underline"
          >
            Add me ({selfParticipant.email})
          </button>
        )}
        {variant === 'authenticated' && selfParticipant && includeSelf && (
          <button
            type="button"
            onClick={() => setIncludeSelf(false)}
            className="text-sm text-slate-600 hover:underline"
          >
            Remove me from this booking
          </button>
        )}
      </div>

      <AvailabilityCalendar
        timezone={bookingTimezone}
        selectedSlot={selectedSlot}
        onSelectSlot={setSelectedSlot}
        onTimezoneResolved={setBookingTimezone}
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        />
      </div>

      <button
        type="submit"
        disabled={bookMutation.isPending || !selectedSlot}
        className="w-full py-3 rounded-lg bg-blue-900 text-white font-semibold hover:bg-blue-800 disabled:opacity-50"
      >
        {bookMutation.isPending ? 'Booking...' : 'Book Meeting'}
      </button>
    </form>
  );
}