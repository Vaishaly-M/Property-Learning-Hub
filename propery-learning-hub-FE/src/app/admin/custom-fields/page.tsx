'use client';

import { useEffect, useState } from 'react';
import { Add, Delete, Tune } from '@mui/icons-material';
import toast from 'react-hot-toast';
import crmService, { CustomField } from '../../../services/crmService';

const MODULES = [
  'contacts',
  'memberships',
  'webinars',
  'events',
  'meetings',
  'communications',
  'activity_logs',
  'payments',
];

const FIELD_TYPES = [
  'text',
  'long_text',
  'number',
  'currency',
  'date',
  'datetime',
  'checkbox',
  'dropdown',
  'multi_select',
  'email',
  'phone',
  'url',
  'file_upload',
];

export default function AdminCustomFieldsPage() {
  const [moduleName, setModuleName] = useState('contacts');
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [required, setRequired] = useState(false);
  const [optionsCsv, setOptionsCsv] = useState('');

  const loadFields = async () => {
    setLoading(true);
    try {
      const data = await crmService.getCustomFields(moduleName);
      setFields(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load fields');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, [moduleName]);

  const handleCreateField = async () => {
    if (!newFieldName.trim()) {
      toast.error('Field name is required');
      return;
    }

    setSaving(true);
    try {
      const options = ['dropdown', 'multi_select'].includes(newFieldType)
        ? optionsCsv
            .split(',')
            .map((item, index) => item.trim())
            .filter(Boolean)
            .map((value, index) => ({ label: value, value, sort_order: index }))
        : [];

      await crmService.createCustomField({
        module_name: moduleName,
        field_name: newFieldName.trim(),
        field_type: newFieldType,
        required,
        options,
      });

      toast.success('Field created');
      setNewFieldName('');
      setNewFieldType('text');
      setRequired(false);
      setOptionsCsv('');
      await loadFields();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create field');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (fieldId: number) => {
    if (!window.confirm('Delete this field? Existing values for this field will be removed.')) {
      return;
    }

    try {
      await crmService.deleteCustomField(fieldId);
      toast.success('Field deleted');
      await loadFields();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete field');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dynamic Custom Fields</h1>
        <p className="text-sm text-slate-500 mt-1">
          Add and manage module fields without database redesign.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Module</label>
            <select
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {MODULES.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Field Name</label>
            <input
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="e.g. Lead Score"
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Field Type</label>
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {FIELD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <label className="inline-flex items-center gap-2 text-sm mb-2">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
              />
              Required
            </label>
          </div>
        </div>

        {['dropdown', 'multi_select'].includes(newFieldType) && (
          <div>
            <label className="text-sm font-medium text-slate-700">Options (comma separated)</label>
            <input
              value={optionsCsv}
              onChange={(e) => setOptionsCsv(e.target.value)}
              placeholder="Low, Medium, High"
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleCreateField}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg disabled:opacity-50"
          >
            <Add sx={{ fontSize: 16 }} />
            {saving ? 'Creating...' : 'Add Field'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Tune className="text-blue-900" />
          <h2 className="text-lg font-semibold text-slate-800">Configured Fields</h2>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Loading fields...</p>
        ) : fields.length === 0 ? (
          <p className="text-sm text-slate-400">No fields configured yet for this module.</p>
        ) : (
          <div className="space-y-2">
            {fields.map((field) => (
              <div
                key={field.id}
                className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{field.field_name}</p>
                  <p className="text-xs text-slate-500">
                    {field.field_key} • {field.field_type}
                    {field.required ? ' • required' : ''}
                    {!field.active ? ' • inactive' : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteField(field.id)}
                  className="text-red-600 hover:text-red-700"
                  title="Delete field"
                >
                  <Delete fontSize="small" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
