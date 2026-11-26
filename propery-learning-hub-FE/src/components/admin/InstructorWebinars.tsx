'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import webinarService, {
  Webinar,
  WebinarRegistration,
  DashboardStats,
  WebinarAnalytics,
  CreateWebinarPayload,
  UpdateWebinarPayload,
  WebinarStatus,
  WebinarCategory,
  WebinarLevel,
  ParticipantType,
  PastRecording,
  WebinarRecordingAccess,
} from '../../services/webinarService';
import { resolveStorageUrl } from '../../utils/mediaUrl';
import WebinarRecordingPlayer from '../webinars/WebinarRecordingPlayer';

// ─────────────────────────────────────────────
// Small UI helpers
// ─────────────────────────────────────────────

const DURATION_OPTIONS = [30, 45, 60, 90, 120] as const;
const CATEGORY_LABELS: Record<WebinarCategory, string> = {
  market: 'Market Trends',
  investment: 'Investment Strategies',
  tax: 'Tax Planning',
  legal: 'Legal Structures',
  beginner: 'Beginner Guides',
};
const LEVEL_LABELS: Record<WebinarLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const PARTICIPANT_LABELS: Record<ParticipantType, string> = {
  my_learners: 'My Learners Only',
  all_learners: 'All Platform Learners',
  all_others: 'All Others (Public)',
};

function statusBadge(status: WebinarStatus) {
  const base = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold';
  switch (status) {
    case 'upcoming':  return `${base} bg-amber-100 text-amber-700`;
    case 'live':      return `${base} bg-emerald-100 text-emerald-700 animate-pulse`;
    case 'completed': return `${base} bg-slate-100 text-slate-600`;
    case 'cancelled': return `${base} bg-red-100 text-red-600`;
  }
}

function webinarCanBeCompleted(webinar: Webinar): boolean {
  if (webinar.status === 'live') return true;
  if (webinar.status !== 'upcoming') return false;
  const start = new Date(`${webinar.date}T${webinar.time}`);
  return !Number.isNaN(start.getTime()) && start.getTime() <= Date.now();
}

function categoryColor(cat: WebinarCategory) {
  switch (cat) {
    case 'market':     return 'bg-blue-100 text-blue-700';
    case 'investment': return 'bg-emerald-100 text-emerald-700';
    case 'tax':        return 'bg-amber-100 text-amber-700';
    case 'legal':      return 'bg-violet-100 text-violet-700';
    case 'beginner':   return 'bg-slate-100 text-slate-600';
  }
}

function levelColor(level: WebinarLevel) {
  switch (level) {
    case 'beginner':     return 'bg-sky-50 text-sky-700';
    case 'intermediate': return 'bg-teal-50 text-teal-700';
    case 'advanced':     return 'bg-rose-50 text-rose-700';
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

function parseApiValidationError(e: unknown): { message: string; errors: Record<string, string> } {
  const err = e as Error & { errors?: Record<string, string[]> };
  const errors: Record<string, string> = {};

  if (err.errors) {
    Object.entries(err.errors).forEach(([key, value]) => {
      errors[key] = Array.isArray(value) ? value[0] : String(value);
    });
  }

  const firstFieldError = Object.values(errors)[0];
  return {
    message: firstFieldError || (e instanceof Error ? e.message : 'Request failed'),
    errors,
  };
}

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

// ─────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';
interface ToastMsg { id: number; type: ToastType; text: string; }

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const counter = useRef(0);

  const push = useCallback((text: string, type: ToastType = 'info') => {
    const id = ++counter.current;
    setToasts(p => [...p, { id, type, text }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  return { toasts, push };
}

function ToastStack({ toasts }: { toasts: ToastMsg[] }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all
          ${t.type === 'success' ? 'bg-emerald-600' : t.type === 'error' ? 'bg-red-600' : 'bg-slate-700'}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// Progress bar
// ─────────────────────────────────────────────

function ProgressBar({ value, color = 'bg-blue-500' }: { value: number; color?: string }) {
  return (
    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// Modal shell
// ─────────────────────────────────────────────

function Modal({ title, subtitle, onClose, footer, children, size = 'lg' }: {
  title: string; subtitle?: string; onClose: () => void; footer?: React.ReactNode;
  children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl ${widths[size]} w-full max-h-[90vh] flex flex-col shadow-2xl`}>
        <div className="flex items-start justify-between p-6 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition ml-4 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
        {footer && <div className="border-t border-slate-100 p-4 flex justify-end gap-3 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Input components
// ─────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// Webinar Form (shared by Create & Edit)
// ─────────────────────────────────────────────

type FormState = {
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  category: WebinarCategory;
  level: WebinarLevel;
  price: number;
  max_attendees: number;
  participant_type: ParticipantType;
  live_link: string;
  learning_objectives: string[];
  tags: string[];
  thumbnail: File | null;
  participate_email: string;
};

const defaultForm: FormState = {
  title: '', description: '', date: '', time: '',
  duration: 60, category: 'market', level: 'intermediate',
  price: 0, max_attendees: 100,
  participant_type: 'all_learners',
  live_link: '', learning_objectives: [''], tags: [''], thumbnail: null,
  participate_email: '',
};

function webinarToForm(w: Webinar): FormState {
  return {
    title: w.title,
    description: w.description,
    date: w.date,
    time: w.time,
    duration: w.duration,
    category: w.category,
    level: w.level,
    price: parseFloat(w.price),
    max_attendees: w.max_attendees,
    participant_type: w.participant_type || 'my_learners',
    live_link: w.live_link ?? '',
    learning_objectives: w.learning_objectives?.map(o => o.objective) ?? [''],
    tags: w.tags?.map(t => t.tag) ?? [''],
    thumbnail: null,
    participate_email: '',
  };
}

function formToPayload(form: FormState): CreateWebinarPayload {
  return {
    title: form.title,
    description: form.description,
    date: form.date,
    time: form.time,
    duration: form.duration as CreateWebinarPayload['duration'],
    category: form.category,
    level: form.level,
    price: form.price,
    max_attendees: form.max_attendees,
    participant_type: form.participant_type,
    live_link: form.live_link || undefined,
    learning_objectives: form.learning_objectives.filter(o => o.trim()),
    tags: form.tags.filter(t => t.trim()),
    thumbnail: form.thumbnail ?? undefined,
    participate_email: form.participate_email || undefined,
  };
}

function WebinarForm({ form, onChange, errors }: {
  form: FormState;
  onChange: (f: FormState) => void;
  errors: Record<string, string>;
}) {
  const set = (k: keyof FormState, v: unknown) => onChange({ ...form, [k]: v });

  const updateArr = (key: 'learning_objectives' | 'tags', idx: number, val: string) => {
    const arr = [...form[key]];
    arr[idx] = val;
    set(key, arr);
  };
  const addArr = (key: 'learning_objectives' | 'tags') => set(key, [...form[key], '']);
  const removeArr = (key: 'learning_objectives' | 'tags', idx: number) =>
    set(key, form[key].filter((_, i) => i !== idx));

  return (
    <div className="space-y-5">
      <Field label="Webinar Title *" error={errors.title}>
        <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g., Advanced Investment Strategies" />
      </Field>

      <Field label="Description *" error={errors.description}>
        <textarea className={inputCls} rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What will attendees learn?" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Date *" error={errors.date}>
          <input type="date" className={inputCls} value={form.date} min={todayIsoDate()} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="Time *" error={errors.time}>
          <input type="time" className={inputCls} value={form.time} onChange={e => set('time', e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Duration">
          <select className={inputCls} value={form.duration} onChange={e => set('duration', Number(e.target.value))}>
            {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d} min</option>)}
          </select>
        </Field>
        <Field label="Category">
          <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value as WebinarCategory)}>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Level">
          <select className={inputCls} value={form.level} onChange={e => set('level', e.target.value as WebinarLevel)}>
            {Object.entries(LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Max Attendees" error={errors.max_attendees}>
          <input type="number" className={inputCls} value={form.max_attendees} onChange={e => set('max_attendees', Number(e.target.value))} min={1} max={1000} />
        </Field>
        <Field label="Price (USD)" error={errors.price}>
          <input
            type="number"
            className={inputCls}
            value={form.price}
            onChange={e => set('price', Number(e.target.value))}
            min={0}
            step={0.01}
            placeholder="0 for free webinars"
          />
        </Field>
      </div>

      <Field label="Who can participate?" error={errors.participant_type}>
        <select className={inputCls} value={form.participant_type} onChange={e => set('participant_type', e.target.value as ParticipantType)}>
          {Object.entries(PARTICIPANT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <p className="text-xs text-slate-400 mt-1">Select which audience can register for this webinar</p>
      </Field>

      <Field label="Participant Email" error={errors.participate_email}>
        <input
          type="email"
          className={inputCls}
          value={form.participate_email}
          onChange={e => set('participate_email', e.target.value)}
          placeholder="e.g., participant@email.com"
        />
        <p className="text-xs text-slate-400 mt-1">
          Optional. A confirmation email with the Zoom webinar participation details will be sent to this email address on creation.
        </p>
      </Field>

      <Field label="Thumbnail">
        <input type="file" accept="image/jpeg,image/png,image/webp" className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          onChange={e => set('thumbnail', e.target.files?.[0] ?? null)} />
      </Field>

      <div>
        <label className={labelCls}>Learning Objectives</label>
        {form.learning_objectives.map((obj, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <input className={`${inputCls} flex-1`} value={obj} onChange={e => updateArr('learning_objectives', idx, e.target.value)} placeholder={`Objective ${idx + 1}`} />
            {form.learning_objectives.length > 1 && (
              <button type="button" onClick={() => removeArr('learning_objectives', idx)} className="px-2.5 py-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 text-sm">✕</button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => addArr('learning_objectives')} className="text-sm text-blue-900 font-medium hover:underline flex items-center gap-1">+ Add objective</button>
      </div>

      <div>
        <label className={labelCls}>Tags</label>
        {form.tags.map((tag, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <input className={`${inputCls} flex-1`} value={tag} onChange={e => updateArr('tags', idx, e.target.value)} placeholder={`Tag ${idx + 1}`} />
            {form.tags.length > 1 && (
              <button type="button" onClick={() => removeArr('tags', idx)} className="px-2.5 py-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 text-sm">✕</button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => addArr('tags')} className="text-sm text-blue-900 font-medium hover:underline flex items-center gap-1">+ Add tag</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Past Recording Card Component
// ─────────────────────────────────────────────

function PastRecordingCard({ recording, onDelete, onEdit, onWatch }: {
  recording: PastRecording;
  onDelete: () => void;
  onEdit: () => void;
  onWatch: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {recording.thumbnail_url && (
          <img src={resolveStorageUrl(recording.thumbnail_url) ?? recording.thumbnail_url} alt="" className="w-24 h-24 rounded-lg object-cover shrink-0 border border-slate-100" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-800">{recording.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{recording.description}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-blue-600 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-600 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-3">
            <span>📅 {new Date(recording.recorded_at).toLocaleDateString()}</span>
            <span>⏱️ {recording.duration} min</span>
            <span>👁️ {recording.views} views</span>
            <button type="button" onClick={onWatch} className="text-blue-600 hover:underline">▶ Watch Recording</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Upload recording to a completed webinar
// ─────────────────────────────────────────────

function UploadWebinarRecordingModal({ webinar, onClose, onSuccess, toast }: {
  webinar: Webinar;
  onClose: () => void;
  onSuccess: () => void;
  toast: (msg: string, t?: 'success' | 'error' | 'info') => void;
}) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const isReplace = Boolean(webinar.recording_path);

  const handleSubmit = async () => {
    if (!videoFile) {
      toast('Please select a video file', 'error');
      return;
    }

    setUploading(true);
    try {
      const res = await webinarService.uploadRecording(webinar.id, videoFile, setProgress);
      if (res.success) {
        toast(isReplace ? 'Recording replaced successfully.' : 'Recording uploaded. Learners can request access once you approve them.', 'success');
        onSuccess();
        onClose();
      } else {
        toast(res.message || 'Upload failed', 'error');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload error';
      toast(message, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      title={`${isReplace ? 'Replace' : 'Upload'} Recording — ${webinar.title}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">Cancel</button>
          <button onClick={handleSubmit} disabled={uploading}
            className="px-5 py-2 bg-blue-900 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
            {uploading ? `Uploading ${progress}%...` : isReplace ? 'Replace Recording' : 'Upload Recording'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          {isReplace
            ? 'Upload a new video to replace the current recording for this completed webinar.'
            : 'Upload the recording for this completed webinar. Learners will see it on the webinar page and must request access before watching.'}
        </p>
        <Field label="Video File * (MP4, MOV, WebM — max 2GB)">
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            className="w-full"
          />
        </Field>
        {uploading && (
          <div>
            <div className="flex justify-between text-sm mb-1"><span>Uploading...</span><span>{progress}%</span></div>
            <ProgressBar value={progress} />
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Upload Past Recording Modal
// ─────────────────────────────────────────────

function UploadPastRecordingModal({ onClose, onSuccess, toast }: {
  onClose: () => void;
  onSuccess: () => void;
  toast: (msg: string, t?: 'success' | 'error' | 'info') => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recordedAt, setRecordedAt] = useState('');
  const [duration, setDuration] = useState(60);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
const handleSubmit = async () => {
  if (!title || !videoFile) {
    toast('Please provide title and video file', 'error');
    return;
  }

  if (!duration) {
    toast('Please provide duration', 'error');
    return;
  }

  if (!recordedAt) {
    toast('Please provide recorded date', 'error');
    return;
  }

  setUploading(true);

  try {
    const res = await webinarService.uploadPastRecording(
      {
        title,
        description: description || '',
        recorded_at: recordedAt,
        duration: Number(duration),
        video: videoFile,
        thumbnail: thumbnail || undefined,
      },
      setProgress
    );

    if (res.success) {
      toast('Recording uploaded successfully!', 'success');
      onSuccess();
      onClose();
    } else {
      toast(res.message || 'Upload failed', 'error');
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    toast(error?.message || 'Upload error', 'error');
  } finally {
    setUploading(false);
  }
};

  return (
    <Modal title="Upload Past Webinar Recording" onClose={onClose} size="lg"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">Cancel</button>
          <button onClick={handleSubmit} disabled={uploading}
            className="px-5 py-2 bg-blue-900 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
            {uploading ? `Uploading ${progress}%...` : 'Upload Recording'}
          </button>
        </>
      }>
      <div className="space-y-4">
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Past recordings are for your internal library only. To let learners watch a recording, upload it on the completed webinar instead.
        </p>
        <Field label="Recording Title *">
          <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Advanced Investment Strategies - March 2024" />
        </Field>
        <Field label="Description">
          <textarea className={inputCls} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What was covered in this webinar?" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Recorded Date">
            <input type="date" className={inputCls} value={recordedAt} onChange={e => setRecordedAt(e.target.value)} />
          </Field>
          <Field label="Duration (minutes)">
            <input type="number" className={inputCls} value={duration} onChange={e => setDuration(Number(e.target.value))} min={1} />
          </Field>
        </div>
        <Field label="Video File * (MP4, MOV, WebM - max 2GB)">
          <input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={e => setVideoFile(e.target.files?.[0] ?? null)} className="w-full" />
        </Field>
        <Field label="Thumbnail (optional)">
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setThumbnail(e.target.files?.[0] ?? null)} className="w-full" />
        </Field>
        {uploading && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1"><span>Uploading...</span><span>{progress}%</span></div>
            <ProgressBar value={progress} />
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Webinar Card
// ─────────────────────────────────────────────

function WebinarCard({ webinar, onManage, onAnalytics, onEdit, onCancel, onStart, onComplete, onDelete, onCopyLink, onSendReminders, onExport, onUploadRecording, onWatchRecording }: {
  webinar: Webinar;
  onManage: () => void; onAnalytics: () => void; onEdit: () => void;
  onCancel: () => void; onStart: () => void; onComplete: () => void;
  onDelete: () => void; onCopyLink: () => void; onSendReminders: () => void;
  onExport: () => void;
  onUploadRecording: () => void;
  onWatchRecording: () => void;
}) {
  const regCount = webinar.registrations_count ?? webinar.registrations?.length ?? 0;
  const capacityPct = pct(regCount, webinar.max_attendees);
  const hasZoom = Boolean(webinar.zoom_webinar_id);

  const handleOpenZoomHost = () => {
    if (webinar.zoom_start_url) {
      window.open(webinar.zoom_start_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {webinar.thumbnail_url && (
          <img src={resolveStorageUrl(webinar.thumbnail_url) ?? webinar.thumbnail_url} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0 border border-slate-100" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-slate-800 truncate max-w-lg">{webinar.title}</h3>
            <span className={statusBadge(webinar.status)}>{webinar.status.toUpperCase()}</span>
            {webinar.participant_type && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                {PARTICIPANT_LABELS[webinar.participant_type as ParticipantType]}
              </span>
            )}
            {/* Zoom badge */}
            {hasZoom && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-3 3v-3H6a2 2 0 0 1-2-2V6z"/></svg>
                Zoom Webinar
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-2">
            <span>📅 {webinar.date}</span>
            <span>🕐 {webinar.time} · {webinar.duration} min</span>
            <span className={`px-2 py-0.5 rounded-full font-medium ${categoryColor(webinar.category)}`}>{CATEGORY_LABELS[webinar.category]}</span>
            <span className={`px-2 py-0.5 rounded-lg font-medium ${levelColor(webinar.level)}`}>{LEVEL_LABELS[webinar.level]}</span>
          </div>
          <p className="text-sm text-slate-500 line-clamp-2 mb-3">{webinar.description}</p>
          <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
            <span>👥 {regCount} / {webinar.max_attendees} registered</span>
            <div className="flex-1 max-w-[120px]">
              <ProgressBar value={capacityPct} color={capacityPct >= 90 ? 'bg-red-400' : 'bg-blue-400'} />
            </div>
            <span>{capacityPct}%</span>
          </div>
          {/* Zoom join link row */}
          {hasZoom && webinar.zoom_join_url && (
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2 flex-wrap">
              <span className="font-medium text-blue-700">Join URL:</span>
              <a
                href={webinar.zoom_join_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline truncate max-w-xs"
              >
                {webinar.zoom_join_url}
              </a>
              {webinar.zoom_password && (
                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">
                  🔑 {webinar.zoom_password}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 mt-1">
        {webinar.status === 'upcoming' && <>
          {/* Zoom host start button — opens zoom start_url which launches Zoom app as host */}
          {hasZoom && webinar.zoom_start_url ? (
            <button
              onClick={handleOpenZoomHost}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-3 3v-3H6a2 2 0 0 1-2-2V6z"/></svg>
              Start on Zoom (Host)
            </button>
          ) : (
            <Btn color="green" icon="▶" onClick={onStart}>Start</Btn>
          )}
          {webinarCanBeCompleted(webinar) && (
            <Btn color="blue" icon="⏹" onClick={onComplete}>Mark Completed</Btn>
          )}
          <Btn color="slate" icon="✉" onClick={onSendReminders}>Reminders</Btn>
          <Btn color="slate" icon="🔗" onClick={onCopyLink}>Copy Link</Btn>
          <Btn color="slate" icon="✏️" onClick={onEdit}>Edit</Btn>
          <Btn color="red" icon="✕" onClick={onCancel}>Cancel</Btn>
        </>
        }
        {webinar.status === 'live' && <>
          {hasZoom && webinar.zoom_start_url ? (
            <button
              onClick={handleOpenZoomHost}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-3 3v-3H6a2 2 0 0 1-2-2V6z"/></svg>
              Open in Zoom (Live)
            </button>
          ) : null}
          <Btn color="blue" icon="⏹" onClick={onComplete}>Complete</Btn>
          <Btn color="slate" icon="📊" onClick={onAnalytics}>Analytics</Btn>
        </>}
        {webinar.status === 'completed' && <>
          {webinar.recording_path ? (
            <>
              <Btn color="blue" icon="🎬" onClick={onWatchRecording}>Watch Recording</Btn>
              <Btn color="slate" icon="⬆" onClick={onUploadRecording}>Replace Recording</Btn>
            </>
          ) : (
            <Btn color="blue" icon="⬆" onClick={onUploadRecording}>Upload Recording</Btn>
          )}
          <Btn color="slate" icon="📊" onClick={onAnalytics}>Analytics</Btn>
          <Btn color="slate" icon="⬇" onClick={onExport}>Export CSV</Btn>
        </>}
        <Btn color="slate" icon="👥" onClick={onManage}>Manage ({regCount})</Btn>
        {(webinar.status === 'upcoming' || webinar.status === 'cancelled') && (
          <Btn color="ghost-red" icon="🗑" onClick={onDelete}>Delete</Btn>
        )}
      </div>
    </div>
  );
}


function Btn({ color, icon, onClick, children, disabled }: {
  color: 'green' | 'blue' | 'slate' | 'red' | 'ghost-red'; icon: string;
  onClick: () => void; children: React.ReactNode; disabled?: boolean;
}) {
  const cls: Record<string, string> = {
    green: 'bg-emerald-500 text-white hover:bg-emerald-600',
    blue: 'bg-blue-900 text-white hover:bg-blue-800',
    slate: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    red: 'bg-red-500 text-white hover:bg-red-600',
    'ghost-red': 'bg-transparent text-red-500 hover:bg-red-50 border border-red-200',
  };
  return (
    <button disabled={disabled} onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${cls[color]}`}>
      <span className="text-xs">{icon}</span>{children}
    </button>
  );
}

// ─────────────────────────────────────────────
// Recording access requests (instructor approval)
// ─────────────────────────────────────────────

function RecordingAccessPanel({ webinar, toast }: {
  webinar: Webinar;
  toast: (msg: string, t?: 'success' | 'error' | 'info') => void;
}) {
  const [requests, setRequests] = useState<WebinarRecordingAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await webinarService.getRecordingAccessRequests(webinar.id, { per_page: 100 });
      if (res.success && res.data) setRequests(res.data.data);
    } finally {
      setLoading(false);
    }
  }, [webinar.id]);

  useEffect(() => { load(); }, [load]);

  const approve = async (accessId: number) => {
    setActionLoading(accessId);
    try {
      const res = await webinarService.approveRecordingAccess(webinar.id, accessId);
      if (res.success) {
        toast('Recording access approved', 'success');
        load();
      } else {
        toast(res.message ?? 'Failed to approve', 'error');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const reject = async (accessId: number) => {
    setActionLoading(accessId);
    try {
      const res = await webinarService.rejectRecordingAccess(webinar.id, accessId, { reason: 'Request declined' });
      if (res.success) {
        toast('Recording access rejected', 'success');
        load();
      } else {
        toast(res.message ?? 'Failed to reject', 'error');
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (!webinar.recording_path) {
    return (
      <div className="mt-6 border-t border-slate-200 pt-5">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Recording Access</h4>
        <p className="text-sm text-slate-500">Upload a recording for this webinar before learners can request access.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-slate-200 pt-5">
      <h4 className="text-sm font-semibold text-slate-700 mb-3">Recording Access Requests</h4>
      {loading ? (
        <p className="text-sm text-slate-400">Loading requests...</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-slate-500">No recording access requests yet.</p>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-600">Learner</th>
                <th className="p-3 text-left font-semibold text-slate-600">Status</th>
                <th className="p-3 text-left font-semibold text-slate-600">Message</th>
                <th className="p-3 text-left font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-t border-slate-100">
                  <td className="p-3">
                    <div className="font-medium text-slate-800">
                      {req.learner?.first_name} {req.learner?.last_name}
                    </div>
                    <div className="text-xs text-slate-500">{req.learner?.email}</div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      req.status === 'rejected' ? 'bg-red-100 text-red-600' :
                      req.status === 'revoked' ? 'bg-slate-100 text-slate-600' :
                      'bg-amber-100 text-amber-700'
                    }`}>{req.status}</span>
                  </td>
                  <td className="p-3 text-slate-500 max-w-xs truncate">{req.request_message || '—'}</td>
                  <td className="p-3">
                    {req.status === 'pending' && (
                      <div className="flex gap-1">
                        <button
                          disabled={actionLoading === req.id}
                          onClick={() => approve(req.id)}
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-medium hover:bg-emerald-100 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          disabled={actionLoading === req.id}
                          onClick={() => reject(req.id)}
                          className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-medium hover:bg-red-100 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Registrations modal
// ─────────────────────────────────────────────

function canAdminApproveRegistration(status: string, webinarStatus: WebinarStatus): boolean {
  if (webinarStatus === 'cancelled') return false;
  if (status === 'cancelled' || status === 'rejected' || status === 'approved') return false;
  return status === 'registered' || status === 'waitlisted';
}

function canAdminRejectRegistration(status: string, webinarStatus: WebinarStatus): boolean {
  return canAdminApproveRegistration(status, webinarStatus);
}

function RegistrationsModal({ webinar, onClose, toast }: {
  webinar: Webinar; onClose: () => void; toast: (msg: string, t?: 'success' | 'error' | 'info') => void;
}) {
  const [regs, setRegs] = useState<WebinarRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<WebinarRegistration | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await webinarService.getRegistrations(webinar.id, { per_page: 100 });
      if (res.success && res.data) setRegs(res.data.data);
    } finally { setLoading(false); }
  }, [webinar.id]);

  useEffect(() => { load(); }, [load]);

  const approve = async (regId: number) => {
    setActionLoading(regId);
    try {
      const res = await webinarService.approveRegistration(webinar.id, regId);
      if (res.success) { toast('Registration approved', 'success'); load(); }
      else toast(res.message ?? 'Failed to approve registration', 'error');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to approve registration', 'error');
    } finally { setActionLoading(null); }
  };

  const reject = async (regId: number, reason?: string) => {
    setActionLoading(regId);
    try {
      const res = await webinarService.rejectRegistration(webinar.id, regId, { reason: reason?.trim() || undefined });
      if (res.success) {
        const refund = (res as { refund?: { refunded?: boolean; formatted_amount?: string } }).refund;
        if (refund?.refunded && refund.formatted_amount) {
          toast(`Registration rejected. Refund of ${refund.formatted_amount} initiated.`, 'success');
        } else {
          toast(res.message ?? 'Registration rejected', 'success');
        }
        setRejectTarget(null);
        setRejectReason('');
        load();
      }
      else toast(res.message ?? 'Failed to reject registration', 'error');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to reject registration', 'error');
    } finally { setActionLoading(null); }
  };

  const confirmReject = () => {
    if (!rejectTarget) return;
    void reject(rejectTarget.id, rejectReason);
  };

  const isPaidRegistration = (reg: WebinarRegistration) =>
    reg.payment_status === 'paid' && Number.parseFloat(String(reg.amount_paid ?? '0')) > 0;

  const bulkApprove = async () => {
    if (!selected.length) return;
    try {
      const res = await webinarService.bulkApproveRegistrations(webinar.id, { registration_ids: selected });
      if (res.success) { toast('Bulk approved', 'success'); setSelected([]); load(); }
      else toast(res.message ?? 'Failed to bulk approve', 'error');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to bulk approve', 'error');
    }
  };

  const toggleAttendance = async (reg: WebinarRegistration) => {
    if (reg.status !== 'approved') {
      toast('Only approved registrations can be marked as attended', 'error');
      return;
    }

    setActionLoading(reg.id);
    try {
      const res = await webinarService.markAttendance(webinar.id, reg.id, {
        attended: !reg.attended,
      });
      if (res.success) {
        toast(reg.attended ? 'Marked as no-show' : 'Marked as attended', 'success');
        load();
      } else {
        toast(res.message ?? 'Failed to update attendance', 'error');
      }
    } catch {
      toast('Failed to update attendance', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await webinarService.exportRegistrants(webinar.id);
      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${webinar.title}_registrants.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast('Export failed', 'error'); }
  };

  const activeRegs = regs.filter((r) => !['cancelled', 'rejected'].includes(r.status));
  const attended = activeRegs.filter((r) =>
    r.status === 'approved' && (r.attended || Boolean(r.joined_at))
  ).length;

  return (
    <Modal title={`Registrations — ${webinar.title}`} subtitle="Manage and track attendees" onClose={onClose} size="xl"
      footer={
        <>
          <button onClick={handleExport} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">⬇ Export CSV</button>
          {selected.length > 0 && (
            <button onClick={bulkApprove} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">✔ Approve Selected ({selected.length})</button>
          )}
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">Close</button>
        </>
      }>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Registered" value={activeRegs.length} sub={`Max ${webinar.max_attendees}`} color="bg-blue-50 text-blue-900" />
        <StatCard label="Attended" value={attended} sub={`${pct(attended, activeRegs.length)}% rate`} color="bg-emerald-50 text-emerald-900" />
        <StatCard label="No-Show" value={activeRegs.length - attended} sub={`${pct(activeRegs.length - attended, activeRegs.length)}% rate`} color="bg-amber-50 text-amber-900" />
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">Loading…</div>
      ) : regs.length === 0 ? (
        <div className="text-center py-10 text-slate-400">No registrations yet</div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-3 text-left"><input type="checkbox" onChange={e => setSelected(e.target.checked ? regs.filter(r => canAdminApproveRegistration(r.status, webinar.status)).map(r => r.id) : [])} /></th>
                <th className="p-3 text-left font-semibold text-slate-600">Name</th>
                <th className="p-3 text-left font-semibold text-slate-600">Email</th>
                <th className="p-3 text-left font-semibold text-slate-600">Status</th>
                <th className="p-3 text-left font-semibold text-slate-600">Payment</th>
                <th className="p-3 text-left font-semibold text-slate-600">Attended</th>
                <th className="p-3 text-left font-semibold text-slate-600">Watch Time</th>
                <th className="p-3 text-left font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {regs.map(reg => (
                <tr key={reg.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-3">
                    {canAdminApproveRegistration(reg.status, webinar.status) && (
                      <input type="checkbox" checked={selected.includes(reg.id)} onChange={e => setSelected(e.target.checked ? [...selected, reg.id] : selected.filter(id => id !== reg.id))} />
                    )}
                  </td>
                  <td className="p-3">{reg.learner?.first_name} {reg.learner?.last_name}</td>
                  <td className="p-3 text-slate-500">{reg.learner?.email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      reg.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      reg.status === 'rejected' ? 'bg-red-100 text-red-600' :
                      reg.status === 'cancelled' ? 'bg-slate-100 text-slate-600' :
                      reg.status === 'registered' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'}`}>{reg.status}</span>
                  </td>
                  <td className="p-3 text-xs text-slate-600">
                    {isPaidRegistration(reg) ? (
                      <span className="font-medium text-amber-800">Paid £{Number(reg.amount_paid).toFixed(2)}</span>
                    ) : reg.payment_status === 'refunded' ? (
                      <span className="font-medium text-green-700">Refunded</span>
                    ) : (
                      <span className="text-slate-400">Free</span>
                    )}
                  </td>
                  <td className="p-3">
                    {reg.status === 'approved' ? (
                      <button
                        type="button"
                        disabled={actionLoading === reg.id}
                        onClick={() => toggleAttendance(reg)}
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${
                          reg.attended
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {reg.attended ? 'Yes' : 'No'}
                      </button>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-400">
                        —
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-500">{reg.watch_time ? `${reg.watch_time} min` : '—'}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {canAdminApproveRegistration(reg.status, webinar.status) && (
                        <button type="button" disabled={actionLoading === reg.id} onClick={() => approve(reg.id)}
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-medium hover:bg-emerald-100 disabled:opacity-50">✔</button>
                      )}
                      {canAdminRejectRegistration(reg.status, webinar.status) && (
                        <button type="button" disabled={actionLoading === reg.id} onClick={() => { setRejectTarget(reg); setRejectReason(''); }}
                          className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-medium hover:bg-red-100 disabled:opacity-50">✕</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rejectTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Reject registration?</h3>
            <p className="text-sm text-slate-600 mb-4">
              {isPaidRegistration(rejectTarget)
                ? `This learner paid £${Number(rejectTarget.amount_paid).toFixed(2)}. Rejecting will decline their registration and initiate a refund to their original payment method.`
                : 'This will decline the learner registration for this webinar.'}
            </p>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason (optional)</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4"
              placeholder="Optional reason shown to the learner"
            />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
                Cancel
              </button>
              <button type="button" disabled={actionLoading === rejectTarget.id} onClick={confirmReject}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {actionLoading === rejectTarget.id ? 'Rejecting...' : isPaidRegistration(rejectTarget) ? 'Reject & Refund' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
      <RecordingAccessPanel webinar={webinar} toast={toast} />
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Analytics modal
// ─────────────────────────────────────────────

function AnalyticsModal({ webinar, onClose }: { webinar: Webinar; onClose: () => void; }) {
  const [data, setData] = useState<WebinarAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    setData(null);
    (async () => {
      try {
        const res = await webinarService.getWebinarAnalytics(webinar.id);
        if (res.success && res.data) setData(res.data);
        else setError(res.message ?? 'Failed to load analytics');
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error');
      } finally { setLoading(false); }
    })();
  }, [webinar.id, webinar.status]);

  return (
    <Modal title="Webinar Analytics" subtitle={webinar.title} onClose={onClose} size="xl"
      footer={<button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">Close</button>}>
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading analytics…</div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">{error}</div>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Registered" value={data.total_registered} color="bg-blue-50 text-blue-900" />
            <StatCard label="Total Attended" value={data.total_attended} color="bg-emerald-50 text-emerald-900" />
            <StatCard label="Avg Watch Time" value={`${data.avg_watch_time} min`} sub={`of ${webinar.duration} min`} color="bg-amber-50 text-amber-900" />
            <StatCard label="Peak Attendees" value={data.peak_attendees ?? '—'} color="bg-violet-50 text-violet-900" />
          </div>

          <div className="bg-slate-50 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-slate-700 mb-3">Performance Metrics</h3>
            {[
              { label: 'Attendance Rate', value: data.attendance_rate, color: 'bg-emerald-500' },
              { label: 'Content Retention', value: data.content_retention, color: 'bg-blue-500' },
              { label: 'Engagement Rate', value: parseFloat(data.engagement_rate ?? '0'), color: 'bg-amber-500' },
              { label: 'Satisfaction Score', value: parseFloat(data.satisfaction_score ?? '0'), color: 'bg-violet-500' },
            ].map(m => (
              <div key={m.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{m.label}</span>
                  <span className="font-medium text-slate-800">{m.value.toFixed(1)}%</span>
                </div>
                <ProgressBar value={m.value} color={m.color} />
              </div>
            ))}
          </div>

          <div className="bg-slate-50 rounded-xl p-5">
            <h3 className="font-semibold text-slate-700 mb-3">Recording Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Requests" value={data.recording.total_requests} color="bg-white border border-slate-200 text-slate-800" />
              <StatCard label="Approved" value={data.recording.approved_requests} color="bg-white border border-slate-200 text-slate-800" />
              <StatCard label="Pending" value={data.recording.pending_requests} color="bg-white border border-slate-200 text-slate-800" />
              <StatCard label="Total Downloads" value={data.recording.total_downloads} color="bg-white border border-slate-200 text-slate-800" />
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Confirm dialog
// ─────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel, confirmColor = 'red', onConfirm, onClose }: {
  title: string; message: string; confirmLabel: string; confirmColor?: 'red' | 'blue';
  onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose} size="sm"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">Keep It</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-white rounded-lg text-sm font-medium ${confirmColor === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-900 hover:bg-blue-800'}`}>{confirmLabel}</button>
        </>
      }>
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

type ModalType = 'create' | 'edit' | 'manage' | 'analytics' | 'cancel' | 'delete' | 'uploadPastRecording' | 'uploadWebinarRecording' | null;
type MainTab = 'webinars' | 'pastRecordings';

export default function InstructorWebinars() {
  const { toasts, push: toast } = useToast();

  // Data
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [pastRecordings, setPastRecordings] = useState<PastRecording[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>('webinars');

  // Filters
  const [activeTab, setActiveTab] = useState<WebinarStatus | 'all'>('upcoming');
  const [search, setSearch] = useState('');

  // Modal state
  const [modal, setModal] = useState<ModalType>(null);
  const [selected, setSelected] = useState<Webinar | PastRecording | null>(null);

  // Form state
  const [form, setForm] = useState<FormState>(defaultForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formLoading, setFormLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [player, setPlayer] = useState<{ title: string; streamUrl: string } | null>(null);

  const watchWebinarRecording = async (webinar: Webinar) => {
    try {
      const res = await webinarService.streamRecording(webinar.id);
      const streamUrl = res.data?.stream_url ?? (res as { stream_url?: string }).stream_url;
      if (res.success && streamUrl) {
        setPlayer({ title: webinar.title, streamUrl });
      } else {
        toast(res.message ?? 'Failed to load recording', 'error');
      }
    } catch {
      toast('Failed to load recording', 'error');
    }
  };

  const watchPastRecording = (recording: PastRecording) => {
    const streamUrl = recording.video_url;
    if (!streamUrl) {
      toast('Recording URL not available', 'error');
      return;
    }
    setPlayer({ title: recording.title, streamUrl });
  };

  // ── Load data ────────────────────────────────────────────────────────────

  const loadWebinars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await webinarService.getWebinars({
        status: activeTab === 'all' ? 'all' : activeTab,
        search: search || undefined,
        per_page: 10,
        page,
      });
      if (res.success && res.data) {
        setWebinars(res.data.data);
        setLastPage(res.data.last_page);
        setTotal(res.data.total);
      }
    } catch { toast('Failed to load webinars', 'error'); }
    finally { setLoading(false); }
  }, [activeTab, search, page, toast]);

  const loadPastRecordings = useCallback(async () => {
    try {
      const res = await webinarService.getPastRecordings();
      if (res.success && res.data) {
        setPastRecordings(res.data);
      }
    } catch { toast('Failed to load past recordings', 'error'); }
  }, [toast]);

  const loadStats = useCallback(async () => {
    try {
      const res = await webinarService.getStats();
      if (res.success && res.data) setStats(res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadWebinars(); }, [loadWebinars]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (mainTab === 'pastRecordings') loadPastRecordings(); }, [mainTab, loadPastRecordings]);

  // Reset page on tab/search change
  useEffect(() => { setPage(1); }, [activeTab, search]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const openModal = (type: ModalType, webinar?: Webinar | PastRecording) => {
    setSelected(webinar ?? null);
    if (type === 'edit' && webinar && 'title' in webinar && 'description' in webinar) {
      setForm(webinarToForm(webinar as Webinar));
    }
    if (type === 'create') { setForm(defaultForm); setFormErrors({}); }
    setModal(type);
  };
  const closeModal = () => { setModal(null); setSelected(null); };

  // ── CRUD actions ─────────────────────────────────────────────────────────

  const handleCreate = async () => {
    setFormLoading(true); setFormErrors({});
    try {
      const res = await webinarService.createWebinar(formToPayload(form));
      if (res.success) { toast('Webinar created and scheduled on Zoom!', 'success'); closeModal(); loadWebinars(); loadStats(); }
      else if (res.errors) {
        const flat: Record<string, string> = {};
        Object.entries(res.errors).forEach(([k, v]) => flat[k] = v[0]);
        setFormErrors(flat);
        toast(Object.values(flat)[0] ?? res.message ?? 'Failed', 'error');
      } else {
        // Surface Zoom-specific error details if available
        const zoomErr = (res as unknown as { zoom_error?: { message?: string; code?: number } }).zoom_error;
        const errMsg = zoomErr?.message
          ? `Zoom error (${zoomErr.code ?? '?'}): ${zoomErr.message}`
          : (res.message ?? 'Failed to create webinar');
        toast(errMsg, 'error');
      }
    } catch (e: unknown) {
      const { message, errors } = parseApiValidationError(e);
      if (Object.keys(errors).length) setFormErrors(errors);
      toast(message, 'error');
    }
    finally { setFormLoading(false); }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    setFormLoading(true); setFormErrors({});
    try {
      const payload: UpdateWebinarPayload = formToPayload(form);
      const res = await webinarService.updateWebinar((selected as Webinar).id, payload);
      if (res.success) { toast('Webinar updated!', 'success'); closeModal(); loadWebinars(); }
      else if (res.errors) {
        const flat: Record<string, string> = {};
        Object.entries(res.errors).forEach(([k, v]) => flat[k] = v[0]);
        setFormErrors(flat);
        toast(Object.values(flat)[0] ?? res.message ?? 'Failed', 'error');
      } else toast(res.message ?? 'Failed', 'error');
    } catch (e: unknown) {
      const { message, errors } = parseApiValidationError(e);
      if (Object.keys(errors).length) setFormErrors(errors);
      toast(message, 'error');
    }
    finally { setFormLoading(false); }
  };

  const handleDeletePastRecording = async (recording: PastRecording) => {
    try {
      const res = await webinarService.deletePastRecording(recording.id);
      if (res.success) {
        toast('Recording deleted', 'success');
        loadPastRecordings();
      } else {
        toast(res.message ?? 'Failed', 'error');
      }
    } catch { toast('Error', 'error'); }
  };

  const handleDeleteWebinar = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await webinarService.deleteWebinar((selected as Webinar).id);
      if (res.success) { toast('Webinar deleted', 'success'); closeModal(); loadWebinars(); loadStats(); }
      else toast(res.message ?? 'Failed', 'error');
    } catch { toast('Error', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleCancel = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await webinarService.cancelWebinar((selected as Webinar).id);
      if (res.success) { toast('Webinar cancelled', 'success'); closeModal(); loadWebinars(); loadStats(); }
      else toast(res.message ?? 'Failed', 'error');
    } catch { toast('Error', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleStart = async (webinar: Webinar) => {
    try {
      const res = await webinarService.startWebinar(webinar.id);
      if (res.success) {
        toast('Webinar is now live!', 'success');
        if (webinar.live_link) window.open(webinar.live_link, '_blank');
        loadWebinars(); loadStats();
      } else toast(res.message ?? 'Failed', 'error');
    } catch { toast('Error', 'error'); }
  };

  const handleComplete = async (webinar: Webinar) => {
    try {
      const res = await webinarService.completeWebinar(webinar.id);
      if (res.success) { toast('Webinar completed', 'success'); loadWebinars(); loadStats(); }
      else toast(res.message ?? 'Failed', 'error');
    } catch { toast('Error', 'error'); }
  };

  const handleSendReminders = async (webinar: Webinar) => {
    try {
      const res = await webinarService.sendReminders(webinar.id);
      if (res.success) toast(res.message ?? 'Reminders queued', 'success');
      else toast(res.message ?? 'Failed', 'error');
    } catch { toast('Error', 'error'); }
  };

  const handleExport = async (webinar: Webinar) => {
    try {
      const blob = await webinarService.exportRegistrants(webinar.id);
      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${webinar.title}_registrants.csv`; a.click();
      URL.revokeObjectURL(url);
      toast('Export downloaded', 'success');
    } catch { toast('Export failed', 'error'); }
  };

  const handleCopyLink = (webinar: Webinar) => {
    // Prefer the Zoom join URL, fall back to the general live_link
    const link = webinar.zoom_join_url || webinar.live_link;
    if (link) {
      navigator.clipboard.writeText(link);
      toast('Zoom join link copied!', 'success');
    } else toast('No join link available', 'error');
  };

  // ── Tab counts ────────────────────────────────────────────────────────────

  const tabs: { id: WebinarStatus | 'all'; label: string; count: number }[] = [
    { id: 'upcoming', label: 'Upcoming', count: stats?.webinars.upcoming ?? 0 },
    { id: 'live', label: '🔴 Live', count: stats?.webinars.live ?? 0 },
    { id: 'completed', label: 'Completed', count: stats?.webinars.completed ?? 0 },
    { id: 'cancelled', label: 'Cancelled', count: stats?.webinars.cancelled ?? 0 },
    { id: 'all', label: 'All', count: stats?.webinars.total ?? 0 },
  ];

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <ToastStack toasts={toasts} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Manage Webinars</h1>
          <p className="text-slate-500 mt-1">Create, host, and analyse your webinar performance</p>
        </div>
        <button onClick={() => openModal('create')}
          className="bg-blue-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-800 transition flex items-center gap-2 shadow-sm">
          + Create Webinar
        </button>
      </div>

      {/* Dashboard stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Registrations" value={stats.registrations.total} color="bg-white border border-slate-200 text-slate-800" />
          <StatCard label="Approved" value={stats.registrations.approved} color="bg-white border border-slate-200 text-slate-800" />
          <StatCard label="Attended" value={stats.registrations.attended} color="bg-white border border-slate-200 text-slate-800" />
          <StatCard label="Pending Recording Requests" value={stats.pending_recording_requests} color="bg-amber-50 border border-amber-100 text-amber-900" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 flex-wrap">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${activeTab === t.id ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                  {t.label}
                  {t.count > 0 && <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === t.id ? 'bg-white text-blue-900' : 'bg-slate-100 text-slate-600'}`}>{t.count}</span>}
                </button>
              ))}
            </div>
            <input className="flex-1 max-w-xs px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
              placeholder="Search webinars…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {activeTab === 'completed' && (
            <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Upload recordings directly on each completed webinar card. Learners can request access after you approve them in Manage Registrations.
            </div>
          )}

          {/* Webinars List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-36 bg-slate-200 rounded-xl animate-pulse" />)}
            </div>
          ) : webinars.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-14 text-center">
              <div className="text-5xl mb-3">🎬</div>
              <p className="text-slate-500 mb-4">No {activeTab !== 'all' ? activeTab : ''} webinars found</p>
              {activeTab === 'all' && (
                <button onClick={() => openModal('create')} className="bg-blue-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-800 transition">
                  + Create Your First Webinar
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {webinars.map(w => (
                <WebinarCard key={w.id} webinar={w}
                  onManage={() => openModal('manage', w)}
                  onAnalytics={() => openModal('analytics', w)}
                  onEdit={() => openModal('edit', w)}
                  onCancel={() => openModal('cancel', w)}
                  onDelete={() => openModal('delete', w)}
                  onStart={() => handleStart(w)}
                  onComplete={() => handleComplete(w)}
                  onCopyLink={() => handleCopyLink(w)}
                  onSendReminders={() => handleSendReminders(w)}
                  onExport={() => handleExport(w)}
                  onUploadRecording={() => openModal('uploadWebinarRecording', w)}
                  onWatchRecording={() => watchWebinarRecording(w)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-slate-50">← Prev</button>
              <span className="text-sm text-slate-500">Page {page} of {lastPage} · {total} total</span>
              <button disabled={page === lastPage} onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-slate-50">Next →</button>
            </div>
          )}

      {/* ── Modals ────────────────────────────────────────────────────── */}

      {/* Create */}
      {modal === 'create' && (
        <Modal title="Create New Webinar" onClose={closeModal} size="lg"
          footer={
            <>
              <button onClick={closeModal} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">Cancel</button>
              <button onClick={handleCreate} disabled={formLoading}
                className="px-5 py-2 bg-blue-900 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
                {formLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    Creating on Zoom…
                  </span>
                ) : '📅 Create Webinar on Zoom'}
              </button>
            </>
          }>
          {/* Zoom info notice */}
          <div className="mb-4 flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-3 3v-3H6a2 2 0 0 1-2-2V6z"/></svg>
            <div>
              <p className="text-sm font-semibold text-blue-800">Zoom Webinar Integration Active</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Submitting this form will create a real Zoom Webinar in your connected Zoom account.
                The join URL and host start link will be saved automatically.
              </p>
            </div>
          </div>
          <WebinarForm form={form} onChange={setForm} errors={formErrors} />
        </Modal>
      )}

      {/* Edit */}
      {modal === 'edit' && selected && (
        <Modal title="Edit Webinar" subtitle={(selected as Webinar).title} onClose={closeModal} size="lg"
          footer={
            <>
              <button onClick={closeModal} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">Cancel</button>
              <button onClick={handleUpdate} disabled={formLoading}
                className="px-5 py-2 bg-blue-900 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
                {formLoading ? 'Saving…' : '✔ Save Changes'}
              </button>
            </>
          }>
          <WebinarForm form={form} onChange={setForm} errors={formErrors} />
        </Modal>
      )}

      {/* Upload Past Recording */}
      {modal === 'uploadPastRecording' && (
        <UploadPastRecordingModal
          onClose={closeModal}
          onSuccess={loadPastRecordings}
          toast={toast}
        />
      )}

      {/* Upload recording on completed webinar */}
      {modal === 'uploadWebinarRecording' && selected && (
        <UploadWebinarRecordingModal
          webinar={selected as Webinar}
          onClose={closeModal}
          onSuccess={loadWebinars}
          toast={toast}
        />
      )}

      {/* Manage registrations */}
      {modal === 'manage' && selected && (
        <RegistrationsModal webinar={selected as Webinar} onClose={closeModal} toast={toast} />
      )}

      {/* Analytics */}
      {modal === 'analytics' && selected && (
        <AnalyticsModal webinar={selected as Webinar} onClose={closeModal} />
      )}

      {/* Cancel confirm */}
      {modal === 'cancel' && selected && (
        <ConfirmModal
          title="Cancel Webinar"
          message={`Are you sure you want to cancel "${(selected as Webinar).title}"? All approved registrants will be notified.`}
          confirmLabel={actionLoading ? 'Cancelling…' : 'Yes, Cancel Webinar'}
          confirmColor="red"
          onConfirm={handleCancel}
          onClose={closeModal}
        />
      )}

      {/* Delete confirm */}
      {modal === 'delete' && selected && (
        <ConfirmModal
          title="Delete Webinar"
          message={`Permanently delete "${(selected as Webinar).title}"? This cannot be undone.`}
          confirmLabel={actionLoading ? 'Deleting…' : 'Yes, Delete'}
          confirmColor="red"
          onConfirm={handleDeleteWebinar}
          onClose={closeModal}
        />
      )}

      {player && (
        <WebinarRecordingPlayer
          title={player.title}
          streamUrl={player.streamUrl}
          onClose={() => setPlayer(null)}
        />
      )}
    </div>
  );
}