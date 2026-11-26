// components/instructor/InstructorMeetings.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarToday,
  VideoCall,
  Group,
  Schedule,
  Add,
  AccessTime,
  People,
  ContentCopy,
  CheckCircle,
  Cancel,
  Close,
  PersonAdd,
  Today,
  Warning,
  ArrowBack,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import instructorMeetingService, {
  Meeting,
  User,
  DashboardStats,
} from '../../services/instructorMeetingService';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewMeetingState {
  title: string;
  type: 'one-on-one' | 'group' | 'team';
  date: string;
  time: string;
  duration: number;
  description: string;
  waitingRoom: boolean;
  allowRecording: boolean;
  meetingLink: string;
}

// ─── Date helpers ────────────────────────────────────────────────────────────

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

const subMonths = (date: Date, n: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() - n);
  return d;
};

const addMonths = (date: Date, n: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
};

// ─── Step 1 Form ─────────────────────────────────────────────────────────────
// Defined OUTSIDE InstructorMeetings so React never remounts it on re-render.

interface Step1Props {
  newMeeting: NewMeetingState;
  onChange: (field: string, value: any) => void;
  onCancel: () => void;
  onNext: () => void;
}

const ScheduleModalStep1: React.FC<Step1Props> = ({ newMeeting, onChange, onCancel, onNext }) => (
  <div style={{ padding: '24px' }}>
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
        Meeting Title *
      </label>
      <input
        type="text"
        style={{
          width: '100%', padding: '12px 16px', fontSize: '14px', color: '#1e293b',
          backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
          outline: 'none', boxSizing: 'border-box',
        }}
        value={newMeeting.title}
        onChange={(e) => onChange('title', e.target.value)}
        placeholder="e.g., Investment Strategy Review"
      />
    </div>

    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
        Meeting Type *
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
        {(
          [
            { value: 'one-on-one' as const, label: '1:1 Meeting', icon: <PersonAdd /> },
            { value: 'group' as const, label: 'Group Session', icon: <Group /> },
            { value: 'team' as const, label: 'Team Meeting', icon: <People /> },
          ] as const
        ).map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange('type', t.value)}
            style={{
              padding: '12px', borderRadius: '12px',
              border: `2px solid ${newMeeting.type === t.value ? '#1e3a8a' : '#e2e8f0'}`,
              background: newMeeting.type === t.value ? '#eff6ff' : 'white',
              color: newMeeting.type === t.value ? '#1e3a8a' : '#64748b',
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '8px',
            }}
          >
            {t.icon}
            <span style={{ fontSize: '12px', fontWeight: '500' }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
          Date *
        </label>
        <input
          type="date"
          style={{
            width: '100%', padding: '12px 16px', fontSize: '14px', color: '#1e293b',
            backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
            outline: 'none', boxSizing: 'border-box',
          }}
          value={newMeeting.date}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => onChange('date', e.target.value)}
        />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
          Time *
        </label>
        <input
          type="time"
          style={{
            width: '100%', padding: '12px 16px', fontSize: '14px', color: '#1e293b',
            backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
            outline: 'none', boxSizing: 'border-box',
          }}
          value={newMeeting.time}
          onChange={(e) => onChange('time', e.target.value)}
        />
      </div>
    </div>

    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
        Duration
      </label>
      <select
        style={{
          width: '100%', padding: '12px 16px', fontSize: '14px', color: '#1e293b',
          backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
          outline: 'none', cursor: 'pointer', boxSizing: 'border-box',
        }}
        value={newMeeting.duration}
        onChange={(e) => onChange('duration', parseInt(e.target.value))}
      >
        {[15, 30, 45, 60, 90, 120].map((d) => (
          <option key={d} value={d}>
            {d < 60 ? `${d} minutes` : `${d / 60} hour${d > 60 ? 's' : ''}`}
          </option>
        ))}
      </select>
    </div>

    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
        Meeting Link (Optional)
      </label>
      <input
        type="url"
        style={{
          width: '100%', padding: '12px 16px', fontSize: '14px', color: '#1e293b',
          backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
          outline: 'none', boxSizing: 'border-box',
        }}
        value={newMeeting.meetingLink}
        onChange={(e) => onChange('meetingLink', e.target.value)}
        placeholder="https://zoom.us/j/..."
      />
    </div>

    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
        Description
      </label>
      <textarea
        style={{
          width: '100%', padding: '12px 16px', fontSize: '14px', color: '#1e293b',
          backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
          outline: 'none', resize: 'vertical', boxSizing: 'border-box',
        }}
        rows={3}
        value={newMeeting.description}
        onChange={(e) => onChange('description', e.target.value)}
        placeholder="What is this meeting about?"
      />
    </div>

    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={newMeeting.waitingRoom}
          onChange={(e) => onChange('waitingRoom', e.target.checked)}
          style={{ width: '18px', height: '18px', marginRight: '10px', cursor: 'pointer', accentColor: '#1e3a8a' }}
        />
        <span style={{ fontSize: '14px', color: '#334155' }}>Enable waiting room</span>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={newMeeting.allowRecording}
          onChange={(e) => onChange('allowRecording', e.target.checked)}
          style={{ width: '18px', height: '18px', marginRight: '10px', cursor: 'pointer', accentColor: '#1e3a8a' }}
        />
        <span style={{ fontSize: '14px', color: '#334155' }}>Automatically record meeting</span>
      </label>
    </div>

    <div style={{ display: 'flex', gap: '12px' }}>
      <button
        type="button"
        onClick={onCancel}
        style={{
          flex: 1, padding: '12px 16px', background: '#f1f5f9', color: '#475569',
          borderRadius: '12px', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer',
        }}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!newMeeting.title || !newMeeting.date || !newMeeting.time}
        style={{
          flex: 1, padding: '12px 16px',
          background: 'linear-gradient(135deg,#1e3a8a 0%,#1e40af 100%)',
          color: 'white', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
          border: 'none', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: '8px',
          opacity: !newMeeting.title || !newMeeting.date || !newMeeting.time ? 0.5 : 1,
        }}
      >
        Next: Add Participants
        <ArrowBack style={{ fontSize: '14px', transform: 'rotate(180deg)' }} />
      </button>
    </div>
  </div>
);

// ─── Step 2 Form ─────────────────────────────────────────────────────────────
// Also defined OUTSIDE InstructorMeetings for the same reason.

interface Step2Props {
  availableUsers: User[];
  usersLoading: boolean;
  selectedParticipants: User[];
  searchValue: string;
  onSearchChange: (val: string) => void;
  onToggleParticipant: (user: User) => void;
  onBack: () => void;
  onSubmit: () => void;
}

const ScheduleModalStep2: React.FC<Step2Props> = ({
  availableUsers,
  usersLoading,
  selectedParticipants,
  searchValue,
  onSearchChange,
  onToggleParticipant,
  onBack,
  onSubmit,
}) => {
  const filtered = availableUsers.filter(
    (u) =>
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchValue.toLowerCase()) ||
      u.email.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div style={{ padding: '24px' }}>
      {/* Search */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <input
          type="text"
          placeholder="Search by name or email…"
          style={{
            width: '100%', padding: '12px 16px', paddingLeft: '40px', fontSize: '14px',
            color: '#1e293b', backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
            borderRadius: '12px', outline: 'none', boxSizing: 'border-box',
          }}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <svg
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#94a3b8' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Selected chips */}
      {selectedParticipants.length > 0 && (
        <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#1e3a8a', marginBottom: '12px' }}>
            Selected ({selectedParticipants.length})
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {selectedParticipants.map((p) => (
              <div
                key={p.id}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'white', borderRadius: '9999px' }}
              >
                <span style={{ fontSize: '13px', fontWeight: '500', color: '#334155' }}>
                  {p.first_name} {p.last_name}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleParticipant(p)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}
                >
                  <Cancel style={{ fontSize: '14px' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User list */}
      <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
        {usersLoading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Loading users…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No users found</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map((user) => {
              const isSelected = selectedParticipants.some((p) => p.id === user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => onToggleParticipant(user)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px', borderRadius: '12px',
                    border: `1px solid ${isSelected ? '#1e3a8a' : '#e2e8f0'}`,
                    background: isSelected ? '#eff6ff' : 'white',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                        {user.first_name} {user.last_name}
                      </span>
                      <span
                        style={{
                          fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '9999px',
                          background: user.role === 'instructor' ? '#e9d5ff' : '#dbeafe',
                          color: user.role === 'instructor' ? '#6b21a5' : '#1e40af',
                        }}
                      >
                        {user.role}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>{user.email}</p>
                  </div>
                  {isSelected
                    ? <CheckCircle style={{ fontSize: '20px', color: '#22c55e' }} />
                    : <PersonAdd style={{ fontSize: '20px', color: '#94a3b8' }} />
                  }
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', paddingTop: '24px', marginTop: '16px', borderTop: '1px solid #e2e8f0' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            flex: 1, padding: '12px 16px', background: '#f1f5f9', color: '#475569',
            borderRadius: '12px', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <ArrowBack style={{ fontSize: '14px' }} /> Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          style={{
            flex: 1, padding: '12px 16px',
            background: 'linear-gradient(135deg,#1e3a8a 0%,#1e40af 100%)',
            color: 'white', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <Schedule style={{ fontSize: '14px' }} /> Schedule Meeting
        </button>
      </div>
    </div>
  );
};

// ─── Join Modal ───────────────────────────────────────────────────────────────

interface JoinModalProps {
  meeting: Meeting;
  onClose: () => void;
  onStart: (meeting: Meeting) => void;
}

const JoinMeetingModal: React.FC<JoinModalProps> = ({ meeting, onClose, onStart }) => (
  <div
    style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px',
    }}
  >
    <div style={{ background: 'white', borderRadius: '24px', maxWidth: '450px', width: '100%', padding: '32px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ width: '64px', height: '64px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <VideoCall style={{ fontSize: '28px', color: '#22c55e' }} />
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Ready to Start?</h3>
        <p style={{ fontSize: '14px', color: '#64748b' }}>{meeting.title}</p>
      </div>

      <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: '#dbeafe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VideoCall style={{ fontSize: '16px', color: '#1e3a8a' }} />
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>Camera & Microphone</p>
            <p style={{ fontSize: '11px', color: '#64748b' }}>Permission will be requested when you join</p>
          </div>
        </div>
        {meeting.waiting_room && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Warning style={{ fontSize: '16px', color: '#d97706' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>Waiting Room Enabled</p>
              <p style={{ fontSize: '11px', color: '#64748b' }}>Participants will be admitted by you</p>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button type="button" onClick={onClose}
          style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', borderRadius: '12px', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button type="button" onClick={() => onStart(meeting)}
          style={{
            flex: 1, padding: '12px', background: 'linear-gradient(135deg,#1e3a8a 0%,#1e40af 100%)',
            color: 'white', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <VideoCall style={{ fontSize: '14px' }} /> Start Now
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const InstructorMeetings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [searchParticipants, setSearchParticipants] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<User[]>([]);
  const [newMeeting, setNewMeeting] = useState<NewMeetingState>({
    title: '',
    type: 'group',
    date: '',
    time: '',
    duration: 60,
    description: '',
    waitingRoom: true,
    allowRecording: true,
    meetingLink: '',
  });

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    try {
      const res = await instructorMeetingService.getStats();
      if (res.success && res.data) setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  const loadMeetings = useCallback(async () => {
    try {

      let status: 'scheduled' | 'in-progress' | 'completed' | 'all' = 'all';

      if (activeTab === 'upcoming') status = 'scheduled';
      else if (activeTab === 'in-progress') status = 'in-progress';
      else if (activeTab === 'completed') status = 'completed';
      
      const res = await instructorMeetingService.getMeetings({ status, per_page: 50 });
      
       if (res.success && res.data) {
      let data = res.data.data;

      // ✅ EXTRA SAFETY FILTER
      if (activeTab === 'upcoming') {
        data = data.filter((m) => m.status === 'scheduled'); // removes cancelled
      }

      setMeetings(data);
    }
  } catch (err) {
    console.error('Failed to load meetings:', err);
  }
}, [activeTab]);

  const loadAllMeetingsForCalendar = useCallback(async () => {
    try {
      const res = await instructorMeetingService.getMeetings({ status: 'all', per_page: 200 });
      if (res.success && res.data) setAllMeetings(res.data.data);
    } catch (err) {
      console.error('Failed to load calendar meetings:', err);
    }
  }, []);

  const loadUsers = useCallback(async (search = '') => {
    setUsersLoading(true);
    try {
      const res = await instructorMeetingService.searchUsers({ search, per_page: 50 });
      if (res.success && res.data) setAvailableUsers(res.data.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadStats(), loadAllMeetingsForCalendar()]);
      setLoading(false);
    };
    init();
  }, [loadStats, loadAllMeetingsForCalendar]);

  useEffect(() => { loadMeetings(); }, [loadMeetings]);

  // Debounce participant search
  useEffect(() => {
    const t = setTimeout(() => {
      if (showScheduleModal && currentStep === 2) loadUsers(searchParticipants);
    }, 300);
    return () => clearTimeout(t);
  }, [searchParticipants, showScheduleModal, currentStep, loadUsers]);

  // Load users when step 2 first opens
  useEffect(() => {
    if (showScheduleModal && currentStep === 2 && availableUsers.length === 0) loadUsers('');
  }, [showScheduleModal, currentStep, availableUsers.length, loadUsers]);

  const refreshAll = async () => {
    await Promise.all([loadStats(), loadMeetings(), loadAllMeetingsForCalendar()]);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleNewMeetingChange = useCallback((field: string, value: any) => {
    setNewMeeting((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleParticipant = useCallback((user: User) => {
    setSelectedParticipants((prev) =>
      prev.some((p) => p.id === user.id) ? prev.filter((p) => p.id !== user.id) : [...prev, user]
    );
  }, []);

  const handleJoinMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setShowJoinModal(true);
  };

  const handleStartMeeting = async (meeting: Meeting) => {
    try {
      const res = await instructorMeetingService.startMeeting(meeting.id);
      if (res.success) {
        if (res.data?.meeting_link) window.open(res.data.meeting_link, '_blank');
        await refreshAll();
      }
    } catch (err) {
      console.error('Error starting meeting:', err);
      alert('Failed to start meeting');
    }
    setShowJoinModal(false);
  };

  const handleScheduleMeeting = async () => {
    try {
      const payload = {
        title: newMeeting.title,
        description: newMeeting.description || undefined,
        type: newMeeting.type,
        date: newMeeting.date,
        time: newMeeting.time,
        duration: newMeeting.duration,
        meeting_link: newMeeting.meetingLink || undefined,
        waiting_room: newMeeting.waitingRoom,
        allow_recording: newMeeting.allowRecording,
        participant_ids: selectedParticipants.map((p) => p.id),
      };
      const res = await instructorMeetingService.createMeeting(payload);
      if (res.success) {
        await refreshAll();
        closeScheduleModal();
        toast.success('Meeting scheduled successfully!');
      } else {
        toast.error(res.message || 'Failed to schedule meeting');
      }
    } catch (err: any) {
      console.error('Error scheduling meeting:', err);
      toast.error(err?.response?.data?.message || 'Failed to schedule meeting');
    }
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setCurrentStep(1);
    setSelectedParticipants([]);
    setSearchParticipants('');
    setNewMeeting({ title: '', type: 'group', date: '', time: '', duration: 60, description: '', waitingRoom: true, allowRecording: true, meetingLink: '' });
  };

  const handleCompleteMeeting = async (meeting: Meeting) => {
    if (!window.confirm('Mark this meeting as completed?')) return;
    try {
      const res = await instructorMeetingService.completeMeeting(meeting.id);
      if (res.success) { await refreshAll(); toast.error('Meeting marked as completed'); }
    } catch (err) { console.error('Error completing meeting:', err); toast.error('Failed to complete meeting'); }
  };

  const handleCancelMeeting = async (meeting: Meeting) => {
    if (!window.confirm('Are you sure you want to cancel this meeting?')) return;
    try {
      const res = await instructorMeetingService.cancelMeeting(meeting.id);
      if (res.success) { await refreshAll(); toast.error('Meeting cancelled'); }
    } catch (err) { console.error('Error cancelling meeting:', err); toast.error('Failed to cancel meeting'); }
  };

  const handleCopyLink = (link?: string) => {
    if (!link) { toast.error('No meeting link set'); return; }
    navigator.clipboard.writeText(link);
    toast.error('Meeting link copied to clipboard!');
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const getMeetingIcon = (type: string) => {
    if (type === 'one-on-one') return <PersonAdd style={{ fontSize: '16px' }} />;
    if (type === 'team') return <People style={{ fontSize: '16px' }} />;
    return <Group style={{ fontSize: '16px' }} />;
  };

  const getTypeLabel = (type: string) => {
    if (type === 'one-on-one') return '1:1 Meeting';
    if (type === 'group') return 'Group Session';
    if (type === 'team') return 'Team Meeting';
    return 'Meeting';
  };

  const getStatusBadge = (status: string) => {
    const base = 'px-2 py-1 rounded-full text-xs font-semibold';
    if (status === 'scheduled') return `${base} bg-blue-100 text-blue-800`;
    if (status === 'in-progress') return `${base} bg-green-100 text-green-800 animate-pulse`;
    if (status === 'completed') return `${base} bg-slate-100 text-slate-800`;
    if (status === 'cancelled') return `${base} bg-red-100 text-red-800`;
    return base;
  };

  // ── Calendar ──────────────────────────────────────────────────────────────────

  const getDaysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const getMeetingsForDay = (day: number) => {
    const y = currentMonth.getFullYear();
    const m = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return allMeetings.filter((m2) => m2.date === `${y}-${m}-${dd}` && m2.status === 'scheduled');
  };

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = ['S','M','T','W','T','F','S'];

  // ── MeetingCard (defined inside is fine — it receives stable handler references) ──

  const MeetingCard = ({ meeting }: { meeting: Meeting }) => {
    const confirmedCount = meeting.participants?.filter((p) => p.status === 'confirmed' || p.status === 'attended').length ?? 0;
    const totalCount = meeting.participants?.length ?? 0;
    const meetingToday = isToday(new Date(meeting.date));

    return (
      <div
        style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '20px', transition: 'all 0.3s ease' }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <div style={{ padding: '20px', background: meeting.status === 'scheduled' ? 'linear-gradient(135deg,#eff6ff 0%,#f8fafc 100%)' : meeting.status === 'completed' ? 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)' : meeting.status === 'in-progress' ? 'linear-gradient(135deg,#f0fdf4 0%,#f8fafc 100%)' : 'linear-gradient(135deg,#fef2f2 0%,#f8fafc 100%)' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500', color: '#475569' }}>
              {getMeetingIcon(meeting.type)}{getTypeLabel(meeting.type)}
            </span>
            <span className={getStatusBadge(meeting.status)}>
              {meeting.status === 'scheduled' ? 'Upcoming' : meeting.status === 'in-progress' ? 'Live Now' : meeting.status === 'completed' ? 'Completed' : 'Cancelled'}
            </span>
            {meetingToday && meeting.status === 'scheduled' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: '#fee2e2', color: '#dc2626', borderRadius: '9999px', fontSize: '11px', fontWeight: '600' }}>
                <Today style={{ fontSize: '12px' }} /> Today
              </span>
            )}
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>{meeting.title}</h3>
          {meeting.description && <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>{meeting.description}</p>}
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
              <CalendarToday style={{ fontSize: '14px', color: '#1e3a8a' }} />
              <span style={{ fontSize: '13px', fontWeight: '500' }}>{formatDate(meeting.date)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
              <AccessTime style={{ fontSize: '14px', color: '#1e3a8a' }} />
              <span style={{ fontSize: '13px', fontWeight: '500' }}>{meeting.time} · {meeting.duration} min</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
              <VideoCall style={{ fontSize: '14px', color: '#1e3a8a' }} />
              <span style={{ fontSize: '13px', fontWeight: '500' }}>{meeting.meeting_link ? 'Online Meeting' : 'No link set'}</span>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <People style={{ fontSize: '14px' }} /> Participants ({confirmedCount}/{totalCount})
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {meeting.participants?.slice(0, 6).map((participant) => (
                <div key={participant.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#f8fafc', borderRadius: '9999px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: '#334155' }}>{participant.user?.first_name} {participant.user?.last_name}</span>
                  <span style={{ fontSize: '10px', fontWeight: '500', padding: '2px 6px', borderRadius: '9999px', background: participant.role === 'instructor' ? '#e9d5ff' : '#dbeafe', color: participant.role === 'instructor' ? '#6b21a5' : '#1e40af' }}>{participant.role}</span>
                  {participant.status === 'confirmed' && <CheckCircle style={{ fontSize: '12px', color: '#22c55e' }} />}
                </div>
              ))}
              {(meeting.participants?.length ?? 0) > 6 && (
                <div style={{ padding: '4px 12px', background: '#f8fafc', borderRadius: '9999px', fontSize: '12px', color: '#64748b' }}>
                  +{(meeting.participants?.length ?? 0) - 6} more
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
            {meeting.status === 'scheduled' && (
              <>
                <button onClick={() => handleJoinMeeting(meeting)} style={{ flex: 1, background: 'linear-gradient(135deg,#1e3a8a 0%,#1e40af 100%)', color: 'white', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <VideoCall style={{ fontSize: '14px' }} /> Start Meeting
                </button>
                <button onClick={() => handleCopyLink(meeting.meeting_link)} style={{ padding: '10px 16px', background: '#f1f5f9', color: '#475569', borderRadius: '12px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <ContentCopy style={{ fontSize: '14px' }} />
                </button>
                <button onClick={() => handleCancelMeeting(meeting)} style={{ padding: '10px 16px', background: '#fef2f2', color: '#dc2626', borderRadius: '12px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Cancel style={{ fontSize: '14px' }} />
                </button>
              </>
            )}
            {meeting.status === 'in-progress' && (
              <button onClick={() => handleCompleteMeeting(meeting)} style={{ flex: 1, background: '#22c55e', color: 'white', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <CheckCircle style={{ fontSize: '14px' }} /> Complete Meeting
              </button>
            )}
            {meeting.status === 'completed' && meeting.recording_url && (
              <button onClick={() => window.open(meeting.recording_url, '_blank')} style={{ flex: 1, background: '#f1f5f9', color: '#475569', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <VideoCall style={{ fontSize: '14px' }} /> Watch Recording
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><div>Loading…</div></div>;
  }

  return (
    <div style={{ padding: '32px', background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '700', background: 'linear-gradient(135deg,#0f172a 0%,#334155 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
              Meetings
            </h1>
            <p style={{ color: '#64748b', marginTop: '4px' }}>Schedule and manage your meetings</p>
          </div>
          <button type="button" onClick={() => setShowScheduleModal(true)}
            style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#1e40af 100%)', color: 'white', padding: '12px 24px', borderRadius: '12px', fontWeight: '600', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
          >
            <Add style={{ fontSize: '18px' }} /> Schedule Meeting
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Meetings', value: stats?.meetings.total ?? 0, color: '#1e3a8a', bg: '#dbeafe', Icon: CalendarToday },
          { label: 'Upcoming', value: stats?.meetings.upcoming ?? 0, color: '#d97706', bg: '#fef3c7', Icon: Schedule },
          { label: 'Completed', value: stats?.meetings.completed ?? 0, color: '#22c55e', bg: '#dcfce7', Icon: CheckCircle },
          { label: 'Participants', value: stats?.total_participants ?? 0, color: '#8b5cf6', bg: '#ede9fe', Icon: People },
        ].map(({ label, value, color, bg, Icon }) => (
          <div key={label} style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '13px', color: '#64748b' }}>{label}</p>
                <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a' }}>{value}</p>
              </div>
              <div style={{ width: '40px', height: '40px', background: bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon style={{ fontSize: '20px', color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
            <button type="button" onClick={() => setCurrentMonth(new Date())} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '500', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#475569' }}>Today</button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => setCurrentMonth((p) => subMonths(p, 1))} style={{ padding: '8px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ChevronLeft style={{ fontSize: '18px', color: '#475569' }} /></button>
            <button type="button" onClick={() => setCurrentMonth((p) => addMonths(p, 1))} style={{ padding: '8px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ChevronRight style={{ fontSize: '18px', color: '#475569' }} /></button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid #e2e8f0' }}>
          {DAYS.map((d, i) => <div key={i} style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#64748b' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, i) => (
            <div key={`e-${i}`} style={{ minHeight: '90px', padding: '8px', background: '#fafbfc', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }} />
          ))}
          {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1).map((day) => {
            const todayDate = new Date();
            const isT = day === todayDate.getDate() && currentMonth.getMonth() === todayDate.getMonth() && currentMonth.getFullYear() === todayDate.getFullYear();
            const dayMeetings = getMeetingsForDay(day);
            return (
              <div key={day} style={{ minHeight: '90px', padding: '8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', background: isT ? '#eff6ff' : 'white' }}>
                <div style={{ fontSize: '14px', fontWeight: isT ? '700' : '500', color: isT ? '#1e3a8a' : '#0f172a', marginBottom: '6px' }}>
                  {day}{isT && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#1e3a8a' }}>Today</span>}
                </div>
                {dayMeetings.slice(0, 2).map((m) => (
                  <div key={m.id} style={{ fontSize: '11px', padding: '3px 6px', background: '#dbeafe', color: '#1e3a8a', borderRadius: '6px', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.time} {m.title}
                  </div>
                ))}
                {dayMeetings.length > 2 && <div style={{ fontSize: '10px', color: '#64748b' }}>+{dayMeetings.length - 2} more</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { id: 'upcoming', label: 'Upcoming', Icon: Schedule },
          { id: 'in-progress', label: 'In Progress', Icon: VideoCall },
          { id: 'completed', label: 'Completed', Icon: CheckCircle },
        ].map(({ id, label, Icon }) => (
          <button key={id} type="button" onClick={() => setActiveTab(id)}
            style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: '500', background: activeTab === id ? '#1e3a8a' : 'white', color: activeTab === id ? 'white' : '#64748b', border: activeTab === id ? 'none' : '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Icon style={{ fontSize: '14px' }} /> {label}
          </button>
        ))}
      </div>

      {/* Meeting list */}
      {meetings.length > 0 ? (
        meetings.map((m) => <MeetingCard key={m.id} meeting={m} />)
      ) : (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '48px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <VideoCall style={{ fontSize: '40px', color: '#94a3b8' }} />
          </div>
          <p style={{ color: '#64748b', marginBottom: '16px' }}>No {activeTab} meetings found</p>
          <button type="button" onClick={() => setShowScheduleModal(true)}
            style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#1e40af 100%)', color: 'white', padding: '10px 20px', borderRadius: '12px', fontWeight: '600', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Add style={{ fontSize: '16px' }} /> Schedule Your First Meeting
          </button>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '24px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #e2e8f0', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Schedule a Meeting</h2>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Step {currentStep} of 2</p>
              </div>
              <button type="button" onClick={closeScheduleModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <Close />
              </button>
            </div>

            {/* KEY FIX: pass props instead of defining components inline */}
            {currentStep === 1 ? (
              <ScheduleModalStep1
                newMeeting={newMeeting}
                onChange={handleNewMeetingChange}
                onCancel={closeScheduleModal}
                onNext={() => setCurrentStep(2)}
              />
            ) : (
              <ScheduleModalStep2
                availableUsers={availableUsers}
                usersLoading={usersLoading}
                selectedParticipants={selectedParticipants}
                searchValue={searchParticipants}
                onSearchChange={setSearchParticipants}
                onToggleParticipant={toggleParticipant}
                onBack={() => setCurrentStep(1)}
                onSubmit={handleScheduleMeeting}
              />
            )}
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && selectedMeeting && (
        <JoinMeetingModal
          meeting={selectedMeeting}
          onClose={() => setShowJoinModal(false)}
          onStart={handleStartMeeting}
        />
      )}
    </div>
  );
};

export default InstructorMeetings;