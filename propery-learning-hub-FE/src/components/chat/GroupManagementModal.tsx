'use client';

import React, { useEffect, useState } from 'react';
import { Close } from '@mui/icons-material';
import toast from 'react-hot-toast';
import chatService, { ChatContact, ChatDetail } from '../../services/chatService';

interface Props {
  chatId: number | null;
  onClose: () => void;
  onCreated: () => void;
}

const GroupManagementModal: React.FC<Props> = ({ chatId, onClose, onCreated }) => {
  const isEdit = !!chatId;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [settings, setSettings] = useState({
    allow_file_share: true,
    allow_audio_share: true,
    allow_member_invite: true,
    allow_member_remove: true,
  });
  const [chat, setChat] = useState<ChatDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const memberIdsInGroup = new Set(chat?.members.map((m) => m.id) ?? []);
  const availableUsers = contacts.filter((contact) => {
    const bySearch =
      !userSearch ||
      contact.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      contact.email.toLowerCase().includes(userSearch.toLowerCase());
    const byRole = roleFilter === 'all' || contact.role === roleFilter;
    const notAlreadyInGroup = !isEdit || !memberIdsInGroup.has(contact.id);
    const notAlreadySelected = !selectedMemberIds.includes(contact.id);
    return bySearch && byRole && notAlreadyInGroup && notAlreadySelected;
  });

  const uniqueRoles = Array.from(new Set(contacts.map((c) => c.role))).sort();
  const selectedUsers = contacts.filter((c) => selectedMemberIds.includes(c.id));

  const loadContacts = async () => {
    try {
      const data = await chatService.getContacts();
      setContacts(data);
    } catch {
      toast.error('Failed to load users');
    }
  };

  useEffect(() => {
    if (chatId) {
      chatService.getChat(chatId).then((data) => {
        setChat(data);
        setName(data.name || '');
        setDescription(data.description || '');
        if (data.settings) setSettings(data.settings);
      });
    } else {
      setChat(null);
      setName('');
      setDescription('');
      setSelectedMemberIds([]);
      setUserSearch('');
      setRoleFilter('all');
      setSettings({
        allow_file_share: true,
        allow_audio_share: true,
        allow_member_invite: true,
        allow_member_remove: true,
      });
    }
    loadContacts();
  }, [chatId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const form = new FormData();
    form.append('name', name);
    form.append('description', description);

    if (!isEdit) {
      form.append('type', 'group');
      selectedMemberIds.forEach((id) => form.append('member_ids[]', String(id)));
    } else {
      form.append('settings', JSON.stringify(settings));
    }

    try {
      if (isEdit && chatId) {
        const updateForm = new FormData();
        updateForm.append('name', name);
        updateForm.append('description', description);
        updateForm.append('settings', JSON.stringify(settings));
        await chatService.updateGroup(chatId, updateForm);
        toast.success('Group updated');
      } else {
        await chatService.createGroup(form);
        toast.success('Group created');
      }
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save group');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (userId: number) => {
    if (!chatId) return;
    try {
      await chatService.addMember(chatId, userId);
      toast.success('Member added');
      const data = await chatService.getChat(chatId);
      setChat(data);
      setSelectedMemberIds((prev) => prev.filter((id) => id !== userId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!chatId) return;
    try {
      await chatService.removeMember(chatId, userId);
      toast.success('Member removed');
      const data = await chatService.getChat(chatId);
      setChat(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleDeleteGroup = async () => {
    if (!chatId) return;
    const ok = window.confirm('Delete this group chat? This will archive the group.');
    if (!ok) return;

    setDeleting(true);
    try {
      await chatService.deleteGroup(chatId);
      toast.success('Group deleted');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete group');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-slate-800">
            {isEdit ? 'Manage Group' : 'Create Group'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Close />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Group Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          {!isEdit && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Select Members</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="all">All roles</option>
                  {uniqueRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() =>
                        setSelectedMemberIds((prev) => prev.filter((id) => id !== user.id))
                      }
                      className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-900"
                    >
                      {user.name} ({user.role}) x
                    </button>
                  ))}
                </div>
              )}
              <div className="border border-slate-200 rounded-lg max-h-44 overflow-y-auto">
                {availableUsers.length === 0 ? (
                  <p className="text-xs text-slate-400 p-3">No users match your filters</p>
                ) : (
                  availableUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedMemberIds((prev) => [...prev, user.id])}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                    >
                      <span className="font-medium text-slate-800">{user.name}</span>{' '}
                      <span className="text-slate-500">({user.role})</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {isEdit && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Group Settings</p>
                {(
                  [
                    ['allow_file_share', 'Allow file sharing'],
                    ['allow_audio_share', 'Allow audio sharing'],
                    ['allow_member_invite', 'Allow member invites'],
                    ['allow_member_remove', 'Allow member removal'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, [key]: e.target.checked }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Members</p>
                <ul className="space-y-1 mb-3">
                  {chat?.members.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between text-sm bg-slate-50 px-3 py-2 rounded"
                    >
                      <span>
                        {m.name} <span className="text-slate-400">({m.role})</span>
                      </span>
                      {m.role !== 'owner' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.id)}
                          className="text-red-500 text-xs"
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Add Members</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    <input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search users..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option value="all">All roles</option>
                      {uniqueRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="border border-slate-200 rounded-lg max-h-44 overflow-y-auto">
                    {availableUsers.length === 0 ? (
                      <p className="text-xs text-slate-400 p-3">No users available to add</p>
                    ) : (
                      availableUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleAddMember(user.id)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                        >
                          <span className="font-medium text-slate-800">{user.name}</span>{' '}
                          <span className="text-slate-500">({user.role})</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2">
            {isEdit && (
              <button
                type="button"
                onClick={handleDeleteGroup}
                disabled={deleting || saving}
                className="w-1/3 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Group'}
              </button>
            )}
            <button
              type="submit"
              disabled={saving || deleting}
              className={`${isEdit ? 'w-2/3' : 'w-full'} py-2.5 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 disabled:opacity-50`}
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupManagementModal;
