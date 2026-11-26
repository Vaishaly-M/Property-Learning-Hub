'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Add,
  Close,
  CloudUpload,
  Delete,
  Description,
  DragIndicator,
  Edit,
  Folder,
  PlayCircle,
  Save,
} from '@mui/icons-material';
import { contentService, CourseModule } from '../../services/contentService';
import { resolveStorageUrl } from '../../utils/mediaUrl';

type ToastFn = (message: string, type?: 'success' | 'error' | 'info') => void;

interface CourseModulesPanelProps {
  courseId: string;
  searchQuery?: string;
  onOpenModule: (module: CourseModule) => void;
  toast: ToastFn;
  onModulesChanged?: () => void;
}

const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

const moduleThumbSrc = (url?: string | null, cacheKey?: string) => {
  const resolved = resolveStorageUrl(url ?? null);
  if (!resolved) return undefined;
  if (!cacheKey) return resolved;
  const separator = resolved.includes('?') ? '&' : '?';
  return `${resolved}${separator}v=${encodeURIComponent(cacheKey)}`;
};

// Modal Component
const ModuleFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  form: { title: string; description: string };
  setForm: React.Dispatch<React.SetStateAction<{ title: string; description: string }>>;
  thumbnailPreview: string | null;
  thumbnailFile: File | null;
  removeThumbnail: boolean;
  onThumbnailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveThumbnail: () => void;
  onClearThumbnail: () => void;
  saving: boolean;
  isEditing: boolean;
}> = ({
  isOpen,
  onClose,
  onSave,
  title,
  form,
  setForm,
  thumbnailPreview,
  thumbnailFile,
  removeThumbnail,
  onThumbnailChange,
  onRemoveThumbnail,
  onClearThumbnail,
  saving,
  isEditing,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 rounded-t-2xl">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100"
          >
            <Close className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Module Title <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Enter module title"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Description <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Enter module description"
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Thumbnail <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-full sm:w-36 h-24 rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0">
                {thumbnailPreview && !removeThumbnail ? (
                  <img src={thumbnailPreview} alt="Module thumbnail preview" className="w-full h-full object-cover" />
                ) : (
                  <Folder className="w-10 h-10 text-slate-300" />
                )}
              </div>
              <div className="flex-1 space-y-2 w-full">
                <label className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-700 bg-white border-2 border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all">
                  <CloudUpload className="w-4 h-4" />
                  {thumbnailFile || thumbnailPreview ? 'Change Image' : 'Upload Image'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                    className="hidden"
                    onChange={onThumbnailChange}
                  />
                </label>
                {(thumbnailFile || (isEditing && thumbnailPreview && !removeThumbnail) || removeThumbnail) && (
                  <button
                    type="button"
                    onClick={onRemoveThumbnail}
                    className="block text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                  >
                    Remove thumbnail
                  </button>
                )}
                <p className="text-xs text-slate-500">JPG, PNG, or WebP · Max 5 MB</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 bg-white border-t border-slate-200 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !form.title.trim()}
            onClick={onSave}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" /> 
            {saving ? 'Saving…' : (isEditing ? 'Update Module' : 'Create Module')}
          </button>
        </div>
      </div>
    </div>
  );
};

const CourseModulesPanel: React.FC<CourseModulesPanelProps> = ({
  courseId,
  searchQuery = '',
  onOpenModule,
  toast,
  onModulesChanged,
}) => {
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [dragModuleId, setDragModuleId] = useState<string | null>(null);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [removeThumbnail, setRemoveThumbnail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failedThumbIds, setFailedThumbIds] = useState<Set<string>>(new Set());

  const clearThumbnailPreview = () => {
    if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailPreview(null);
    setThumbnailFile(null);
  };

  const loadModules = useCallback(async () => {
    setLoading(true);
    const res = await contentService.getCourseModules(courseId);
    if (res.success && res.data) {
      setModules(res.data);
      setFailedThumbIds(new Set());
    } else {
      toast(res.message || 'Failed to load modules', 'error');
    }
    setLoading(false);
  }, [courseId, toast]);

  useEffect(() => {
    void loadModules();
  }, [loadModules]);

  useEffect(() => {
    return () => {
      if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  const resetForm = () => {
    setEditingModule(null);
    setForm({ title: '', description: '' });
    clearThumbnailPreview();
    setRemoveThumbnail(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    setEditingModule(null);
    setForm({ title: '', description: '' });
    clearThumbnailPreview();
    setRemoveThumbnail(false);
    setIsModalOpen(true);
  };

  const openEditModal = (module: CourseModule, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingModule(module);
    setForm({ title: module.title, description: module.description || '' });
    clearThumbnailPreview();
    setRemoveThumbnail(false);
    if (module.thumbnailUrl) {
      setThumbnailPreview(moduleThumbSrc(module.thumbnailUrl, module.updatedAt || module.thumbnailPath || '') || null);
    }
    setIsModalOpen(true);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_THUMBNAIL_BYTES) {
      toast('Thumbnail is too large. Maximum size is 5 MB.', 'error');
      return;
    }
    if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
    setRemoveThumbnail(false);
  };

  const handleRemoveThumbnail = () => {
    clearThumbnailPreview();
    if (editingModule?.thumbnailUrl) {
      setRemoveThumbnail(true);
    }
  };

  const saveModule = async () => {
    if (!form.title.trim()) {
      toast('Module title is required', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      thumbnailImage: thumbnailFile,
      removeThumbnail: editingModule ? removeThumbnail : false,
    };
    const res = editingModule
      ? await contentService.updateCourseModule(courseId, editingModule.id, payload)
      : await contentService.createCourseModule(courseId, payload);
    setSaving(false);
    if (!res.success) {
      toast(res.message || 'Failed to save module', 'error');
      return;
    }
    toast(editingModule ? 'Module updated' : 'Module created', 'success');
    
    // Close modal and reset form
    closeModal();
    
    // Load modules and notify parent - only once
    await loadModules();
    onModulesChanged?.();
  };

  const deleteModule = async (module: CourseModule, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${module.title}"? Its content will move to another module.`)) return;
    const res = await contentService.deleteCourseModule(courseId, module.id);
    if (!res.success) {
      toast(res.message || 'Failed to delete module', 'error');
      return;
    }
    toast(res.message || 'Module deleted', 'success');
    await loadModules();
    onModulesChanged?.();
  };

  const onModuleDrop = async (targetId: string) => {
    if (!reordering || !dragModuleId || dragModuleId === targetId) {
      setDragModuleId(null);
      return;
    }
    const from = modules.findIndex((m) => m.id === dragModuleId);
    const to = modules.findIndex((m) => m.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...modules];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setModules(next.map((m, i) => ({ ...m, order: i + 1 })));
    setDragModuleId(null);
    const res = await contentService.reorderCourseModules(courseId, next.map((m) => m.id));
    if (!res.success) {
      toast(res.message || 'Failed to reorder modules', 'error');
      await loadModules();
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">Loading modules…</div>
    );
  }

  const query = searchQuery.trim().toLowerCase();
  const visibleModules = !query
    ? modules
    : modules.filter((m) => {
        const title = m.title?.toLowerCase() ?? '';
        const description = m.description?.toLowerCase() ?? '';
        return title.includes(query) || description.includes(query);
      });

  return (
    <div className="space-y-4">
      {/* Modal */}
      <ModuleFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={saveModule}
        title={editingModule ? 'Edit Module' : 'Create New Module'}
        form={form}
        setForm={setForm}
        thumbnailPreview={thumbnailPreview}
        thumbnailFile={thumbnailFile}
        removeThumbnail={removeThumbnail}
        onThumbnailChange={handleThumbnailChange}
        onRemoveThumbnail={handleRemoveThumbnail}
        onClearThumbnail={clearThumbnailPreview}
        saving={saving}
        isEditing={!!editingModule}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">Modules</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Open a module to upload videos and PDFs. Optional thumbnails help identify each module.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setReordering((v) => !v)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              reordering
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
            }`}
          >
            {reordering ? 'Done Reordering' : 'Reorder'}
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"
          >
            <Add className="w-4 h-4" /> Add Module
          </button>
        </div>
      </div>

      {modules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <Folder className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 mb-4">No modules yet. Create the first module for this course.</p>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
          >
            <Add className="w-4 h-4" /> Add Module
          </button>
        </div>
      ) : visibleModules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm text-slate-500">No modules match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleModules.map((module) => {
            const videoCount = module.videoCount ?? 0;
            const documentCount = module.documentCount ?? 0;
            const totalCount = module.contentCount ?? videoCount + documentCount;
            const thumb = moduleThumbSrc(
              module.thumbnailUrl,
              module.updatedAt || module.thumbnailPath || ''
            );
            const showThumb = Boolean(thumb) && !failedThumbIds.has(module.id);

            return (
              <div
                key={module.id}
                draggable={reordering}
                onDragStart={() => setDragModuleId(module.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => void onModuleDrop(module.id)}
                onClick={() => {
                  if (!reordering) onOpenModule(module);
                }}
                className={`rounded-xl border bg-white overflow-hidden transition-all ${
                  reordering
                    ? 'border-blue-300 cursor-grab active:cursor-grabbing'
                    : 'border-slate-200 hover:shadow-md hover:border-blue-300 cursor-pointer'
                }`}
              >
                {reordering && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-100 text-xs font-semibold text-blue-700">
                    <DragIndicator className="w-4 h-4" />
                    Drag to reorder · #{module.order}
                  </div>
                )}

                <div className="relative h-32 bg-slate-100">
                  {showThumb ? (
                    <img
                      src={thumb}
                      alt={module.title}
                      className="w-full h-full object-cover"
                      onError={() => setFailedThumbIds((prev) => new Set(prev).add(module.id))}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)' }}
                    >
                      <Folder className="w-10 h-10 text-white/80" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent flex items-end">
                    <div className="p-3 text-white w-full">
                      <div className="text-[11px] font-semibold opacity-90 mb-0.5">Module {module.order}</div>
                      <h4 className="font-bold text-sm truncate">{module.title}</h4>
                    </div>
                  </div>
                  {!reordering && (
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        type="button"
                        onClick={(e) => openEditModal(module, e)}
                        className="p-1.5 rounded-lg bg-white/95 text-slate-700 hover:bg-white shadow-sm"
                        title="Edit module"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => void deleteModule(module, e)}
                        className="p-1.5 rounded-lg bg-white/95 text-red-600 hover:bg-white shadow-sm"
                        title="Delete module"
                      >
                        <Delete className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {module.description ? (
                    <p className="text-xs text-slate-500 line-clamp-2">{module.description}</p>
                  ) : (
                    <p className="text-xs text-slate-400">No description</p>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-slate-50 px-2 py-2 text-center">
                      <div className="text-sm font-bold text-slate-800">{totalCount}</div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">Total</div>
                    </div>
                    <div className="rounded-lg bg-blue-50 px-2 py-2 text-center">
                      <div className="text-sm font-bold text-blue-700 flex items-center justify-center gap-0.5">
                        <PlayCircle className="w-3.5 h-3.5" />
                        {videoCount}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-blue-600">Videos</div>
                    </div>
                    <div className="rounded-lg bg-amber-50 px-2 py-2 text-center">
                      <div className="text-sm font-bold text-amber-700 flex items-center justify-center gap-0.5">
                        <Description className="w-3.5 h-3.5" />
                        {documentCount}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-amber-700">PDFs</div>
                    </div>
                  </div>

                  {!reordering && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenModule(module);
                      }}
                      className="w-full px-3 py-2 text-sm font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Open Module Content
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CourseModulesPanel;