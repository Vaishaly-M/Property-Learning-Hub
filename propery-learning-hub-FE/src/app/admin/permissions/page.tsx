'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminPanelSettings, Refresh, Save, Security, Search } from '@mui/icons-material';
import toast from 'react-hot-toast';
import rolePermissionService, {
  PermissionItem,
  RoleItem,
} from '../../../services/rolePermissionService';

function humanize(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\./g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function permissionLabel(permissionName: string, group: string): string {
  const prefix = `${group}.`;
  const shortName = permissionName.startsWith(prefix)
    ? permissionName.slice(prefix.length)
    : permissionName;
  return humanize(shortName);
}

export default function AdminPermissionsPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await rolePermissionService.getRolesAndPermissions();
      setRoles(data.roles || []);
      setPermissions(data.permissions || []);

      if (data.roles?.length) {
        // Check if the currently selected role still exists
        const existingRole = data.roles.find((item) => item.name === selectedRole);
        
        if (existingRole) {
          // If the role exists, update its permissions
          setSelectedPermissions(existingRole.permissions || []);
        } else {
          // If the role doesn't exist, select the first one
          const firstRole = data.roles[0];
          setSelectedRole(firstRole.name);
          setSelectedPermissions(firstRole.permissions || []);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load permissions');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onChangeRole = (roleName: string) => {
    setSelectedRole(roleName);
    const role = roles.find((item) => item.name === roleName);
    setSelectedPermissions(role?.permissions || []);
  };

  const filteredPermissions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return permissions;
    return permissions.filter(
      (permission) =>
        permission.name.toLowerCase().includes(term) ||
        permission.group.toLowerCase().includes(term),
    );
  }, [permissions, search]);

  const groupedPermissions = useMemo(() => {
    return filteredPermissions.reduce<Record<string, PermissionItem[]>>((acc, permission) => {
      if (!acc[permission.group]) {
        acc[permission.group] = [];
      }
      acc[permission.group].push(permission);
      return acc;
    }, {});
  }, [filteredPermissions]);

  const totalSelected = selectedPermissions.length;
  const totalPermissions = permissions.length;
  const changed =
    selectedRole.length > 0 &&
    (() => {
      const role = roles.find((item) => item.name === selectedRole);
      const existing = role?.permissions || [];
      if (existing.length !== selectedPermissions.length) return true;
      const current = new Set(selectedPermissions);
      return existing.some((permission) => !current.has(permission));
    })();

  const togglePermission = (permissionName: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionName)
        ? prev.filter((item) => item !== permissionName)
        : [...prev, permissionName],
    );
  };

  const handleSave = async () => {
    if (!selectedRole) return;

    setSaving(true);
    try {
      await rolePermissionService.updateRolePermissions(selectedRole, selectedPermissions);
      toast.success(`Permissions updated for ${selectedRole}`);
      
      // Update the roles state locally instead of refetching
      setRoles(prevRoles => 
        prevRoles.map(role => 
          role.name === selectedRole 
            ? { ...role, permissions: [...selectedPermissions] }
            : role
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-1 sm:px-4 md:px-6 py-4 sm:py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Role & Permission Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure access control for each role from one place.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadData(false)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Refresh sx={{ fontSize: 16 }} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <AdminPanelSettings />
          </div>
          <p className="text-sm text-slate-500">Roles</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{roles.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <Security />
          </div>
          <p className="text-sm text-slate-500">Total Permissions</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{totalPermissions}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Save />
          </div>
          <p className="text-sm text-slate-500">Selected for Role</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{totalSelected}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => onChangeRole(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:border-blue-500 outline-none"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Search Permissions</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" fontSize="small" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or group..."
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {selectedRole && (
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Role: {selectedRole}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {filteredPermissions.length} visible permissions
          </span>
          {changed && (
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto border border-slate-200 rounded-xl p-4 bg-slate-50/40">
          {Object.keys(groupedPermissions).length === 0 && (
            <p className="text-sm text-slate-400">No permissions found.</p>
          )}

          {Object.entries(groupedPermissions).map(([group, items]) => (
            <div key={group} className="space-y-2 bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {humanize(group)}
                  </p>
                  <p className="text-[11px] text-slate-400">{group}</p>
                </div>
                <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {items.map((permission) => (
                  <label
                    key={permission.id}
                    className="flex items-center gap-2 text-sm border border-slate-200 rounded-lg px-3 py-2.5 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission.name)}
                      onChange={() => togglePermission(permission.name)}
                      className="cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">
                        {permissionLabel(permission.name, permission.group)}
                      </span>
                      <span className="text-xs text-slate-400">{permission.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || !selectedRole || !changed}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-900 text-white rounded-lg disabled:opacity-50 hover:bg-blue-800 transition-colors"
          >
            <Save sx={{ fontSize: 16 }} />
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
}