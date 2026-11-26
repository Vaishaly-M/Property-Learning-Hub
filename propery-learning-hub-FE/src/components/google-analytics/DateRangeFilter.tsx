import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
  onApply: () => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onChange,
  onApply,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localStartDate, setLocalStartDate] = useState<Date | null>(null);
  const [localEndDate, setLocalEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingStart, setSelectingStart] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (startDate) setLocalStartDate(new Date(startDate));
    if (endDate) setLocalEndDate(new Date(endDate));
  }, [startDate, endDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleApply = () => {
    if (localStartDate && localEndDate) {
      onChange(
        localStartDate.toISOString().split('T')[0],
        localEndDate.toISOString().split('T')[0]
      );
      onApply();
      setIsOpen(false);
    }
  };

  const isFutureDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate >= today;
  };

  const handleDateClick = (date: Date) => {
    if (isFutureDate(date)) return;

    if (selectingStart) {
      setLocalStartDate(date);
      setLocalEndDate(null);
      setSelectingStart(false);
    } else {
      if (date < (localStartDate || new Date())) {
        setLocalStartDate(date);
        setLocalEndDate(null);
        setSelectingStart(false);
      } else {
        setLocalEndDate(date);
        setSelectingStart(true);
      }
    }
  };

  const handlePresetClick = (days: number) => {
    const end = new Date();
    end.setDate(end.getDate() - 1);
    const start = new Date();
    start.setDate(start.getDate() - days);
    setLocalStartDate(start);
    setLocalEndDate(end);
  };

  const handleThisYearClick = () => {
    const end = new Date();
    end.setDate(end.getDate() - 1);
    const start = new Date(end.getFullYear(), 0, 1);
    setLocalStartDate(start);
    setLocalEndDate(end);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const isDateInRange = (date: Date): boolean => {
    if (!localStartDate || !localEndDate) return false;
    return date >= localStartDate && date <= localEndDate;
  };

  const isDateSelected = (date: Date): boolean => {
    if (!localStartDate && !localEndDate) return false;
    const dateStr = date.toDateString();
    if (localStartDate && dateStr === localStartDate.toDateString()) return true;
    if (localEndDate && dateStr === localEndDate.toDateString()) return true;
    return false;
  };

  const formatDisplayDate = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return 'Select Date Range';
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 transition-all duration-300 hover:shadow-lg w-full sm:w-auto"
      >
        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
        <span className="text-xs sm:text-sm font-medium truncate">{formatDisplayDate()}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsOpen(false)} />

          <div className="fixed md:absolute left-0 right-0 bottom-0 md:left-auto md:right-0 md:bottom-auto mt-0 md:mt-2 w-full md:w-[480px] bg-white rounded-t-2xl md:rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden max-h-[90vh] md:max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200 md:hidden">
              <h3 className="text-lg font-bold text-slate-800">Select Date Range</h3>
              <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto">
              <h3 className="text-lg font-bold text-slate-800 mb-4 hidden md:block">Select Date Range</h3>

              <div className="mb-6">
                <p className="text-sm font-semibold text-slate-500 mb-3">Quick Select</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { days: 7, label: '7 days' },
                    { days: 30, label: '30 days' },
                    { days: 90, label: '90 days' },
                  ].map(({ days, label }) => (
                    <button
                      key={days}
                      onClick={() => handlePresetClick(days)}
                      className="px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors text-center font-medium"
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={handleThisYearClick}
                    className="px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors text-center font-medium"
                  >
                    This Year
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 rounded-lg hover:bg-slate-100">
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <h4 className="text-sm sm:text-base font-bold text-slate-800">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h4>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  disabled={currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()}
                  className={`p-2 rounded-lg transition-colors ${
                    currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()
                      ? 'cursor-not-allowed opacity-40'
                      : 'hover:bg-slate-100'
                  }`}
                >
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-slate-400 py-2">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(currentMonth).map((date, index) => {
                  if (!date) return <div key={index} className="aspect-square" />;

                  const isInRange = isDateInRange(date);
                  const isSelected = isDateSelected(date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isFuture = isFutureDate(date);

                  return (
                    <button
                      key={index}
                      onClick={() => handleDateClick(date)}
                      disabled={isFuture}
                      className={`aspect-square rounded-lg text-xs sm:text-sm font-medium transition-all ${
                        isFuture
                          ? 'text-slate-300 cursor-not-allowed bg-slate-50'
                          : isSelected
                          ? 'bg-blue-600 text-white shadow-md scale-105'
                          : isInRange
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-slate-700 hover:bg-slate-100'
                      } ${isToday && !isSelected && !isFuture ? 'ring-2 ring-blue-300' : ''}`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              {localStartDate && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs font-semibold text-slate-500 mb-1">
                    {selectingStart ? 'Select end date' : 'Selected Range'}
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {localStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {localEndDate && ` - ${localEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    {!localEndDate && ' (select end date)'}
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setLocalStartDate(startDate ? new Date(startDate) : null);
                    setLocalEndDate(endDate ? new Date(endDate) : null);
                    setIsOpen(false);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={!localStartDate || !localEndDate}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Check className="w-4 h-4" />
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DateRangeFilter;
