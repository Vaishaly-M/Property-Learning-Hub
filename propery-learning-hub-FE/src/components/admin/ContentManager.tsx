'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search,
  Add,
  Edit,
  Delete,
  Download,
  Category,
  Description,
  Close,
  PlayArrow,
  CloudUpload,
  Folder,
  VideoLibrary,
  InsertDriveFile,
  Collections,
  PlaylistAdd,
  DragIndicator,
  Reorder,
  Lock,
  LockOpen,
  People,
  RemoveRedEye,
  KeyboardArrowUp,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { contentService, type ContentItem, type ContentCategory, type CourseModule } from '../../services/contentService';
import CourseModulesPanel from './CourseModulesPanel';
import CourseProgressTracker from './CourseProgressTracker';
import {
  appendMediaToFormData,
  getMediaUploadConfig,
  getMaxBytesForType,
  MEDIA_UPLOAD_PRESETS,
  type MediaUploadConfig,
} from '../../services/mediaUploadService';
import { resolveStorageUrl } from '../../utils/mediaUrl';
import { toast } from 'react-toastify';
import { ConfirmDialog } from '../ui/AppDialog';

interface ContentManagerProps {
  activeTab?: 'videos' | 'documents';
}

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  thumbnailPath?: string | null;
  order?: number;
  moduleCount?: number;
  createdAt: string;
  updatedAt: string;
  contentCount: number;
  videoCount?: number;
  documentCount?: number;
  enrollmentCount?: number;
}

interface VideoDocumentItem extends Omit<ContentItem, 'duration'> {
  courseId?: string;
  order?: number;
  thumbnailImage?: File | null;
  duration?: string;
}

interface PendingContentOpen {
  id: string;
  courseId?: string | null;
  type: 'video' | 'document';
  view?: boolean;
}

const ADMIN_OPEN_CONTENT_KEY = 'admin_open_content';

const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024; // 5 MB fallback

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const courseThumbSrc = (url?: string | null, cacheKey?: string) => {
  const resolved = resolveStorageUrl(url ?? null);
  if (!resolved) return undefined;
  if (!cacheKey) return resolved;
  const separator = resolved.includes('?') ? '&' : '?';
  return `${resolved}${separator}v=${encodeURIComponent(cacheKey)}`;
};

const courseThumbCacheKey = (
  course: { id: string | number; updatedAt?: string; thumbnailPath?: string | null },
  thumbCacheBust: Record<string, string>
) => thumbCacheBust[String(course.id)] || course.thumbnailPath || course.updatedAt || '';

const sameId = (a: string | number | null | undefined, b: string | number | null | undefined) =>
  String(a ?? '') === String(b ?? '');

const ContentManager: React.FC<ContentManagerProps> = ({ activeTab = 'videos' }) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'videos' | 'documents'>(activeTab);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSort, setSelectedSort] = useState('created_at');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showAddToCourseModal, setShowAddToCourseModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [courseSectionTab, setCourseSectionTab] = useState<'modules' | 'progress'>('modules');
  const [editingItem, setEditingItem] = useState<VideoDocumentItem | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [content, setContent] = useState<VideoDocumentItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isReorderingCourses, setIsReorderingCourses] = useState(false);
  const [dragCourseId, setDragCourseId] = useState<string | null>(null);
  const [isSavingCourseOrder, setIsSavingCourseOrder] = useState(false);
  const [draggedLesson, setDraggedLesson] = useState<VideoDocumentItem | null>(null);
  const orderSaveRef = useRef<Promise<void> | null>(null);
  const [failedThumbnailIds, setFailedThumbnailIds] = useState<Set<string>>(new Set());
  const [thumbCacheBust, setThumbCacheBust] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({
    total: 0,
    videos: 0,
    documents: 0,
    published: 0,
    totalViewsDownloads: 0,
    courses: 0,
  });
  const [platformContentStats, setPlatformContentStats] = useState({
    videos: 0,
    documents: 0,
    total: 0,
  });
  const [pendingContentOpen, setPendingContentOpen] = useState<PendingContentOpen | null>(null);
  const pendingContentOpenHandled = useRef(false);

  const [newContent, setNewContent] = useState({
    title: '',
    description: '',
    category_id: '',
    course_id: '',
    module_id: '',
    content_type: 'video' as 'video' | 'document' | 'image',
    published: true,
    file: null as File | null,
    thumbnailImage: null as File | null,
    duration: '',
  });

  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    thumbnailImage: null as File | null,
  });
  const [courseThumbPreview, setCourseThumbPreview] = useState<string | null>(null);
  const [uploadConfig, setUploadConfig] = useState<MediaUploadConfig | null>(null);
  const maxVideoBytes = getMaxBytesForType(uploadConfig, 'video');
  const maxDocumentBytes = getMaxBytesForType(uploadConfig, 'document');
  const maxFileBytes = selectedTab === 'videos' ? maxVideoBytes : maxDocumentBytes;
  const maxFileSizeLabel = formatFileSize(maxFileBytes);
  const directUploadEnabled = Boolean(uploadConfig?.direct_upload_enabled);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingContentId, setPendingContentId] = useState<string | null>(null);
  const [pendingContentView, setPendingContentView] = useState(false);
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);
  const [deleteCourseTarget, setDeleteCourseTarget] = useState<Course | null>(null);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);

  const orderedCourses = useMemo(() => {
    return [...courses].sort((a, b) => {
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return Number(a.id) - Number(b.id);
    });
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query || isReorderingCourses) return orderedCourses;
    return orderedCourses.filter((course) => {
      const title = course.title?.toLowerCase() ?? '';
      const description = course.description?.toLowerCase() ?? '';
      return title.includes(query) || description.includes(query);
    });
  }, [orderedCourses, searchQuery, isReorderingCourses]);

  const persistCourseOrder = async (next: Course[]) => {
    const withOrder = next.map((course, index) => ({ ...course, order: index + 1 }));
    setCourses(withOrder);
    setIsSavingCourseOrder(true);
    const res = await contentService.reorderCourses(withOrder.map((c) => c.id));
    setIsSavingCourseOrder(false);
    if (!res.success) {
      toast.error(res.message || 'Failed to reorder courses');
      await fetchCourses();
      return false;
    }
    toast.success('Courses reordered');
    return true;
  };

  const moveCourse = async (courseId: string, direction: 'up' | 'down') => {
    if (!isReorderingCourses || isSavingCourseOrder) return;
    const list = [...orderedCourses];
    const from = list.findIndex((c) => sameId(c.id, courseId));
    if (from < 0) return;
    const to = direction === 'up' ? from - 1 : from + 1;
    if (to < 0 || to >= list.length) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    await persistCourseOrder(list);
  };

  const onCourseDrop = async (targetId: string) => {
    if (!isReorderingCourses || !dragCourseId || dragCourseId === targetId || isSavingCourseOrder) {
      setDragCourseId(null);
      return;
    }
    const list = [...orderedCourses];
    const from = list.findIndex((c) => sameId(c.id, dragCourseId));
    const to = list.findIndex((c) => sameId(c.id, targetId));
    if (from < 0 || to < 0) {
      setDragCourseId(null);
      return;
    }

    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    setDragCourseId(null);
    await persistCourseOrder(list);
  };

  const toggleCourseReordering = () => {
    setIsReorderingCourses((v) => {
      const next = !v;
      if (next) {
        setSearchQuery('');
        setDebouncedSearchQuery('');
        setDragCourseId(null);
      }
      return next;
    });
  };

  const sortOptions = [
    { value: 'created_at', label: 'Sort by Date' },
    { value: 'title', label: 'Sort by Title' },
    { value: 'views', label: 'Sort by Views' },
    { value: 'downloads', label: 'Sort by Downloads' },
    { value: 'order', label: 'Sort by Order' },
  ];

  const getContentSortOrder = (sort: string): 'asc' | 'desc' =>
    sort === 'order' || sort === 'title' ? 'asc' : 'desc';

  const fetchContent = useCallback(async (options?: { forReorder?: boolean }) => {
    setIsLoading(true);
    try {
      const forReorder = options?.forReorder ?? false;
      const sortField = forReorder ? 'order' : selectedSort;

      const params = {
        type: selectedTab === 'videos' ? 'video' as const : 'document' as const,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: debouncedSearchQuery || undefined,
        sort: selectedModule ? 'order' : selectedSort,
        order: selectedModule ? 'asc' as const : 'desc' as const,
        course_id: selectedCourse?.id,
        module_id: selectedModule?.id,
      };

      console.log('Fetching content with params:', params);
      
      const response = await contentService.getContent(params);
      
      console.log('API Response:', response);
      
      if (response.success && response.data) {
        const contentData = Array.isArray(response.data) ? response.data : [];
        console.log('Setting content:', contentData);
        setFailedThumbnailIds(new Set());
        setContent(contentData);
        
        if (response.meta?.stats) {
          setStats({
            total: response.meta.stats.total || 0,
            videos: response.meta.stats.videos || 0,
            documents: response.meta.stats.documents || 0,
            published: response.meta.stats.published || 0,
            totalViewsDownloads: selectedTab === 'videos' 
              ? response.meta.stats.views || 0
              : response.meta.stats.downloads || 0,
            courses: response.meta.stats.courses || 0,
          });
        }
      } else {
        console.log('No data in response or success is false');
        setContent([]);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Failed to load content');
      setContent([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTab, selectedCategory, selectedSort, debouncedSearchQuery, selectedCourse, selectedModule]);

  const fetchCourses = async () => {
    try {
      const response = await contentService.getCourses({ sort: 'order', order: 'asc' });
      console.log('Courses response:', response);
      if (response.success && response.data) {
        const coursesData = Array.isArray(response.data) ? response.data : [];
        setCourses(coursesData);
        if (response.meta?.content_stats) {
          setPlatformContentStats({
            videos: response.meta.content_stats.videos || 0,
            documents: response.meta.content_stats.documents || 0,
            total: response.meta.content_stats.total || 0,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await contentService.getCategories();
      console.log('Categories response:', response);
      if (response.success && response.data) {
        const categoriesData = Array.isArray(response.data) ? response.data : [];
        setCategories(categoriesData);
        
        if (categoriesData.length > 0 && !newContent.category_id) {
          setNewContent(prev => ({ 
            ...prev, 
            category_id: String(categoriesData[0].id) 
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  useEffect(() => {
    getMediaUploadConfig().then(setUploadConfig).catch(() => setUploadConfig(null));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchCourses();
    fetchCategories();

    const raw = sessionStorage.getItem(ADMIN_OPEN_CONTENT_KEY);
    if (!raw) return;

    try {
      const payload = JSON.parse(raw) as PendingContentOpen;
      sessionStorage.removeItem(ADMIN_OPEN_CONTENT_KEY);
      pendingContentOpenHandled.current = false;
      setPendingContentOpen(payload);
      setSelectedTab(payload.type === 'video' ? 'videos' : 'documents');
    } catch {
      sessionStorage.removeItem(ADMIN_OPEN_CONTENT_KEY);
    }
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    const refreshed = courses.find((course) => sameId(course.id, selectedCourse.id));
    if (refreshed) {
      setSelectedCourse((prev) => (prev ? { ...prev, ...refreshed } : refreshed));
    }
  }, [courses, selectedCourse?.id]);

  useEffect(() => {
    if (!pendingContentOpen?.courseId || courses.length === 0) return;
    if (selectedCourse && sameId(selectedCourse.id, pendingContentOpen.courseId)) return;

    const course = courses.find((c) => sameId(c.id, pendingContentOpen.courseId));
    if (!course) return;

    setSelectedCourse(course);
    setSelectedSort('order');
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSelectedCategory('all');
  }, [pendingContentOpen, courses, selectedCourse]);

  useEffect(() => {
    if (deepLinkHandled || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('courseId');
    const contentId = params.get('contentId');
    const tab = params.get('tab');
    const shouldView = params.get('view') === '1';

    if (tab === 'documents' || tab === 'videos') {
      setSelectedTab(tab);
    }
    if (contentId) {
      setPendingContentId(contentId);
      setPendingContentView(shouldView);
    }
    if (!courseId && !contentId) {
      setDeepLinkHandled(true);
      return;
    }

    const selectCourse = (id: string) => {
      const course = courses.find((c) => sameId(c.id, id));
      if (course) {
        setSelectedCourse(course);
        setSelectedSort('order');
      }
    };

    if (courseId && courses.length > 0) {
      selectCourse(courseId);
      return;
    }

    if (contentId && courses.length > 0) {
      void contentService.getContentById(contentId).then((response) => {
        if (!response.success || !response.data) return;
        const resolvedCourseId = response.data.course_id;
        if (resolvedCourseId) {
          selectCourse(String(resolvedCourseId));
        }
        if (response.data.type === 'document') {
          setSelectedTab('documents');
        } else if (response.data.type === 'video') {
          setSelectedTab('videos');
        }
      });
    }
  }, [courses, deepLinkHandled]);

  useEffect(() => {
    if (!pendingContentId || content.length === 0) return;

    const item = content.find((entry) => sameId(entry.id, pendingContentId));
    if (!item) return;

    if (pendingContentView) {
      void (async () => {
        try {
          const fileName = item.fileName || item.title;
          const isVideo = item.type === 'video' || selectedTab === 'videos';

          if (isVideo) {
            let fileUrl = resolveStorageUrl(item.fileUrl) ?? item.fileUrl;
            if (!fileUrl) {
              const fileResponse = await contentService.getFile(item.id);
              if (fileResponse.success && fileResponse.data?.url) {
                fileUrl = fileResponse.data.url;
              }
            }
            if (!fileUrl) {
              toast.error('File URL not available');
              return;
            }
            window.open(fileUrl, '_blank', 'noopener,noreferrer');
            await contentService.incrementViews(item.id);
          } else {
            await contentService.downloadFile(item.id, fileName);
            await contentService.incrementDownloads(item.id);
          }
          await fetchContent();
        } catch (error: any) {
          console.error(error);
          toast.error(error?.message || 'Failed to open file');
        }
      })();
    } else {
      setEditingItem(item);
      const categoryId = item.category_id
        ? String(item.category_id)
        : categories.length > 0
          ? String(categories[0].id)
          : '';

      setNewContent({
        title: item.title || '',
        description: item.description || '',
        category_id: categoryId,
        course_id: String(item.course_id ?? item.courseId ?? selectedCourse?.id ?? ''),
        module_id: String(item.module_id ?? item.moduleId ?? ''),
        content_type: (item.type as 'video' | 'document' | 'image') || 'video',
        published: Boolean(item.published),
        file: null,
        thumbnailImage: null,
        duration: item.duration || '',
      });
      setShowAddModal(true);
    }

    setPendingContentId(null);
    setPendingContentView(false);
    setDeepLinkHandled(true);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('contentId');
      url.searchParams.delete('courseId');
      url.searchParams.delete('tab');
      url.searchParams.delete('view');
      window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    }
  }, [pendingContentId, pendingContentView, content, categories, selectedCourse?.id]);

  useEffect(() => {
    if (selectedCourse && selectedModule) {
      fetchContent(isReordering ? { forReorder: true } : undefined);
    } else if (!selectedModule) {
      setContent([]);
    }
  }, [fetchContent, selectedCourse, selectedModule, isReordering]);

  useEffect(() => {
    if (selectedModule) {
      setSelectedSort('order');
    }
  }, [selectedModule?.id]);

  // Lesson reordering handlers
  const handleDragStart = (e: React.DragEvent, lesson: VideoDocumentItem) => {
    if (!isReordering || isSavingOrder) {
      e.preventDefault();
      return;
    }
    setDraggedLesson(lesson);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isReordering) return;
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetLesson: VideoDocumentItem) => {
    e.preventDefault();
    if (!draggedLesson || !selectedCourse || !selectedModule || !isReordering || isSavingOrder) return;

    const reorderedContent = [...content];
    const draggedIndex = reorderedContent.findIndex((l) => sameId(l.id, draggedLesson.id));
    const targetIndex = reorderedContent.findIndex((l) => sameId(l.id, targetLesson.id));

    if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) {
      setDraggedLesson(null);
      return;
    }

    const [removed] = reorderedContent.splice(draggedIndex, 1);
    reorderedContent.splice(targetIndex, 0, removed);

    setContent(reorderedContent);
    setIsSavingOrder(true);

    const savePromise = (async () => {
      try {
        const lessonIds = reorderedContent.map((l) => Number(l.id));
        const response = await contentService.reorderModuleContents(
          selectedCourse.id,
          selectedModule.id,
          lessonIds
        );
        if (!response.success) {
          throw new Error(response.message || 'Failed to save lesson order');
        }
        toast.success('Content reordered successfully');
        await fetchContent({ forReorder: true });
      } catch (error: any) {
        console.error('Error reordering lessons:', error);
        toast.error(error?.message || 'Failed to save lesson order');
        await fetchContent({ forReorder: true });
      } finally {
        setIsSavingOrder(false);
        orderSaveRef.current = null;
      }
    })();

    orderSaveRef.current = savePromise;
    await savePromise;
    setDraggedLesson(null);
  };

  const toggleReordering = async () => {
    if (isReordering) {
      if (orderSaveRef.current) {
        await orderSaveRef.current;
      }
      setSelectedSort('order');
      setIsReordering(false);
      return;
    }

    setSelectedSort('order');
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSelectedCategory('all');
    setIsReordering(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setNewContent(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleCourseInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCourse(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const maxBytes = getMaxBytesForType(
        uploadConfig,
        selectedTab === 'videos' ? 'video' : 'document'
      );
      if (file.size > maxBytes) {
        toast.error(
          `File is too large (${formatFileSize(file.size)}). Maximum size is ${formatFileSize(maxBytes)}.`
        );
        e.target.value = '';
        return;
      }
      setNewContent(prev => ({
        ...prev,
        file,
      }));
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_THUMBNAIL_BYTES) {
        toast.error(`Thumbnail is too large (${formatFileSize(file.size)}). Maximum size is 5 MB.`);
        e.target.value = '';
        return;
      }
      setNewContent(prev => ({
        ...prev,
        thumbnailImage: file,
      }));
    }
  };

  const handleCourseThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_THUMBNAIL_BYTES) {
        toast.error(`Thumbnail is too large (${formatFileSize(file.size)}). Maximum size is 5 MB.`);
        e.target.value = '';
        return;
      }
      setNewCourse(prev => ({
        ...prev,
        thumbnailImage: file,
      }));
      setCourseThumbPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!newContent.description.trim()) {
      toast.error('Description is required');
      return;
    }
    if (!newContent.category_id) {
      toast.error('Please select a category');
      return;
    }
    if (!newContent.file && !editingItem) {
      toast.error('Please select a file to upload');
      return;
    }
    if (newContent.file) {
      const maxBytes = selectedTab === 'videos' ? maxVideoBytes : maxDocumentBytes;
      if (newContent.file.size > maxBytes) {
        toast.error(
          `File is too large (${formatFileSize(newContent.file.size)}). Maximum size is ${formatFileSize(maxBytes)}.`
        );
        return;
      }
    }
    if (newContent.thumbnailImage && newContent.thumbnailImage.size > MAX_THUMBNAIL_BYTES) {
      toast.error(`Thumbnail is too large (${formatFileSize(newContent.thumbnailImage.size)}). Maximum size is 5 MB.`);
      return;
    }
    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('title', newContent.title.trim());
      formData.append('description', newContent.description.trim());
      formData.append('category_id', newContent.category_id);
      formData.append('type', editingItem?.type ?? newContent.content_type ?? (selectedTab === 'videos' ? 'video' : 'document'));
      formData.append('published', newContent.published ? '1' : '0');
      
      const courseIdForSubmit =
        newContent.course_id ||
        editingItem?.course_id ||
        editingItem?.courseId ||
        selectedCourse?.id;
      if (courseIdForSubmit) {
        formData.append('course_id', String(courseIdForSubmit));
      }
      const moduleIdForSubmit = newContent.module_id || editingItem?.module_id || editingItem?.moduleId;
      if (moduleIdForSubmit) {
        formData.append('module_id', String(moduleIdForSubmit));
      }
      
      if (newContent.duration) {
        formData.append('duration', newContent.duration);
      }

      const contentFileType = selectedTab === 'videos' ? 'video' : 'document';

      if (newContent.file) {
        const preset =
          contentFileType === 'video'
            ? MEDIA_UPLOAD_PRESETS.contentVideo
            : MEDIA_UPLOAD_PRESETS.contentDocument;
        await appendMediaToFormData(formData, newContent.file, {
          ...preset,
          onProgress: setUploadProgress,
        });
      }

      if (newContent.thumbnailImage) {
        await appendMediaToFormData(formData, newContent.thumbnailImage, {
          ...MEDIA_UPLOAD_PRESETS.contentThumbnail,
          onProgress: setUploadProgress,
        });
      }

      console.log('Submitting form data for:', editingItem ? 'UPDATE' : 'CREATE');
      console.log('Editing item ID:', editingItem?.id);

      let response;
      if (editingItem) {
        response = await contentService.updateContent(editingItem.id, formData);
      } else {
        response = await contentService.createContent(formData);
      }

      console.log('Submit response:', response);

        if (response.success) {
        toast.success(response.message || `${selectedTab === 'videos' ? 'Video' : 'Document'} ${editingItem ? 'updated' : 'added'} successfully!`);
        
        // Reset form
        setNewContent({
          title: '',
          description: '',
          category_id: categories.length > 0 ? String(categories[0].id) : '',
          course_id: '',
          module_id: '',
          content_type: 'video',
          published: true,
          file: null,
          thumbnailImage: null,
          duration: '',
        });
        
        setShowAddModal(false);
        setShowAddToCourseModal(false);
        setEditingItem(null);
        
        fetchContent();
        fetchCourses();
        
      } else if (response.errors) {
        const errorMessages = Object.values(response.errors).flat().join(', ');
        toast.error(errorMessages || 'Validation failed');
      } else {
        toast.error(response.message || 'Failed to save content. Please try again.');
      }
    } catch (error: any) {
      console.error('Error saving content:', error);
      toast.error(error.message || 'Failed to save content');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCourse.title.trim()) {
      toast.error('Course title is required');
      return;
    }

    if (newCourse.thumbnailImage && newCourse.thumbnailImage.size > MAX_THUMBNAIL_BYTES) {
      toast.error(`Thumbnail is too large (${formatFileSize(newCourse.thumbnailImage.size)}). Maximum size is 5 MB.`);
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('title', newCourse.title.trim());
      formData.append('description', newCourse.description.trim());
      
      if (newCourse.thumbnailImage) {
        formData.append('thumbnail_image', newCourse.thumbnailImage);
      }

      console.log('Submitting course data for:', editingCourse ? 'UPDATE' : 'CREATE');

      let response;
      if (editingCourse) {
        response = await contentService.updateCourse(editingCourse.id, formData);
      } else {
        response = await contentService.createCourse(formData);
      }

      console.log('Course submit response:', response);

      if (response.success) {
        toast.success(response.message || `Course ${editingCourse ? 'updated' : 'created'} successfully!`);

        if (response.data) {
          const updatedCourse = {
            ...(response.data as Course),
            id: String((response.data as Course).id),
          };
          setCourses((prev) =>
            prev.map((course) =>
              sameId(course.id, updatedCourse.id) ? { ...course, ...updatedCourse } : course
            )
          );
          if (selectedCourse && sameId(selectedCourse.id, updatedCourse.id)) {
            setSelectedCourse((prev) => (prev ? { ...prev, ...updatedCourse } : updatedCourse));
          }
          setFailedThumbnailIds((prev) => {
            const next = new Set(prev);
            next.delete(`course-${updatedCourse.id}`);
            return next;
          });
          setThumbCacheBust((prev) => ({
            ...prev,
            [updatedCourse.id]: String(Date.now()),
          }));
        }

        // Reset form
        setNewCourse({
          title: '',
          description: '',
          thumbnailImage: null,
        });
        if (courseThumbPreview) {
          URL.revokeObjectURL(courseThumbPreview);
        }
        setCourseThumbPreview(null);

        setShowCourseModal(false);
        setEditingCourse(null);

        await fetchCourses();
        
      } else if (response.errors) {
        const errorMessages = Object.values(response.errors).flat().join(', ');
        toast.error(errorMessages || 'Validation failed');
      } else {
        toast.error(response.message || 'Failed to save course. Please try again.');
      }
    } catch (error: any) {
      console.error('Error saving course:', error);
      toast.error(error.message || 'Failed to save course');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = (item: VideoDocumentItem) => {
    console.log('Editing item:', item);
    
    setEditingItem(item);
    
    // Safely handle category_id - ensure it's a string
    const categoryId = item.category_id 
      ? String(item.category_id) 
      : categories.length > 0 
        ? String(categories[0].id) 
        : '';
    
    setNewContent({
      title: item.title || '',
      description: item.description || '',
      category_id: categoryId,
      course_id: String(item.course_id ?? item.courseId ?? selectedCourse?.id ?? ''),
      module_id: String(item.module_id ?? item.moduleId ?? ''),
      content_type: (item.type as 'video' | 'document' | 'image') || 'video',
      published: Boolean(item.published),
      file: null,
      thumbnailImage: null,
      duration: item.duration || '',
    });
    
    setShowAddModal(true);
  };

  useEffect(() => {
    if (!pendingContentOpen || pendingContentOpenHandled.current) return;

    const openContentItem = async (item: VideoDocumentItem) => {
      pendingContentOpenHandled.current = true;
      const shouldView = pendingContentOpen?.view;
      const contentType = pendingContentOpen?.type;
      setPendingContentOpen(null);

      if (shouldView) {
        const isVideo = item.type === 'video' || contentType === 'video';
        try {
          const fileName = item.fileName || item.title;
          if (isVideo) {
            let fileUrl = resolveStorageUrl(item.fileUrl) ?? item.fileUrl;
            if (!fileUrl) {
              const fileResponse = await contentService.getFile(item.id);
              if (fileResponse.success && fileResponse.data?.url) {
                fileUrl = fileResponse.data.url;
              }
            }
            if (!fileUrl) {
              toast.error('File URL not available');
              return;
            }
            window.open(fileUrl, '_blank', 'noopener,noreferrer');
            await contentService.incrementViews(item.id);
          } else {
            await contentService.downloadFile(item.id, fileName);
            await contentService.incrementDownloads(item.id);
          }
          await fetchContent();
        } catch (error: any) {
          toast.error(error?.message || 'Failed to open content');
        }
        return;
      }

      handleEdit(item);
    };

    const matched = content.find((item) => String(item.id) === String(pendingContentOpen.id));
    if (matched) {
      void openContentItem(matched);
      return;
    }

    if (isLoading) return;
    if (pendingContentOpen.courseId && !selectedCourse) return;

    let cancelled = false;

    (async () => {
      const response = await contentService.getContentById(pendingContentOpen.id);
      if (cancelled || pendingContentOpenHandled.current) return;

      if (response.success && response.data) {
        await openContentItem(response.data as VideoDocumentItem);
        return;
      }

      toast.error(response.message || 'Could not open selected content');
      setPendingContentOpen(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingContentOpen, content, isLoading, selectedCourse]);

  const handleEditCourse = (course: Course) => {
    if (courseThumbPreview) {
      URL.revokeObjectURL(courseThumbPreview);
    }
    setCourseThumbPreview(null);
    setEditingCourse(course);
    setNewCourse({
      title: course.title,
      description: course.description,
      thumbnailImage: null,
    });
    setShowCourseModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const response = await contentService.deleteContent(String(id));
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete content. Please try again.');
      }

      setContent((prev) => prev.filter((item) => !sameId(item.id, id)));
      toast.success(response.message || 'Content deleted successfully!');
      await fetchContent();
      if (selectedCourse) {
        await fetchCourses();
      }
    } catch (error: any) {
      console.error('Error deleting content:', error);
      toast.error(error?.message || 'Failed to delete content');
    }
  };

  const handleDeleteCourse = (course: Course) => {
    setDeleteCourseTarget(course);
  };

  const confirmDeleteCourse = async () => {
    if (!deleteCourseTarget || isDeletingCourse) return;
    const id = deleteCourseTarget.id;
    setIsDeletingCourse(true);
    try {
      const response = await contentService.deleteCourse(id);
      if (response.success) {
        toast.success(response.message || 'Course deleted successfully!');
        setDeleteCourseTarget(null);
        fetchCourses();
        if (selectedCourse && sameId(selectedCourse.id, id)) {
          setSelectedCourse(null);
          setSelectedTab('videos');
          setSelectedCategory('all');
          setSearchQuery('');
        }
      } else if (response.message) {
        toast.error(response.message);
      }
    } catch (error: any) {
      console.error('Error deleting course:', error);
      toast.error(error.message || 'Failed to delete course');
    } finally {
      setIsDeletingCourse(false);
    }
  };

  const handlePublishToggle = async (id: string) => {
    try {
      const response = await contentService.togglePublish(id);
      if (response.success) {
        toast.success(response.message || 'Publish status updated!');
        await fetchContent();
        if (selectedCourse) {
          await fetchCourses();
        }
      } else if (response.message) {
        toast.error(response.message);
      }
    } catch (error: any) {
      console.error('Error toggling publish status:', error);
      toast.error(error.message || 'Failed to update publish status');
    }
  };

  const handleView = async (item: VideoDocumentItem) => {
    try {
      const fileName = item.fileName || item.title;

      if (selectedTab === 'videos') {
        let fileUrl = resolveStorageUrl(item.fileUrl) ?? item.fileUrl;

        if (!fileUrl) {
          const fileResponse = await contentService.getFile(item.id);
          if (fileResponse.success && fileResponse.data?.url) {
            fileUrl = fileResponse.data.url;
          }
        }

        if (!fileUrl) {
          toast.error('File URL not available');
          return;
        }

        window.open(fileUrl, '_blank', 'noopener,noreferrer');
        await contentService.incrementViews(item.id);
      } else {
        await contentService.downloadFile(item.id, fileName);
        await contentService.incrementDownloads(item.id);
      }

      fetchContent();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to open file');
    }
  };

  const handleAddToCourse = (course: Course, moduleId?: string, contentType: 'video' | 'document' | 'image' = 'video') => {
    const resolvedModuleId = moduleId || selectedModule?.id || '';
    if (!resolvedModuleId) {
      toast.error('Open a module first, then upload video or PDF content.');
      return;
    }
    setSelectedCourse(course);
    setCourseSectionTab('modules');
    setSelectedTab(contentType === 'video' ? 'videos' : 'documents');
    setNewContent({
      title: '',
      description: '',
      category_id: categories.length > 0 ? String(categories[0].id) : '',
      course_id: course.id,
      module_id: resolvedModuleId,
      content_type: contentType,
      published: true,
      file: null,
      thumbnailImage: null,
      duration: '',
    });
    setShowAddToCourseModal(true);
  };

  const handleOpenModule = (module: CourseModule) => {
    setSelectedModule(module);
    setCourseSectionTab('modules');
    setSelectedTab('videos');
    setSelectedCategory('all');
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSelectedSort('order');
    setIsReordering(false);
  };

  const handleBackToModules = () => {
    setSelectedModule(null);
    setCourseSectionTab('modules');
    setSelectedTab('videos');
    setSelectedCategory('all');
    setSearchQuery('');
    setIsReordering(false);
    setContent([]);
    fetchCourses();
  };

  const handleCancel = () => {
    setNewContent({
      title: '',
      description: '',
      category_id: categories.length > 0 ? String(categories[0].id) : '',
      course_id: '',
      module_id: '',
      content_type: 'video',
      published: true,
      file: null,
      thumbnailImage: null,
      duration: '',
    });
    setShowAddModal(false);
    setShowAddToCourseModal(false);
    setEditingItem(null);
  };

  const handleCourseCancel = () => {
    setNewCourse({
      title: '',
      description: '',
      thumbnailImage: null,
    });
    if (courseThumbPreview) {
      URL.revokeObjectURL(courseThumbPreview);
    }
    setCourseThumbPreview(null);
    setShowCourseModal(false);
    setEditingCourse(null);
  };

  const getCategoryName = (categoryId: string | number) => {
    const category = categories.find(cat => cat.id === categoryId || cat.id === Number(categoryId));
    return category?.name || 'Unknown Category';
  };

  const getCourseName = (courseId: string) => {
    const course = courses.find((c) => sameId(c.id, courseId));
    return course?.title || 'Uncategorized';
  };

  const courseTabTotal =
    debouncedSearchQuery || selectedCategory !== 'all'
      ? (selectedTab === 'videos' ? stats.videos : stats.documents)
      : content.length;

  const handleBackToCourses = () => {
    setSelectedCourse(null);
    setSelectedModule(null);
    setCourseSectionTab('modules');
    setSelectedTab('videos');
    setSelectedCategory('all');
    setSelectedSort('created_at');
    setSearchQuery('');
    setIsReordering(false);
    setIsReorderingCourses(false);
    setDragCourseId(null);
    setContent([]);
    fetchCourses();
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-visible">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-2 w-full min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">
              {!selectedCourse
                ? 'Course Management'
                : selectedModule
                  ? selectedModule.title
                  : selectedCourse.title}
            </h2>
            {selectedCourse && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-slate-500">
                <button
                  type="button"
                  onClick={handleBackToCourses}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Courses
                </button>
                <span>/</span>
                {selectedModule ? (
                  <>
                    <button
                      type="button"
                      onClick={handleBackToModules}
                      className="text-blue-600 hover:text-blue-800 font-medium truncate max-w-[160px]"
                    >
                      {selectedCourse.title}
                    </button>
                    <span>/</span>
                    <span className="text-slate-700 font-medium truncate max-w-[180px]">{selectedModule.title}</span>
                  </>
                ) : (
                  <span className="text-slate-700 font-medium truncate max-w-[220px]">{selectedCourse.title}</span>
                )}
              </div>
            )}

            {selectedCourse && selectedModule && (
              <div className="bg-slate-100 rounded-lg p-1 flex gap-1 w-fit flex-wrap mt-1">
                <button
                  onClick={() => setSelectedTab('videos')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-md transition-all whitespace-nowrap ${
                    selectedTab === 'videos'
                      ? 'bg-white text-blue-500 shadow-sm'
                      : 'bg-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Videos
                </button>
                <button
                  onClick={() => setSelectedTab('documents')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-md transition-all whitespace-nowrap ${
                    selectedTab === 'documents'
                      ? 'bg-white text-blue-500 shadow-sm'
                      : 'bg-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Documents / PDFs
                </button>
              </div>
            )}

            {selectedCourse && !selectedModule && (
              <div className="bg-slate-100 rounded-lg p-1 flex gap-1 w-fit flex-wrap mt-1">
                <button
                  onClick={() => setCourseSectionTab('modules')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-md transition-all whitespace-nowrap ${
                    courseSectionTab === 'modules'
                      ? 'bg-white text-blue-500 shadow-sm'
                      : 'bg-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Modules
                </button>
                <button
                  onClick={() => setCourseSectionTab('progress')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-md transition-all whitespace-nowrap ${
                    courseSectionTab === 'progress'
                      ? 'bg-white text-blue-500 shadow-sm'
                      : 'bg-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Progress
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-48 md:w-60 lg:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder={
                  selectedModule
                    ? `Search ${selectedTab}...`
                    : selectedCourse
                      ? 'Search modules...'
                      : 'Search courses...'
                }
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all outline-none placeholder:text-gray-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={
                  Boolean(selectedModule && isReordering) ||
                  Boolean(selectedCourse && !selectedModule && courseSectionTab === 'progress') ||
                  isReorderingCourses
                }
              />
            </div>
            
            <div className="flex gap-2">
              {!selectedCourse && courses.length > 1 && (
                <button
                  type="button"
                  onClick={toggleCourseReordering}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                    isReorderingCourses
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                  }`}
                  disabled={isLoading || isSavingCourseOrder}
                >
                  <Reorder className="w-4 h-4" />
                  <span>
                    {isSavingCourseOrder ? 'Saving…' : isReorderingCourses ? 'Done Reordering' : 'Reorder Courses'}
                  </span>
                </button>
              )}

              {selectedCourse && selectedModule && (
                <>
                  <button
                    onClick={toggleReordering}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                      isReordering
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                    }`}
                    disabled={isLoading || isSavingOrder}
                  >
                    <Reorder className="w-4 h-4" />
                    <span className="hidden xs:inline">
                      {isSavingOrder ? 'Saving...' : isReordering ? 'Done' : 'Reorder'}
                    </span>
                    <span className="xs:hidden">Order</span>
                  </button>
                  
                  <button 
                    onClick={() => handleAddToCourse(selectedCourse, selectedModule.id, selectedTab === 'videos' ? 'video' : 'document')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                    disabled={isLoading}
                  >
                    <Add className="w-4 h-4" />
                    <span className="hidden xs:inline">Add {selectedTab === 'videos' ? 'Video' : 'PDF'}</span>
                    <span className="xs:hidden">Add</span>
                  </button>
                </>
              )}
              
              {!selectedCourse && (
                <button 
                  onClick={() => setShowCourseModal(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
                  disabled={isLoading}
                >
                  <Folder className="w-4 h-4" />
                  <span className="hidden xs:inline">Create Course</span>
                  <span className="xs:hidden">Course</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* Course summary when browsing modules */}
          {selectedCourse && !selectedModule && courseSectionTab === 'modules' && (
            <div className="mb-6 bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-white border border-slate-200">
                    {selectedCourse.thumbnailUrl && !failedThumbnailIds.has(`course-${selectedCourse.id}`) ? (
                      <img 
                        src={courseThumbSrc(
                          selectedCourse.thumbnailUrl,
                          courseThumbCacheKey(selectedCourse, thumbCacheBust)
                        )}
                        alt={selectedCourse.title}
                        className="w-full h-full object-cover"
                        onError={() => {
                          setFailedThumbnailIds((prev) => new Set(prev).add(`course-${selectedCourse.id}`));
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100">
                        <VideoLibrary className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-grow min-w-0">
                  <button
                    onClick={handleBackToCourses}
                    className="flex items-center gap-1 text-sm text-slate-600 hover:text-blue-600 mb-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Courses
                  </button>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-1">{selectedCourse.title}</h2>
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">{selectedCourse.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-semibold">
                      {selectedCourse.moduleCount ?? 0} modules
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700 font-semibold">
                      {selectedCourse.videoCount ?? 0} videos
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-100 text-amber-700 font-semibold">
                      {selectedCourse.documentCount ?? 0} documents
                    </span>
                    {selectedCourse.enrollmentCount !== undefined && (
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 font-semibold">
                        {selectedCourse.enrollmentCount} enrolled
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleEditCourse(selectedCourse)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-green-800 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    Edit Course
                  </button>
                  <button
                    onClick={() => router.push(`/admin/content/${selectedCourse.id}/preview`)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-purple-800 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1"
                  >
                    <RemoveRedEye className="w-4 h-4" />
                    Preview
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Module summary when browsing content */}
          {selectedCourse && selectedModule && (
            <div className="mb-6 bg-slate-50 rounded-xl p-4 border border-slate-200">
              <button
                onClick={handleBackToModules}
                className="flex items-center gap-1 text-sm text-slate-600 hover:text-blue-600 mb-3 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Modules
              </button>
              <div className="flex gap-4 items-start">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0">
                  {selectedModule.thumbnailUrl ? (
                    <img
                      src={courseThumbSrc(
                        selectedModule.thumbnailUrl,
                        selectedModule.updatedAt || selectedModule.thumbnailPath || ''
                      )}
                      alt={selectedModule.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100">
                      <Folder className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-800">
                    Module {selectedModule.order}: {selectedModule.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Upload and manage videos and PDFs for this module only.
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedCourse && !selectedModule && courseSectionTab === 'modules' && (
            <div className="mb-6">
              <CourseModulesPanel
                courseId={selectedCourse.id}
                searchQuery={searchQuery}
                toast={(message, type = 'info') => {
                  if (type === 'error') toast.error(message);
                  else if (type === 'success') toast.success(message);
                  else toast.info(message);
                }}
                onOpenModule={handleOpenModule}
                onModulesChanged={fetchCourses}
              />
            </div>
          )}

          {selectedCourse && !selectedModule && courseSectionTab === 'progress' && (
            <div className="mb-6">
              <CourseProgressTracker courseId={selectedCourse.id} courseTitle={selectedCourse.title} />
            </div>
          )}

          {/* Filter Bar - Only show when in module content view */}
          {selectedCourse && selectedModule && !isReordering && (
            <div className="flex flex-col xs:flex-row gap-3 mb-4 sm:mb-6 items-start xs:items-center flex-wrap">
              <div className="flex gap-2 w-full xs:w-auto">
                <div className="relative flex-1 xs:flex-none min-w-[140px]">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white text-slate-600 cursor-pointer outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 appearance-none"
                    disabled={isLoading || isReordering}
                  >
                    <option value="all">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8 sm:py-12 md:py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-slate-100 flex items-center justify-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-2 sm:mb-3">
                {selectedModule ? `Loading ${selectedTab}...` : selectedCourse ? 'Loading modules...' : 'Loading courses...'}
              </h3>
            </div>
          )}

          {/* Courses List View */}
          {!isLoading && !selectedCourse && (
            <>
              {courses.length === 0 ? (
                <div className="text-center py-8 sm:py-12 md:py-16">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-slate-100 flex items-center justify-center">
                    <Folder className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-2 sm:mb-3">
                    No courses found
                  </h3>
                  <p className="text-sm text-slate-500 mb-6 sm:mb-8 max-w-md mx-auto px-4">
                    Create your first course, then add modules and upload videos or PDFs inside each module.
                  </p>
                  <button 
                    onClick={() => setShowCourseModal(true)}
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    <Folder className="w-4 h-4" />
                    Create Your First Course
                  </button>
                </div>
              ) : filteredCourses.length === 0 ? (
                <div className="text-center py-8 sm:py-12 md:py-16">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-slate-100 flex items-center justify-center">
                    <Search className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-2 sm:mb-3">
                    No courses match your search
                  </h3>
                  <p className="text-sm text-slate-500 mb-6 sm:mb-8 max-w-md mx-auto px-4">
                    Try a different course name or clear the search box.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                  {filteredCourses.map((course, courseIndex) => (
                    <div
                      key={`${course.id}-${course.updatedAt}`}
                      draggable={isReorderingCourses && !isSavingCourseOrder}
                      onDragStart={() => isReorderingCourses && setDragCourseId(String(course.id))}
                      onDragOver={(e) => {
                        if (isReorderingCourses) e.preventDefault();
                      }}
                      onDrop={() => void onCourseDrop(String(course.id))}
                      className={`bg-white rounded-xl border overflow-hidden transition-all ${
                        isReorderingCourses
                          ? 'border-blue-300 cursor-grab active:cursor-grabbing hover:shadow-md'
                          : 'border-slate-200 hover:shadow-lg hover:-translate-y-0.5'
                      }`}
                    >
                      {isReorderingCourses && (
                        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-50 border-b border-blue-100 text-xs font-semibold text-blue-700">
                          <div className="flex items-center gap-2">
                            <DragIndicator className="w-4 h-4" />
                            <span>#{course.order ?? courseIndex + 1} · Drag or use arrows</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              title="Move up"
                              disabled={courseIndex === 0 || isSavingCourseOrder}
                              onClick={(e) => {
                                e.stopPropagation();
                                void moveCourse(String(course.id), 'up');
                              }}
                              className="p-1 rounded-md bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <KeyboardArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              title="Move down"
                              disabled={courseIndex === filteredCourses.length - 1 || isSavingCourseOrder}
                              onClick={(e) => {
                                e.stopPropagation();
                                void moveCourse(String(course.id), 'down');
                              }}
                              className="p-1 rounded-md bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <KeyboardArrowDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="relative">
                        {!isReorderingCourses && (
                          <div className="absolute top-3 left-3 z-10 bg-white/95 text-slate-800 px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                            #{course.order ?? courseIndex + 1}
                          </div>
                        )}
                        <div 
                          className="w-full h-40 bg-cover bg-center"
                          style={{ 
                            backgroundImage: courseThumbSrc(
                              course.thumbnailUrl,
                              courseThumbCacheKey(course, thumbCacheBust)
                            )
                              ? `url(${courseThumbSrc(
                                  course.thumbnailUrl,
                                  courseThumbCacheKey(course, thumbCacheBust)
                                )})`
                              : 'linear-gradient(to right, #1e3a5f, #3b82f6)'
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                            <div className="p-4 text-white">
                              <h3 className="text-lg font-semibold mb-1">{course.title}</h3>
                              <p className="text-sm opacity-90 line-clamp-2">{course.description}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="rounded-lg bg-slate-50 px-2 py-2 text-center">
                            <div className="text-sm font-bold text-slate-800">{course.moduleCount ?? 0}</div>
                            <div className="text-[10px] uppercase tracking-wide text-slate-500">Modules</div>
                          </div>
                          <div className="rounded-lg bg-blue-50 px-2 py-2 text-center">
                            <div className="text-sm font-bold text-blue-700">{course.videoCount ?? 0}</div>
                            <div className="text-[10px] uppercase tracking-wide text-blue-600">Videos</div>
                          </div>
                          <div className="rounded-lg bg-amber-50 px-2 py-2 text-center">
                            <div className="text-sm font-bold text-amber-700">{course.documentCount ?? 0}</div>
                            <div className="text-[10px] uppercase tracking-wide text-amber-700">PDFs</div>
                          </div>
                        </div>
                        {(course.enrollmentCount !== undefined || course.contentCount > 0) && (
                          <div className="flex justify-between items-center text-xs text-slate-500 mb-3">
                            <span>{course.contentCount || 0} total items</span>
                            {course.enrollmentCount !== undefined && (
                              <span>{course.enrollmentCount} enrolled</span>
                            )}
                          </div>
                        )}
                        
                        {!isReorderingCourses ? (
                          <>
                            <div className="flex gap-2 mb-3">
                              <button 
                                onClick={() => {
                                  setSelectedCourse(course);
                                  setSelectedModule(null);
                                  setCourseSectionTab('modules');
                                  setSelectedTab('videos');
                                  setSelectedCategory('all');
                                  setSearchQuery('');
                                  setDebouncedSearchQuery('');
                                  setSelectedSort('order');
                                }}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                <Folder className="w-4 h-4" />
                                Open Modules
                              </button>
                              
                              <button 
                                onClick={() => {
                                  router.push(`/admin/content/${course.id}/preview`);
                                }}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-purple-800 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                              >
                                <RemoveRedEye className="w-4 h-4" />
                                Preview
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <button 
                                onClick={() => handleEditCourse(course)}
                                className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-green-800 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                              >
                                <Edit className="w-3 h-3" />
                                Edit
                              </button>
                              
                              <button 
                                onClick={() => handleDeleteCourse(course)}
                                className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                              >
                                <Delete className="w-3 h-3" />
                                Delete
                              </button>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-blue-700 text-center py-1">
                            Use ↑ ↓ or drag cards to change course order
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Module Content View */}
          {!isLoading && selectedCourse && selectedModule && (
            <div className="space-y-3">
              {content.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                    {selectedTab === 'videos' ? (
                      <PlayArrow className="w-8 h-8 text-slate-400" />
                    ) : (
                      <Description className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">
                    No {selectedTab === 'videos' ? 'videos' : 'documents'} in this module
                  </h3>
                  <p className="text-sm text-slate-500 mb-6">
                    {searchQuery || selectedCategory !== 'all'
                      ? "No content matches your current filters. Try adjusting your search or filters."
                      : `Add your first ${selectedTab === 'videos' ? 'video' : 'PDF'} to this module.`
                    }
                  </p>
                  <button 
                    onClick={() => handleAddToCourse(selectedCourse, selectedModule.id, selectedTab === 'videos' ? 'video' : 'document')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Add className="w-4 h-4" />
                    Add {selectedTab === 'videos' ? 'Video' : 'PDF'}
                  </button>
                </div>
              ) : (
                content.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    draggable={isReordering && !isSavingOrder}
                    onDragStart={(e) => handleDragStart(e, lesson)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, lesson)}
                    className={`bg-white border border-slate-200 rounded-lg p-4 transition-all ${
                      isReordering ? 'cursor-move hover:border-blue-400 hover:shadow-md' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {isReordering && (
                        <DragIndicator className="w-5 h-5 text-slate-400" />
                      )}
                      
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                        {index + 1}
                      </div>

                      <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-slate-100">
                        {lesson.thumbnailUrl && !failedThumbnailIds.has(lesson.id) ? (
                          <img
                            src={courseThumbSrc(lesson.thumbnailUrl, lesson.updatedAt || lesson.uploadDate)}
                            alt={lesson.title}
                            className="w-full h-full object-cover"
                            onError={() => {
                              setFailedThumbnailIds((prev) => new Set(prev).add(lesson.id));
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {selectedTab === 'videos' ? (
                              <PlayArrow className="w-8 h-8 text-slate-400" />
                            ) : (
                              <Description className="w-8 h-8 text-slate-400" />
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex-grow">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-semibold text-slate-800">{lesson.title}</h4>
                          <div className="flex items-center gap-2">
                            {lesson.published ? (
                              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                <LockOpen className="w-3 h-3" />
                                Published
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                                <Lock className="w-3 h-3" />
                                Draft
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2 mb-2">{lesson.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {lesson.duration && <span>{lesson.duration}</span>}
                          <span>
                            {selectedTab === 'videos'
                              ? `${lesson.views?.toLocaleString() || 0} views`
                              : `${lesson.downloads?.toLocaleString() || 0} downloads`
                            }
                          </span>
                          <span className="flex items-center gap-1">
                            <Category className="w-3.5 h-3.5" />
                            {getCategoryName(lesson.category_id)}
                          </span>
                        </div>
                      </div>

                      {!isReordering && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleView(lesson)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title={selectedTab === 'videos' ? 'Play' : 'Download'}
                          >
                            {selectedTab === 'videos' ? (
                              <PlayArrow className="w-5 h-5" />
                            ) : (
                              <Download className="w-5 h-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEdit(lesson)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Edit"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(lesson.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <Delete className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-3 sm:gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <div className="text-sm sm:text-base font-semibold text-slate-800">
              {selectedModule
                ? courseTabTotal
                : selectedCourse
                  ? (selectedCourse.moduleCount ?? 0)
                  : courses.length}
            </div>
            <div className="text-xs sm:text-sm text-slate-500">
              {selectedModule
                ? `Total ${selectedTab === 'videos' ? 'Videos' : 'Documents'}`
                : selectedCourse
                  ? 'Modules'
                  : 'Total Courses'}
            </div>
          </div>

          {!selectedCourse && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <div className="text-sm sm:text-base font-semibold text-slate-800">
                  {platformContentStats.videos}
                </div>
                <div className="text-xs sm:text-sm text-slate-500">Videos</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <div className="text-sm sm:text-base font-semibold text-slate-800">
                  {platformContentStats.documents}
                </div>
                <div className="text-xs sm:text-sm text-slate-500">Documents</div>
              </div>
            </>
          )}

          {selectedCourse && !selectedModule && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <div className="text-sm sm:text-base font-semibold text-slate-800">
                  {selectedCourse.videoCount ?? 0}
                </div>
                <div className="text-xs sm:text-sm text-slate-500">Videos</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <div className="text-sm sm:text-base font-semibold text-slate-800">
                  {selectedCourse.documentCount ?? 0}
                </div>
                <div className="text-xs sm:text-sm text-slate-500">Documents</div>
              </div>
            </>
          )}

          {selectedModule && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <div className="text-sm sm:text-base font-semibold text-slate-800">{stats.published}</div>
                <div className="text-xs sm:text-sm text-slate-500">Published</div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <div className="text-sm sm:text-base font-semibold text-slate-800">
                  {stats.totalViewsDownloads.toLocaleString()}
                </div>
                <div className="text-xs sm:text-sm text-slate-500 whitespace-nowrap">
                  Total {selectedTab === 'videos' ? 'Views' : 'Downloads'}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Content Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto my-4">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 sm:p-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                  {editingItem ? 'Edit' : 'Add'} {selectedTab === 'videos' ? 'Video' : 'Document'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Fill in the details below to {editingItem ? 'update' : 'create'} your content
                </p>
              </div>
              <button
                onClick={handleCancel}
                className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full transition-colors"
                disabled={isSubmitting}
              >
                <Close className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={newContent.title}
                    onChange={handleInputChange}
                    placeholder={`Enter ${selectedTab === 'videos' ? 'video' : 'document'} title`}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all outline-none placeholder:text-gray-600"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    required
                    value={newContent.description}
                    onChange={handleInputChange}
                    placeholder="Describe your content..."
                    rows={3}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all outline-none resize-none placeholder:text-gray-600"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 relative">
                  <div className="relative z-10">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                      Category *
                    </label>
                    <div className="relative">
                      <select
                        name="category_id"
                        value={newContent.category_id}
                        onChange={handleInputChange}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all outline-none appearance-none bg-white"
                        disabled={isSubmitting || categories.length === 0}
                        required
                      >
                        <option value="">Select a category</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={String(cat.id)}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-0">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                      Course (Optional)
                    </label>
                    <div className="relative">
                      <select
                        name="course_id"
                        value={newContent.course_id}
                        onChange={handleInputChange}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all outline-none appearance-none bg-white"
                        disabled={isSubmitting}
                      >
                        <option value="">No Course (Uncategorized)</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>
                            {course.title}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Duration field for videos */}
                {selectedTab === 'videos' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                      Duration (Optional)
                    </label>
                    <input
                      type="text"
                      name="duration"
                      value={newContent.duration}
                      onChange={handleInputChange}
                      placeholder="e.g., 5:30 or 1h 20m"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all outline-none placeholder:text-gray-600"
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                {/* Thumbnail Image Upload (edit only) */}
                {selectedTab === 'videos' && editingItem && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                      Thumbnail Image (Optional)
                    </label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition-colors">
                      <Collections className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-slate-400 mx-auto mb-2 sm:mb-3" />
                      <p className="text-xs sm:text-sm text-slate-600 mb-2 break-words">
                        {newContent.thumbnailImage 
                          ? newContent.thumbnailImage.name 
                          : `Current thumbnail: ${editingItem.thumbnailUrl ? 'Set' : 'Not set'} (Click choose file to change)`
                        }
                      </p>
                      <label className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-600 text-xs sm:text-sm font-semibold rounded-lg hover:bg-blue-100 cursor-pointer transition-colors">
                        Choose Thumbnail
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailChange}
                          className="hidden"
                          disabled={isSubmitting}
                        />
                      </label>
                      <p className="text-xs text-slate-500 mt-2 px-2">
                        Supports: JPG, PNG, WebP (Max 5MB)
                      </p>
                    </div>
                  </div>
                )}

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                    {selectedTab === 'videos' ? 'Video File' : 'Document File'} *
                    {!editingItem && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition-colors">
                    <CloudUpload className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-slate-400 mx-auto mb-2 sm:mb-3" />
                    <p className="text-xs sm:text-sm text-slate-600 mb-2 break-words">
                      {newContent.file 
                        ? `${newContent.file.name} (${formatFileSize(newContent.file.size)})` 
                        : editingItem 
                          ? `Current file: ${editingItem.fileName || 'No file'} (Click choose file to change)`
                          : `Drag & drop or click to upload ${selectedTab === 'videos' ? 'video file' : 'document file'}`
                      }
                    </p>
                    <p className="text-xs text-slate-400 mb-2">
                      Maximum file size: {maxFileSizeLabel}
                    </p>
                    <label className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-600 text-xs sm:text-sm font-semibold rounded-lg hover:bg-blue-100 cursor-pointer transition-colors">
                      Choose File
                      <input
                        type="file"
                        accept={selectedTab === 'videos' ? 'video/*' : '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt'}
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isSubmitting}
                        required={!editingItem}
                      />
                    </label>
                    <p className="text-xs text-slate-500 mt-2 px-2">
                      {selectedTab === 'videos' 
                        ? `Supports: MP4, MOV, AVI, MKV (max ${maxFileSizeLabel})` 
                        : `Supports: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT (max ${maxFileSizeLabel})`
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <input
                    type="checkbox"
                    id="published"
                    name="published"
                    checked={newContent.published}
                    onChange={(e) => setNewContent(prev => ({ ...prev, published: e.target.checked }))}
                    className="w-4 h-4 text-blue-500 rounded focus:ring-blue-400"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="published" className="text-sm text-slate-700">
                    Publish immediately
                  </label>
                </div>
              </div>

              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-200 flex justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (!newContent.file && !editingItem)}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="whitespace-nowrap">
                        {uploadProgress > 0
                          ? `Uploading ${uploadProgress}%...`
                          : editingItem
                            ? 'Updating...'
                            : 'Creating...'}
                      </span>
                    </>
                  ) : (
                    <>
                      {editingItem ? (
                        <span className="whitespace-nowrap">
                          Update {selectedTab === 'videos' ? 'Video' : 'Document'}
                        </span>
                      ) : (
                        <>
                          <Add className="w-4 h-4" />
                          <span className="whitespace-nowrap">
                            Create {selectedTab === 'videos' ? 'Video' : 'Document'}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto my-4">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 sm:p-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                  {editingCourse ? 'Edit' : 'Create New'} Course
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {editingCourse ? 'Update your course details' : 'Create a new course to organize your content'}
                </p>
              </div>
              <button
                onClick={handleCourseCancel}
                className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full transition-colors"
                disabled={isSubmitting}
              >
                <Close className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCourseSubmit} className="p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={newCourse.title}
                    onChange={handleCourseInputChange}
                    placeholder="Enter course title"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all outline-none placeholder:text-gray-600"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    value={newCourse.description}
                    onChange={handleCourseInputChange}
                    placeholder="Describe your course..."
                    rows={4}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all outline-none resize-none placeholder:text-gray-600"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                    Course Thumbnail (Optional)
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition-colors">
                    <Collections className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-slate-400 mx-auto mb-2 sm:mb-3" />
                    <p className="text-xs sm:text-sm text-slate-600 mb-2 break-words">
                      {newCourse.thumbnailImage 
                        ? newCourse.thumbnailImage.name 
                        : editingCourse 
                          ? `Current thumbnail: ${editingCourse.thumbnailUrl ? 'Set' : 'Not set'} (Click choose file to change)`
                          : `Upload a thumbnail image for your course`
                      }
                    </p>
                    {(courseThumbPreview || editingCourse?.thumbnailUrl) && (
                      <div className="mb-3 flex justify-center">
                        <img
                          src={courseThumbPreview || courseThumbSrc(
                            editingCourse?.thumbnailUrl,
                            editingCourse
                              ? courseThumbCacheKey(editingCourse, thumbCacheBust)
                              : undefined
                          )}
                          alt="Course thumbnail preview"
                          className="max-h-40 rounded-lg border border-slate-200 object-cover"
                        />
                      </div>
                    )}
                    <label className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-600 text-xs sm:text-sm font-semibold rounded-lg hover:bg-blue-100 cursor-pointer transition-colors">
                      Choose Thumbnail
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCourseThumbnailChange}
                        className="hidden"
                        disabled={isSubmitting}
                      />
                    </label>
                    <p className="text-xs text-slate-500 mt-2 px-2">
                      Recommended: 1280x720px, JPG or PNG (Max 5MB)
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-200 flex justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleCourseCancel}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="whitespace-nowrap">
                        {editingCourse ? 'Updating...' : 'Creating...'}
                      </span>
                    </>
                  ) : (
                    <>
                      {editingCourse ? (
                        <span className="whitespace-nowrap">Update Course</span>
                      ) : (
                        <>
                          <Add className="w-4 h-4" />
                          <span className="whitespace-nowrap">Create Course</span>
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add to Course Modal */}
      {showAddToCourseModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto my-4">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 sm:p-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                  Add Content to "{selectedCourse.title}"
                  {selectedModule ? ` · ${selectedModule.title}` : ''}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Add a new {selectedTab} to this course
                </p>
              </div>
              <button
                onClick={() => setShowAddToCourseModal(false)}
                className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full transition-colors"
                disabled={isSubmitting}
              >
                <Close className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={newContent.title}
                    onChange={handleInputChange}
                    placeholder={`Enter ${selectedTab === 'videos' ? 'video' : 'document'} title`}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all outline-none placeholder:text-gray-600"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    required
                    value={newContent.description}
                    onChange={handleInputChange}
                    placeholder="Describe your content..."
                    rows={3}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all outline-none resize-none placeholder:text-gray-600"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                    Category *
                  </label>
                  <div className="relative">
                    <select
                      name="category_id"
                      value={newContent.category_id}
                      onChange={handleInputChange}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all outline-none appearance-none"
                      disabled={isSubmitting || categories.length === 0}
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Duration field for videos */}
                {selectedTab === 'videos' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                      Duration (Optional)
                    </label>
                    <input
                      type="text"
                      name="duration"
                      value={newContent.duration}
                      onChange={handleInputChange}
                      placeholder="e.g., 5:30 or 1h 20m"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all outline-none placeholder:text-gray-600"
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                    {selectedTab === 'videos' ? 'Video File' : 'Document File'} *
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition-colors">
                    <CloudUpload className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 mx-auto mb-2 sm:mb-3" />
                    <p className="text-xs sm:text-sm text-slate-600 mb-2">
                      {newContent.file 
                        ? `${newContent.file.name} (${formatFileSize(newContent.file.size)})` 
                        : `Drag & drop or click to upload ${selectedTab === 'videos' ? 'video file' : 'document file'}`
                      }
                    </p>
                    <p className="text-xs text-slate-400 mb-2">
                      Maximum file size: {maxFileSizeLabel}
                    </p>
                    <label className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-600 text-xs sm:text-sm font-semibold rounded-lg hover:bg-blue-100 cursor-pointer transition-colors">
                      Choose File
                      <input
                        type="file"
                        accept={selectedTab === 'videos' ? 'video/*' : '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt'}
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isSubmitting}
                        required
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <input
                    type="checkbox"
                    id="published-course"
                    name="published"
                    checked={newContent.published}
                    onChange={(e) => setNewContent(prev => ({ ...prev, published: e.target.checked }))}
                    className="w-4 h-4 text-blue-500 rounded focus:ring-blue-400"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="published-course" className="text-sm text-slate-700">
                    Publish immediately
                  </label>
                </div>
              </div>

              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-200 flex justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddToCourseModal(false)}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newContent.file}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <PlaylistAdd className="w-4 h-4" />
                      <span>Add to Course</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteCourseTarget}
        title="Delete course?"
        message={
          deleteCourseTarget
            ? `Are you sure you want to delete "${deleteCourseTarget.title}"? All content in this course will be moved to uncategorized.`
            : 'Are you sure you want to delete this course? All content in this course will be moved to uncategorized.'
        }
        confirmLabel="Delete Course"
        cancelLabel="Cancel"
        variant="danger"
        loading={isDeletingCourse}
        onConfirm={confirmDeleteCourse}
        onCancel={() => {
          if (!isDeletingCourse) setDeleteCourseTarget(null);
        }}
      />
    </>
  );
};

export default ContentManager;