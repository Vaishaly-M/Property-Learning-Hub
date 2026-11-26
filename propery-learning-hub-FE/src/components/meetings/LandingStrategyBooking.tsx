"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Mail,
  Phone,
  Plus,
  Trash2,
  User,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  useAvailability,
  useBookMeeting,
} from "../../hooks/usePlatformMeetings";
import { DEFAULT_TIMEZONE } from "../../constants/timezone";
import { formatDateTimeInTimezone } from "../../utils/meetingTimezone";
import type {
  AvailabilitySlot,
  MeetingParticipant,
} from "../../types/platformMeetings";

const inputClass =
  "w-full pl-10 pr-3.5 py-2.5 text-base rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all";

const guestInputClass =
  "w-full px-3.5 py-2.5 text-base rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";

const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildMonthDays(viewMonth: Date): (Date | null)[] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = (first.getDay() + 6) % 7;
  const days: (Date | null)[] = Array.from({ length: startPad }, () => null);
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

type LandingStrategyBookingProps = {
  className?: string;
};

export default function LandingStrategyBooking({
  className = "",
}: LandingStrategyBookingProps) {
  const router = useRouter();
  const bookMutation = useBookMeeting();
  const timezone = DEFAULT_TIMEZONE;
  const today = useMemo(() => toDateString(new Date()), []);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(
    null,
  );
  const [guests, setGuests] = useState<MeetingParticipant[]>([]);
  const [showGuests, setShowGuests] = useState(false);

  const {
    data: availability,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useAvailability(selectedDate || "", timezone);

  const bookingTimezone = availability?.timezone ?? timezone;

  const monthDays = useMemo(() => buildMonthDays(viewMonth), [viewMonth]);

  const selectDate = (date: Date) => {
    const iso = toDateString(date);
    if (iso < today) return;
    // Discovery calls are weekdays only (Mon–Fri)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return;
    setSelectedDate(iso);
    setSelectedSlot(null);
  };

  const addGuest = () => {
    if (guests.length >= 5) {
      toast.error("Maximum 5 additional participants.");
      return;
    }
    setGuests((prev) => [...prev, { name: "", email: "" }]);
    setShowGuests(true);
  };

  const handleBook = async () => {
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Please enter your first and last name.");
      return;
    }
    if (!email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!selectedSlot) {
      toast.error("Please select a date and time from the calendar.");
      return;
    }

    const extraGuests = guests.filter((g) => g.name.trim() && g.email.trim());
    const incompleteGuest = guests.some(
      (g) =>
        (g.name.trim() && !g.email.trim()) ||
        (!g.name.trim() && g.email.trim()),
    );
    if (incompleteGuest) {
      toast.error("Please complete name and email for each participant.");
      return;
    }

    try {
      const meeting = await bookMutation.mutateAsync({
        name,
        email: email.trim(),
        phone: phone.trim() || undefined,
        meeting_type: "discovery_call",
        meeting_provider: "zoom",
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        timezone: bookingTimezone,
        notes: notes.trim() || undefined,
        participants: extraGuests.length > 0 ? extraGuests : undefined,
      });
      sessionStorage.setItem("last_booking", JSON.stringify(meeting));
      router.push("/booking-success");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not book your call. Please try again.",
      );
    }
  };

  const monthLabel = viewMonth.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: timezone,
  });

  const selectedDateLabel = selectedDate
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null;
  return (
    <div className={`p-5 sm:p-6 ${className}`}>
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 lg:items-start">
        {/* Left — form */}
        <div className="space-y-4">
          {/* Name row */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div id="booking-first-name">
              <label htmlFor="booking-first-name-input" className={labelClass}>
                First name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="booking-first-name-input"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                  placeholder="Jane"
                />
              </div>
            </div>
            <div id="booking-last-name">
              <label htmlFor="booking-last-name-input" className={labelClass}>
                Last name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="booking-last-name-input"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                  placeholder="Smith"
                />
              </div>
            </div>
          </div>

          {/* Email + Phone row */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div id="booking-email">
              <label htmlFor="booking-email-input" className={labelClass}>
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="booking-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div id="booking-phone">
              <label htmlFor="booking-phone-input" className={labelClass}>
                Phone{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="booking-phone-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="+44 7..."
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div id="booking-notes">
            <label htmlFor="booking-notes-input" className={labelClass}>
              What would you like to discuss?
            </label>
            <ul className="text-sm text-slate-500 space-y-1 mb-2 list-disc list-inside">
              <li>Where are you right now in your property journey?</li>
              <li>
                What do you feel is the biggest bottleneck holding you back
                right now?
              </li>
            </ul>
            <textarea
              id="booking-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3.5 py-2.5 text-base rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all resize-none"
              placeholder="Share your answers here..."
            />
          </div>

          {/* Guests */}
          <div
            id="booking-guests"
            className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <UserPlus className="w-4 h-4 text-slate-500 shrink-0" />
                <p className="text-sm font-medium text-slate-700 truncate">
                  Add a participant
                </p>
                {!showGuests && (
                  <span className="text-sm text-slate-400 hidden sm:inline">
                    (optional, max 5)
                  </span>
                )}
              </div>
              {!showGuests && (
                <button
                  type="button"
                  onClick={() => {
                    setShowGuests(true);
                    if (guests.length === 0) addGuest();
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-700 font-medium hover:text-blue-900 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add guest
                </button>
              )}
            </div>

            {showGuests && (
              <div className="space-y-3 mt-3 pt-3 border-t border-slate-200/80">
                {guests.map((guest, index) => (
                  <div
                    key={index}
                    className="grid sm:grid-cols-[1fr_1fr_auto] gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Name"
                      value={guest.name}
                      onChange={(e) =>
                        setGuests((prev) =>
                          prev.map((g, i) =>
                            i === index ? { ...g, name: e.target.value } : g,
                          ),
                        )
                      }
                      className={guestInputClass}
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={guest.email}
                      onChange={(e) =>
                        setGuests((prev) =>
                          prev.map((g, i) =>
                            i === index ? { ...g, email: e.target.value } : g,
                          ),
                        )
                      }
                      className={guestInputClass}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setGuests((prev) => {
                          const next = prev.filter((_, i) => i !== index);
                          if (next.length === 0) setShowGuests(false);
                          return next;
                        });
                      }}
                      className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors self-center"
                      aria-label="Remove participant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {guests.length < 5 && (
                  <button
                    type="button"
                    onClick={addGuest}
                    className="inline-flex items-center gap-1.5 text-sm text-blue-700 font-medium hover:text-blue-900"
                  >
                    <Plus className="w-4 h-4" />
                    Add another
                  </button>
                )}
              </div>
            )}
          </div>

          {selectedSlot && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-900">
              <span className="font-semibold">Your call: </span>
              {formatDateTimeInTimezone(selectedSlot.start, bookingTimezone)}
            </div>
          )}

          {/* Submit button */}
          <button
            id="booking-submit"
            type="button"
            disabled={bookMutation.isPending}
            onClick={handleBook}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold text-base hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 shadow-md shadow-emerald-600/20 transition-all"
          >
            {bookMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Booking...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Book my strategic call
              </>
            )}
          </button>
        </div>

        {/* Right — calendar */}
        <div
          id="booking-calendar"
          className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm"
        >
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <h3 className="text-base font-bold text-slate-900">Pick your availability</h3>
            <p className="text-sm text-slate-500">{bookingTimezone}</p>
          </div>

          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() =>
                setViewMonth(
                  new Date(
                    viewMonth.getFullYear(),
                    viewMonth.getMonth() - 1,
                    1,
                  ),
                )
              }
              className="p-1 rounded-md hover:bg-slate-100 text-slate-600"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="text-base font-semibold text-slate-900">
              {monthLabel}
            </p>
            <button
              type="button"
              onClick={() =>
                setViewMonth(
                  new Date(
                    viewMonth.getFullYear(),
                    viewMonth.getMonth() + 1,
                    1,
                  ),
                )
              }
              className="p-1 rounded-md hover:bg-slate-100 text-slate-600"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-slate-400 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="h-9" />;
              const iso = toDateString(day);
              const isPast = iso < today;
              const dayOfWeek = day.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const isUnavailable = isPast || isWeekend;
              const isSelected = selectedDate === iso;
              const isToday = iso === today;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isUnavailable}
                  onClick={() => selectDate(day)}
                  className={`h-9 rounded-lg text-sm font-semibold transition-all ${
                    isUnavailable
                      ? "text-slate-300 cursor-not-allowed"
                      : isSelected
                        ? "bg-blue-900 text-white shadow-sm"
                        : isToday
                          ? "bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100"
                          : "text-slate-700 hover:bg-slate-100"
                  }`}
                  title={isWeekend ? "Weekends are not available" : undefined}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {selectedDate ? (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-sm font-semibold text-slate-900 mb-3">
                {selectedDateLabel}
              </p>

              {isLoading && !availability ? (
                <div className="flex items-center gap-2 py-4 text-slate-500 justify-center text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  Loading times...
                </div>
              ) : isError ? (
                <p className="text-red-600 text-sm text-center py-3">
                  Unable to load times.{" "}
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="underline font-medium"
                  >
                    Try again
                  </button>
                </p>
              ) : (availability?.slots ?? []).length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">
                  No slots — pick another day.
                </p>
              ) : (
                <div
                  className={`grid grid-cols-4 gap-1.5 max-h-[8.5rem] overflow-y-auto pr-0.5 ${isFetching ? "opacity-60" : ""}`}
                >
                  {(availability?.slots ?? []).map((slot) => {
                    const active = selectedSlot?.start === slot.start;
                    return (
                      <button
                        key={slot.start}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`px-1.5 py-2 rounded-md text-xs font-semibold border transition-all leading-tight ${
                          active
                            ? "border-blue-900 bg-blue-900 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {availability?.working_hours && (
                <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-3">
                  <Clock className="w-3.5 h-3.5" />
                  {availability.working_hours.start} –{" "}
                  {availability.working_hours.end}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center mt-4 pt-4 border-t border-slate-100">
              Select a date to see available times.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
