import api from './api';

export interface PermissionItem {
  id: number;
  name: string;
  group: string;
}

export interface RoleItem {
  id: number;
  name: string;
  permissions: string[];
}

type RolePermissionResponse = {
  roles: RoleItem[];
  permissions: PermissionItem[];
};

type ApiEnvelope<T> = { success?: boolean; data: T; message?: string };

function unwrap<T>(response: ApiEnvelope<T> | T): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as ApiEnvelope<T>).data;
  }
  return response as T;
}

const rolePermissionService = {
  getRolesAndPermissions: async (): Promise<RolePermissionResponse> => {
    const res = await api.get('/admin/permissions/roles');
    return unwrap<RolePermissionResponse>(res);
  },

  updateRolePermissions: async (role: string, permissions: string[]) => {
    try {
      const res = await api.put(`/admin/permissions/roles/${role}`, { permissions });
      return unwrap(res);
    } catch {
      const res = await api.post(`/admin/permissions/roles/${role}`, { permissions });
      return unwrap(res);
    }
  },
};

export default rolePermissionService;
