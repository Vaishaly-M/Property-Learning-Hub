'use client';

import { useCallback, useMemo, useState } from 'react';
import { CloudUpload, Description, Download, Search } from '@mui/icons-material';
import toast from 'react-hot-toast';
import crmService, {
  DuplicateAction,
  DuplicateResolution,
  ImportAnalysis,
  ImportConflict,
  ImportResult,
} from '../../../services/crmService';

const STANDARD_TARGETS = [
  { value: '', label: 'Ignore' },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' },
  { value: 'source', label: 'Source' },
  { value: 'classification', label: 'Classification' },
  { value: 'membership_status', label: 'Membership Status' },
  { value: 'status', label: 'Status' },
  { value: 'notes', label: 'Notes' },
];

const FIELD_LABELS: Record<string, string> = {
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email',
  phone: 'Phone',
  company: 'Company',
  source: 'Source',
  classification: 'Classification',
  membership_status: 'Membership Status',
  status: 'Status',
  notes: 'Notes',
};

type RowResolutionState = {
  action: DuplicateAction;
  field_choices: Record<string, 'existing' | 'incoming'>;
};

function defaultFieldChoices(conflict: ImportConflict): Record<string, 'existing' | 'incoming'> {
  const choices: Record<string, 'existing' | 'incoming'> = {};
  for (const field of conflict.diff_fields) {
    choices[field] = 'incoming';
  }
  return choices;
}

export default function AdminContactsImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [rowResolutions, setRowResolutions] = useState<Record<number, RowResolutionState>>({});
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handlePreview = async (selectedFile: File) => {
    setPreviewLoading(true);
    try {
      const preview = await crmService.previewImport(selectedFile);
      setHeaders(preview.headers || []);
      const autoMapping: Record<string, string> = {};
      for (const header of preview.headers || []) {
        const normalized = header.toLowerCase().trim().replace(/[-\s]+/g, '_');
        if (STANDARD_TARGETS.some((item) => item.value === normalized)) {
          autoMapping[header] = normalized;
        } else {
          autoMapping[header] = '';
        }
      }
      setColumnMapping(autoMapping);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to preview file');
    } finally {
      setPreviewLoading(false);
    }
  };

  const runAnalyze = useCallback(async () => {
    if (!file) return;
    setAnalyzeLoading(true);
    try {
      const data = await crmService.analyzeImport(file, columnMapping);
      setAnalysis(data);

      const defaults: Record<number, RowResolutionState> = {};
      for (const conflict of data.conflicts) {
        defaults[conflict.row_number] = {
          action: updateExisting ? 'update' : 'skip',
          field_choices: defaultFieldChoices(conflict),
        };
      }
      setRowResolutions(defaults);
      setExpandedRow(data.conflicts[0]?.row_number ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to analyze duplicates');
    } finally {
      setAnalyzeLoading(false);
    }
  }, [file, columnMapping, updateExisting]);

  const applyBulkAction = (action: DuplicateAction) => {
    if (!analysis) return;
    setRowResolutions((prev) => {
      const next = { ...prev };
      for (const conflict of analysis.conflicts) {
        next[conflict.row_number] = {
          action,
          field_choices:
            action === 'merge'
              ? defaultFieldChoices(conflict)
              : prev[conflict.row_number]?.field_choices ?? defaultFieldChoices(conflict),
        };
      }
      return next;
    });
  };

  const setRowAction = (rowNumber: number, action: DuplicateAction, conflict?: ImportConflict) => {
    setRowResolutions((prev) => ({
      ...prev,
      [rowNumber]: {
        action,
        field_choices:
          action === 'merge' && conflict
            ? prev[rowNumber]?.field_choices ?? defaultFieldChoices(conflict)
            : prev[rowNumber]?.field_choices ?? {},
      },
    }));
    if (action === 'merge') {
      setExpandedRow(rowNumber);
    }
  };

  const setFieldChoice = (
    rowNumber: number,
    field: string,
    choice: 'existing' | 'incoming',
  ) => {
    setRowResolutions((prev) => ({
      ...prev,
      [rowNumber]: {
        ...prev[rowNumber],
        action: 'merge',
        field_choices: {
          ...(prev[rowNumber]?.field_choices ?? {}),
          [field]: choice,
        },
      },
    }));
  };

  const duplicateResolutions = useMemo((): DuplicateResolution[] => {
    if (!analysis?.conflicts.length) return [];
    return analysis.conflicts.map((conflict) => {
      const state = rowResolutions[conflict.row_number];
      return {
        row_number: conflict.row_number,
        action: state?.action ?? (updateExisting ? 'update' : 'skip'),
        field_choices: state?.action === 'merge' ? state.field_choices : undefined,
      };
    });
  }, [analysis, rowResolutions, updateExisting]);

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a CSV/XLSX file');
      return;
    }

    if (analysis && analysis.summary.duplicates > 0 && duplicateResolutions.length === 0) {
      toast.error('Please analyze duplicates and resolve conflicts before importing');
      return;
    }

    setUploading(true);
    try {
      const importResult = await crmService.importContactsWithMapping(
        file,
        updateExisting,
        columnMapping,
        analysis && analysis.summary.duplicates > 0 ? duplicateResolutions : undefined,
      );
      setResult(importResult);
      toast.success('Contacts import completed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadErrors = () => {
    if (!result?.errors?.length) return;
    const csv = ['error', ...result.errors.map((error) => `"${error.replace(/"/g, '""')}"`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'import-errors.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const displayValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Contacts Import</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload contacts via CSV or Excel (.xlsx). Duplicates are matched by email, then phone.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
          <Description className="text-slate-400 mb-2" />
          <p className="text-sm text-slate-600 mb-3">Select CSV or XLSX file</p>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => {
              const selected = e.target.files?.[0] || null;
              setFile(selected);
              setResult(null);
              setAnalysis(null);
              setRowResolutions({});
              setHeaders([]);
              setColumnMapping({});
              if (selected) {
                handlePreview(selected);
              }
            }}
            className="block mx-auto text-sm"
          />
          {file && <p className="text-xs text-slate-500 mt-2">{file.name}</p>}
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={updateExisting}
            onChange={(e) => setUpdateExisting(e.target.checked)}
          />
          Default duplicate action: update existing (otherwise skip)
        </label>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={runAnalyze}
            disabled={analyzeLoading || !file || previewLoading || headers.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg disabled:opacity-50"
          >
            <Search sx={{ fontSize: 16 }} />
            {analyzeLoading ? 'Analyzing...' : 'Analyze Duplicates'}
          </button>
          <button
            onClick={handleImport}
            disabled={uploading || !file || previewLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg disabled:opacity-50"
          >
            <CloudUpload sx={{ fontSize: 16 }} />
            {uploading ? 'Importing...' : 'Start Import'}
          </button>
        </div>
      </div>

      {headers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Column Mapping</h2>
          <p className="text-xs text-slate-500 mb-3">
            Map your file columns to CRM fields, then analyze duplicates before importing.
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {headers.map((header) => (
              <div key={header} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
                <span className="text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2">
                  {header}
                </span>
                <select
                  value={columnMapping[header] || ''}
                  onChange={(e) => {
                    setColumnMapping((prev) => ({ ...prev, [header]: e.target.value }));
                    setAnalysis(null);
                    setRowResolutions({});
                  }}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  {STANDARD_TARGETS.map((target) => (
                    <option key={target.value || 'ignore'} value={target.value}>
                      {target.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Duplicate Review</h2>
            {analysis.summary.duplicates > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => applyBulkAction('skip')}
                  className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700"
                >
                  Skip all duplicates
                </button>
                <button
                  onClick={() => applyBulkAction('update')}
                  className="text-xs px-3 py-1.5 border border-blue-300 rounded-lg text-blue-700"
                >
                  Update all duplicates
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Total rows</p>
              <p className="text-xl font-bold text-slate-800">{analysis.summary.total}</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">New contacts</p>
              <p className="text-xl font-bold text-emerald-600">{analysis.summary.new}</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Duplicates</p>
              <p className="text-xl font-bold text-amber-600">{analysis.summary.duplicates}</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Invalid rows</p>
              <p className="text-xl font-bold text-red-600">{analysis.summary.invalid}</p>
            </div>
          </div>

          {analysis.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-red-700 mb-1">Validation issues</p>
              <ul className="text-xs text-red-600 space-y-1">
                {analysis.errors.slice(0, 10).map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.conflicts.length === 0 ? (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              No duplicates found. You can proceed with import.
            </p>
          ) : (
            <div className="space-y-3">
              {analysis.conflicts.map((conflict) => {
                const resolution = rowResolutions[conflict.row_number];
                const action = resolution?.action ?? (updateExisting ? 'update' : 'skip');
                const isExpanded = expandedRow === conflict.row_number;

                return (
                  <div
                    key={conflict.row_number}
                    className="border border-slate-200 rounded-lg overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800">
                          Row {conflict.row_number} · matched by {conflict.match_by}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {displayValue(conflict.incoming.email || conflict.incoming.phone)} → existing #
                          {conflict.existing.id}
                        </p>
                      </div>
                      <select
                        value={action}
                        onChange={(e) =>
                          setRowAction(
                            conflict.row_number,
                            e.target.value as DuplicateAction,
                            conflict,
                          )
                        }
                        className="text-sm px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="skip">Skip</option>
                        <option value="update">Update with incoming</option>
                        <option value="merge">Merge field-by-field</option>
                      </select>
                      {action === 'merge' && (
                        <button
                          onClick={() =>
                            setExpandedRow(isExpanded ? null : conflict.row_number)
                          }
                          className="text-xs text-blue-700 underline"
                        >
                          {isExpanded ? 'Hide fields' : 'Choose fields'}
                        </button>
                      )}
                    </div>

                    {action === 'merge' && isExpanded && (
                      <div className="p-3 space-y-2">
                        {(conflict.diff_fields.length > 0
                          ? conflict.diff_fields
                          : Object.keys(conflict.incoming)
                        ).map((field) => (
                          <div
                            key={field}
                            className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center text-sm border border-slate-100 rounded-lg p-2"
                          >
                            <span className="font-medium text-slate-700">
                              {FIELD_LABELS[field] ?? field}
                            </span>
                            <label className="flex items-center gap-2 text-slate-600">
                              <input
                                type="radio"
                                name={`${conflict.row_number}-${field}`}
                                checked={
                                  (resolution?.field_choices?.[field] ?? 'incoming') === 'existing'
                                }
                                onChange={() =>
                                  setFieldChoice(conflict.row_number, field, 'existing')
                                }
                              />
                              Keep: {displayValue(conflict.existing[field])}
                            </label>
                            <label className="flex items-center gap-2 text-slate-600">
                              <input
                                type="radio"
                                name={`${conflict.row_number}-${field}`}
                                checked={
                                  (resolution?.field_choices?.[field] ?? 'incoming') === 'incoming'
                                }
                                onChange={() =>
                                  setFieldChoice(conflict.row_number, field, 'incoming')
                                }
                              />
                              Use: {displayValue(conflict.incoming[field])}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Import Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Created</p>
              <p className="text-xl font-bold text-emerald-600">{result.created}</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Updated</p>
              <p className="text-xl font-bold text-blue-600">{result.updated}</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Merged</p>
              <p className="text-xl font-bold text-indigo-600">{result.merged ?? 0}</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">Skipped</p>
              <p className="text-xl font-bold text-amber-600">{result.skipped}</p>
            </div>
          </div>

          {result.errors?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-red-700">Errors</p>
                <button
                  onClick={handleDownloadErrors}
                  className="inline-flex items-center gap-1 text-xs text-red-700 border border-red-300 bg-white px-2 py-1 rounded"
                >
                  <Download sx={{ fontSize: 14 }} />
                  Download CSV
                </button>
              </div>
              <ul className="text-xs text-red-600 space-y-1">
                {result.errors.slice(0, 20).map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
