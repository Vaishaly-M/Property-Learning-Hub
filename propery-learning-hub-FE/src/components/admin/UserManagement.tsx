'use client';

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Search,
  Add,
  Edit,
  Delete,
  Block,
  CheckCircle,
  PersonAdd,
  Visibility,
  MoreVert,
  History,
  Star,
  X,
  CalendarToday,
  Refresh,
  Description,
  Download,
} from '@mui/icons-material';
import userManagementService, {
  User,
  ActivityLog,
  AdminNote,
  UserStats,
} from '../../services/userManagement';
import FreeRegistrationInvitesPanel from './FreeRegistrationInvitesPanel';
import PaidUserInvitesPanel from './PaidUserInvitesPanel';

// ---------------------------------------------------------------------------
// PaginationControls Component
// ---------------------------------------------------------------------------
const PaginationControls: React.FC<{
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}> = ({ pagination, onPageChange, onPerPageChange }) => {
  const { current_page, per_page, total, last_page } = pagination;
  
  const startItem = (current_page - 1) * per_page + 1;
  const endItem = Math.min(current_page * per_page, total);
  
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;
    
    if (last_page <= maxVisible) {
      for (let i = 1; i <= last_page; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      let start = Math.max(2, current_page - 1);
      let end = Math.min(last_page - 1, current_page + 1);
      
      if (current_page <= 3) {
        end = Math.min(last_page - 1, 4);
      }
      
      if (current_page >= last_page - 2) {
        start = Math.max(2, last_page - 3);
      }
      
      if (start > 2) {
        pages.push('...');
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < last_page - 1) {
        pages.push('...');
      }
      
      if (last_page > 1) {
        pages.push(last_page);
      }
    }
    
    return pages;
  };

  return (
    <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="text-sm text-slate-500">
        Showing {startItem} to {endItem} of {total} users
      </div>
      
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">Rows per page:</label>
          <select
            value={per_page}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            className="px-2 py-1 text-sm border border-slate-300 rounded focus:border-blue-500 focus:ring-3 focus:ring-blue-200 outline-none"
          >
            {[10, 15, 25, 50, 100].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
        
        <div className="flex gap-1">
          <button
            onClick={() => onPageChange(current_page - 1)}
            disabled={current_page === 1}
            className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                page === current_page
                  ? 'bg-blue-500 text-white border border-blue-500'
                  : page === '...'
                  ? 'border-0 cursor-default text-slate-500'
                  : 'border border-slate-300 hover:bg-slate-50'
              }`}
              disabled={page === '...'}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => onPageChange(current_page + 1)}
            disabled={current_page === last_page}
            className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------
const DataTable: React.FC<{
  data: any[];
  columns: any[];
  selectable?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  onSelectionChange?: (selectedIds: string[]) => void;
}> = ({ data, columns, selectable = false, loading = false, emptyMessage = 'No users found.', onSelectionChange }) => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const toggleRowSelection = (id: string) => {
    const next = new Set(selectedRows);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedRows(next);
    onSelectionChange?.(Array.from(next));
  };

  const toggleAllSelection = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    } else {
      const allIds = data.map((item) => item.id);
      setSelectedRows(new Set(allIds));
      onSelectionChange?.(allIds);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="text-center py-16 text-slate-400">
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {selectable && (
                <th className="w-12 px-4 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={data.length > 0 && selectedRows.size === data.length}
                    onChange={toggleAllSelection}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </th>
              )}
              {columns.map((column, i) => (
                <th
                  key={i}
                  className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 align-top">
                {selectable && (
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(item.id)}
                      onChange={() => toggleRowSelection(item.id)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                  </td>
                )}

                {columns.map((column, ci) => (
                  <td key={ci} className="px-4 py-4 break-words whitespace-normal">
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const formatActivityLog = (action: string, details: string) => {
  let parsedDetails: any = null;
  try {
    if (details.trim().startsWith('{') || details.trim().startsWith('[')) {
      parsedDetails = JSON.parse(details);
    }
  } catch {
    // Keep parsedDetails as null
  }

  if (action.startsWith('chat.')) {
    const chat_id = parsedDetails?.chat_id || '';
    const type = parsedDetails?.type || '';
    const recipient_id = parsedDetails?.recipient_id || '';
    const member_id = parsedDetails?.member_id || '';

    switch (action) {
      case 'chat.message_sent':
        return {
          action: 'Sent Chat Message',
          details: `Sent a message (${type}) in Chat #${chat_id}`,
        };
      case 'chat.message_edited':
        return {
          action: 'Edited Chat Message',
          details: `Edited a message in Chat #${chat_id}`,
        };
      case 'chat.message_deleted':
        return {
          action: 'Deleted Chat Message',
          details: `Deleted a message in Chat #${chat_id}`,
        };
      case 'chat.private_created':
        return {
          action: 'Private Chat Created',
          details: `Created a private chat (Chat #${chat_id}) with Recipient #${recipient_id}`,
        };
      case 'chat.group_created':
        return {
          action: 'Group Chat Created',
          details: `Created a group chat (Chat #${chat_id})`,
        };
      case 'chat.group_updated':
        return {
          action: 'Group Chat Updated',
          details: `Updated the group chat (Chat #${chat_id}) settings`,
        };
      case 'chat.group_deleted':
        return {
          action: 'Group Chat Deleted',
          details: `Deleted the group chat (Chat #${chat_id})`,
        };
      case 'chat.member_added':
        return {
          action: 'Chat Member Added',
          details: `Added User #${member_id} to Chat #${chat_id}`,
        };
      case 'chat.member_removed':
        return {
          action: 'Chat Member Removed',
          details: `Removed User #${member_id} from Chat #${chat_id}`,
        };
      default:
        const friendlyAction = action
          .replace('chat.', '')
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        return {
          action: friendlyAction,
          details: parsedDetails ? `Details: ${JSON.stringify(parsedDetails)}` : details,
        };
    }
  }

  return { action, details };
};

// ---------------------------------------------------------------------------
// UserDetailsModal
// ---------------------------------------------------------------------------
const UserDetailsModal: React.FC<{
  user: User;
  onClose: () => void;
  onApprove: () => Promise<void>;
  onSuspend: () => Promise<void>;
  onUpgrade: (tier: 'free' | 'premium' | 'elite') => Promise<void>;
  onRefresh: () => void;
}> = ({ user, onClose, onApprove, onSuspend, onUpgrade, onRefresh }) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [proofOfAddress, setProofOfAddress] = useState<{
    uploaded: boolean;
    original_name?: string | null;
    mime?: string | null;
    size?: number | null;
    uploaded_at?: string | null;
  } | null>(user.proof_of_address ?? null);
  const [downloadingProof, setDownloadingProof] = useState(false);

  const loadUserData = useCallback(async () => {
    setLoading(true);
    try {
      const [detailsRes, activitiesRes, notesRes] = await Promise.all([
        userManagementService.getUser(user.id),
        userManagementService.getUserActivities(user.id, 1, 20),
        userManagementService.getAdminNotes(user.id),
      ]);
      setActivities(activitiesRes.data);
      setNotes(notesRes.data);
      const proof =
        detailsRes?.profile?.proof_of_address ??
        detailsRes?.user?.proof_of_address ??
        user.proof_of_address ??
        null;
      setProofOfAddress(proof);
    } catch (error) {
      console.error('Error loading user data:', error);
      setProofOfAddress(user.proof_of_address ?? null);
    } finally {
      setLoading(false);
    }
  }, [user.id, user.proof_of_address]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleDownloadProofOfAddress = async () => {
    try {
      setDownloadingProof(true);
      await userManagementService.downloadProofOfAddress(
        user.id,
        proofOfAddress?.original_name || undefined
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download document.');
    } finally {
      setDownloadingProof(false);
    }
  };

  const handleSaveNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      await userManagementService.saveAdminNote(user.id, newNote);
      await loadUserData();
      setNewNote('');
      onRefresh();
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setSavingNote(false);
    }
  };

  const getUserName = () => user.name || `${user.first_name} ${user.last_name}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-slate-200 p-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl font-bold">
                {getUserName().charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">{getUserName()}</h3>
                <p className="text-slate-500">{user.email}</p>
                <p className="text-slate-500 text-sm">{user.phone_number}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    user.status === 'active'    ? 'bg-green-100 text-green-800 border border-green-200' :
                    user.status === 'pending'   ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                                  'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {user.status.toUpperCase()}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                    {user.role.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 p-6">
          {/* Left column */}
          <div className="col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-semibold text-slate-800 mb-3">Quick Actions</h4>
              <div className="flex gap-3 flex-wrap">
                {user.status === 'pending' && (
                  <button
                    onClick={async () => {
                      await onApprove();
                      await loadUserData();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve User
                  </button>
                )}
                <button
                  onClick={async () => {
                    await onSuspend();
                    await loadUserData();
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    user.status === 'suspended'
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  <Block className="w-4 h-4" />
                  {user.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                </button>
              </div>
            </div>

            {/* Activity History */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <History className="w-5 h-5" /> Activity History
              </h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : activities.length > 0 ? (
                  activities.map((activity) => {
                    const formatted = formatActivityLog(activity.action, activity.details);
                    return (
                      <div key={activity.id} className="border border-slate-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-slate-800">{formatted.action}</div>
                            <div className="text-sm text-slate-500 mt-1">{formatted.details}</div>
                          </div>
                          <div className="text-xs text-slate-500 whitespace-nowrap">
                            {new Date(activity.created_at).toLocaleString()}
                          </div>
                        </div>
                        {activity.performed_by_name && (
                          <div className="text-xs text-slate-400 mt-2">
                            By: {activity.performed_by_name}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400">No activity history available</div>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {user.role === 'learner' && (
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Description className="w-5 h-5" /> Proof of Address ID
                </h4>
                {loading ? (
                  <p className="text-sm text-slate-500">Loading…</p>
                ) : proofOfAddress?.uploaded ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {proofOfAddress.original_name || 'Document uploaded'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {proofOfAddress.uploaded_at
                          ? `Uploaded ${new Date(proofOfAddress.uploaded_at).toLocaleString()}`
                          : 'Uploaded'}
                        {proofOfAddress.size
                          ? ` · ${(proofOfAddress.size / 1024).toFixed(0)} KB`
                          : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadProofOfAddress}
                      disabled={downloadingProof}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      {downloadingProof ? 'Downloading…' : 'View / Download'}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    This learner has not uploaded a proof of address document yet.
                  </p>
                )}
              </div>
            )}

            {/* Account Details */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <CalendarToday className="w-5 h-5" /> Account Details
              </h4>
              <div className="space-y-3">
                {[
                  { label: 'Joined Date',     value: new Date(user.joined_date).toLocaleDateString() },
                  { label: 'Last Active',     value: new Date(user.last_active).toLocaleDateString() },
                  { label: 'User ID',         value: user.id },
                  { label: 'Email Verified',  value: user.email_verified ? 'Yes' : 'No' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-xs text-slate-500">{label}</div>
                    <div className="font-medium text-sm font-mono">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Notes */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-800 mb-3">Admin Notes</h4>
              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                {notes.map((note) => (
                  <div key={note.id} className="bg-slate-50 rounded-lg p-2 text-sm">
                    <div className="text-slate-700">{note.note}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {note.admin?.first_name} {note.admin?.last_name} —{' '}
                      {new Date(note.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              <textarea
                className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:border-blue-500 focus:ring-3 focus:ring-blue-200 outline-none"
                rows={4}
                placeholder="Add notes about this user..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <button
                onClick={handleSaveNote}
                disabled={savingNote || !newNote.trim()}
                className="mt-3 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {savingNote ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main UserManagement component
// ---------------------------------------------------------------------------
const UserManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'free-invites' | 'paid-invites'>('users');
  const [searchQuery, setSearchQuery]     = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [activeFilter, setActiveFilter]   = useState('All');
  const [users, setUsers]                 = useState<User[]>([]);
  const [selectedUser, setSelectedUser]   = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [bulkAction, setBulkAction]       = useState('');
  const [loading, setLoading]             = useState(true);
  const [stats, setStats]                 = useState<UserStats | null>(null);
  const [pagination, setPagination]       = useState({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,
  });

  const filters = ['All', 'Active', 'Pending', 'Suspended', 'Admins'];

  // Single combined fetch — no second CORS preflight for stats
  const loadUsersAndStats = useCallback(async () => {
    setLoading(true);
    try {
      let status: string | undefined;
      let role: string | undefined;
      let membership: string | undefined;

      switch (activeFilter) {
        case 'Active':    status     = 'active';    break;
        case 'Pending':   status     = 'pending';   break;
        case 'Suspended': status     = 'suspended'; break;
        case 'Admins':    role       = 'admin';     break;
      }

      const response = await userManagementService.getUsers({
        page:         pagination.current_page,
        per_page:     pagination.per_page,
        status,
        role,
        membership,
        search:       searchQuery || undefined,
        includeStats: true,
      });

      setUsers(response.data);
      setPagination(response.pagination);
      if (response.stats) setStats(response.stats);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery, pagination.current_page, pagination.per_page]);

  useEffect(() => {
    setPagination((p) => (p.current_page === 1 ? p : { ...p, current_page: 1 }));
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    loadUsersAndStats();
  }, [loadUsersAndStats]);

  // ---- Actions ----
  const approveUser = async (userId: string): Promise<User | null> => {
    try {
      const res = await userManagementService.approveUser(userId);
      await loadUsersAndStats();
      return res.data;
    } catch (error) {
      console.error('Error approving user:', error);
      return null;
    }
  };

  const suspendUser = async (userId: string): Promise<User | null> => {
    try {
      const user = users.find((u) => u.id === userId);
      let res;
      if (user?.status === 'suspended') {
        res = await userManagementService.reactivateUser(userId);
      } else {
        res = await userManagementService.suspendUser(userId);
      }
      await loadUsersAndStats();
      return res.data;
    } catch (error) {
      console.error('Error suspending/reactivating user:', error);
      return null;
    }
  };

  const upgradeMembership = async (userId: string, tier: 'free' | 'premium' | 'elite'): Promise<User | null> => {
    try {
      await userManagementService.updateMembership(userId, tier);
      await loadUsersAndStats();
      const updatedUsers = await userManagementService.getUsers({ page: pagination.current_page, per_page: pagination.per_page });
      const freshUser = updatedUsers.data.find(u => u.id === userId);
      return freshUser || null;
    } catch (error) {
      console.error('Error updating membership:', error);
      return null;
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${userName}?`)) return;
    try {
      await userManagementService.deleteUser(userId);
      await loadUsersAndStats();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) return;
    try {
      const result = await userManagementService.bulkAction(selectedUsers, bulkAction);
      const successes = result.results?.filter((r) => r.status === 'success').length ?? 0;
      const skipped = result.results?.filter((r) => r.status === 'skipped').length ?? 0;
      const failed = result.results?.filter((r) => r.status === 'failed').length ?? 0;

      if (successes > 0) {
        toast.success(`${successes} user${successes !== 1 ? 's' : ''} updated`);
      }
      if (skipped > 0 && successes === 0) {
        toast.error('No selected users could be updated for this action.');
      } else if (skipped > 0) {
        toast(`${skipped} user${skipped !== 1 ? 's' : ''} skipped`, { icon: 'ℹ️' });
      }
      if (failed > 0) {
        toast.error(`${failed} user${failed !== 1 ? 's' : ''} failed`);
      }

      await loadUsersAndStats();
      setSelectedUsers([]);
      setBulkAction('');
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error(error instanceof Error ? error.message : 'Bulk action failed');
    }
  };

  const viewUserDetails = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  // ---- Stats cards ----
  const statsCards = stats
    ? [
        { label: 'Total Users',       value: stats.total_users.toString(),                         change: '+12%', icon: <PersonAdd className="text-blue-500" />,   bgColor: 'bg-blue-50' },
        { label: 'Active Users',      value: stats.active_users.toString(),                        change: '+5%',  icon: <CheckCircle className="text-green-500" />, bgColor: 'bg-green-50' },
        { label: 'Pending Approval',  value: stats.pending_users.toString(),                       change: '-2%',  icon: <Visibility className="text-amber-500" />,  bgColor: 'bg-amber-50' },
      ]
    : [];

  // ---- Table columns ----
  const columns = [
    {
      key: 'name',
      label: 'User',
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
            {(user.name || user.first_name)?.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-800 truncate">
              {user.name || `${user.first_name} ${user.last_name}`}
            </div>
            <div className="text-xs text-slate-500 truncate">{user.email}</div>
          </div>
        </div>
      ),
    },

    {
      key: 'role',
      label: 'Role',
      render: (user: User) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          user.role === 'admin'
            ? 'bg-blue-50 text-blue-800 border border-blue-200'
            : 'bg-slate-100 text-slate-600 border border-slate-200'
        }`}>
          {user.role === 'admin' ? 'Admin' : user.role === 'instructor' ? 'Instructor' : 'Learner'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (user: User) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          user.status === 'active'  ? 'bg-green-100 text-green-800 border border-green-200' :
          user.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                      'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {user.status?.charAt(0).toUpperCase() + user.status?.slice(1)}
        </span>
      ),
    },
    {
      key: 'lastActive',
      label: 'Last Active',
      render: (user: User) => (
        <div className="text-sm text-slate-500">
          {new Date(user.last_active).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (user: User) => (
        <div className="flex gap-2">
          <button
            onClick={() => viewUserDetails(user)}
            className="p-1.5 bg-blue-50 border border-blue-200 rounded text-blue-800 hover:bg-blue-100 transition-colors"
            title="View details"
          >
            <Visibility className="w-4 h-4" />
          </button>

          {user.status === 'pending' ? (
            <button
              onClick={() => approveUser(user.id)}
              className="p-1.5 bg-green-50 border border-green-200 rounded text-green-600 hover:bg-green-100 transition-colors"
              title="Approve user"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => viewUserDetails(user)}
              className="p-1.5 bg-blue-50 border border-blue-200 rounded text-blue-800 hover:bg-blue-100 transition-colors"
              title="Edit user"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => suspendUser(user.id)}
            className={`p-1.5 rounded transition-colors ${
              user.status === 'suspended'
                ? 'bg-green-50 border border-green-200 text-green-600 hover:bg-green-100'
                : 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'
            }`}
            title={user.status === 'suspended' ? 'Reactivate user' : 'Suspend user'}
          >
            {user.status === 'suspended'
              ? <CheckCircle className="w-4 h-4" />
              : <Block className="w-4 h-4" />}
          </button>

          <button
            onClick={() => deleteUser(user.id, user.name || `${user.first_name} ${user.last_name}`)}
            className="p-1.5 bg-red-50 border border-red-200 rounded text-red-600 hover:bg-red-100 transition-colors"
            title="Delete user"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // ---- Render ----
  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage user accounts, memberships, and view activity history
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
          {/* Search */}
          <div className="relative w-full lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Bulk actions */}
          {selectedUsers.length > 0 && (
            <div className="flex gap-2">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-4 py-3 text-sm border border-slate-300 rounded-lg bg-white focus:border-blue-500 focus:ring-3 focus:ring-blue-200 outline-none"
              >
                <option value="">Bulk Actions</option>
                <option value="approve">Approve / Activate Selected</option>
                <option value="suspend">Suspend Selected</option>
                <option value="reactivate">Reactivate Selected</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                className="px-4 py-3 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          )}

          <button
            onClick={loadUsersAndStats}
            className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Refresh className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
          }`}
        >
          Users
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('free-invites')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
            activeTab === 'free-invites'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
          }`}
        >
          Free invite links
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('paid-invites')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
            activeTab === 'paid-invites'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
          }`}
        >
          Registration invites
        </button>
      </div>

      {activeTab === 'free-invites' ? (
        <FreeRegistrationInvitesPanel />
      ) : activeTab === 'paid-invites' ? (
        <PaidUserInvitesPanel />
      ) : (
        <>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsCards.map((stat, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
              {stat.icon}
            </div>
            <div className="flex-1">
              <div className="text-xl font-bold text-slate-800">{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </div>
            <div className={`text-xs font-semibold ${
              stat.change.startsWith('+') ? 'text-green-500' :
              stat.change.startsWith('-') ? 'text-red-500' : 'text-slate-500'
            }`}>
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors whitespace-nowrap ${
              activeFilter === filter
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable
        data={users}
        columns={columns}
        selectable
        loading={loading}
        emptyMessage={
          activeFilter !== 'All' || searchQuery
            ? 'No users found for the selected filter.'
            : 'No users found.'
        }
        onSelectionChange={setSelectedUsers}
      />

      {/* Pagination */}
      {users.length > 0 && (
        <PaginationControls
          pagination={pagination}
          onPageChange={(page) => {
            setPagination(p => ({ ...p, current_page: page }));
            // Scroll to top of table
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onPerPageChange={(perPage) => {
            setPagination(p => ({ ...p, per_page: perPage, current_page: 1 }));
          }}
        />
      )}

      {/* Selection badge */}
      {selectedUsers.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
        </>
      )}

      {/* User details modal */}
      {showUserModal && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setShowUserModal(false)}
          onApprove={async () => {
            const updated = await approveUser(selectedUser.id);
            if (updated) setSelectedUser(updated);
          }}
          onSuspend={async () => {
            const updated = await suspendUser(selectedUser.id);
            if (updated) setSelectedUser(updated);
          }}
          onUpgrade={async (tier) => {
            const updated = await upgradeMembership(selectedUser.id, tier);
            if (updated) setSelectedUser(updated);
          }}
          onRefresh={loadUsersAndStats}
        />
      )}
    </div>
  );
};

export default UserManagement;