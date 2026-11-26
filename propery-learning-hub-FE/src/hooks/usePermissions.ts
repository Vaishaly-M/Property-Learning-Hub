//hooks/usePermissions.ts
'use client';

import { useAdminAuth } from '../context/AdminAuthContext';

/** Mirrors backend ChatPermissionSeeder learner role defaults. */
const LEARNER_CHAT_PERMISSIONS = new Set([
  'chat.view',
  'chat.send',
  'chat.receive',
  'chat.delete',
  'group_chat.view',
  'group_chat.send',
  'group_chat.receive',
  'chat.file.upload',
  'chat.file.download',
  'chat.audio.send',
  'chat.audio.receive',
  'chat.notification.view',
]);

const INSTRUCTOR_EXTRA_CHAT_PERMISSIONS = new Set([
  'group_chat.create',
  'group_chat.edit',
  'group_chat.add_member',
  'group_chat.remove_member',
]);

function readStoredRole(): string | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    const stored = localStorage.getItem('user');
    if (!stored) return undefined;
    const parsed = JSON.parse(stored) as { role?: string };
    return parsed.role;
  } catch {
    return undefined;
  }
}

function roleFallbackPermissions(role?: string): Set<string> {
  if (role === 'admin') {
    return new Set([...LEARNER_CHAT_PERMISSIONS, ...INSTRUCTOR_EXTRA_CHAT_PERMISSIONS]);
  }
  if (role === 'instructor') {
    return new Set([...LEARNER_CHAT_PERMISSIONS, ...INSTRUCTOR_EXTRA_CHAT_PERMISSIONS]);
  }
  if (role === 'learner') {
    return LEARNER_CHAT_PERMISSIONS;
  }
  return new Set();
}

export function usePermissions() {
  const { admin } = useAdminAuth();
  const role = admin?.role ?? readStoredRole();
  const stored = (admin as { permissions?: string[] })?.permissions ?? [];
  const fallback = roleFallbackPermissions(role);

  const permissions =
    stored.length > 0
      ? [...new Set([...stored, ...fallback])]
      : [...fallback];

  const can = (permission: string) => {
    if (stored.includes(permission)) return true;
    if (fallback.has(permission)) return true;
    return false;
  };

  return { permissions, can, role };
}
