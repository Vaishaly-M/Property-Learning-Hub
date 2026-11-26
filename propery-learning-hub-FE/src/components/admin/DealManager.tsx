'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Search,
  Add,
  Edit,
  Delete,
  Visibility,
  TrendingUp,
  LocationOn,
  CurrencyPound,
  CalendarToday,
  FilterList,
  CheckCircle,
  Pending,
  Block,
  Close,
  CloudUpload,
  Description,
  Business,
  Refresh,
  Star,
  HourglassEmpty,
  ThumbDown,
  ThumbUp,
  InfoOutlined,
  History,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from '@mui/icons-material';
import { appendMediaToFormData, MEDIA_UPLOAD_PRESETS } from '../../services/mediaUploadService';
import dealService from '../../services/dealService';
import { AppToastStack, ConfirmDialog, useAppToast } from '../ui/AppDialog';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { resolveStorageUrl } from '../../utils/mediaUrl';

// ─────────────────────────────── Types ────────────────────────────────

interface DealStatusHistoryItem {
  id: number;
  old_status: string;
  new_status: string;
  note: string | null;
  created_at: string;
  user?: { id: number; first_name: string; last_name?: string; role?: string } | null;
}

interface Deal {
  id: number | string;
  title: string;
  location: string;
  price: string | number;
  roi: string | number;
  status: 'DRAFT' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'RESUBMITTED' | 'CLOSED';
  listing_kind?: 'marketplace' | 'review';
  rejection_note?: string | null;
  verified_at?: string | null;
  verified_by?: number | null;
  submitted_by_role?: 'ADMIN' | 'LEARNER' | null;
  featured?: boolean;
  views: number;
  inquiries: number;
  created_at: string;
  description?: string;
  property_type?: string;
  occupancy?: string | number;
  image_url?: string;
  image_url_full?: string;
  images?: string[];
  formatted_price?: string;
  created_by?: number;
  published_at?: string;
  closed_at?: string;
  user?: { id: number; first_name: string; last_name?: string; email?: string };
  verified_by_user?: { id: number; first_name: string; last_name?: string } | null;
  histories?: DealStatusHistoryItem[];
}

interface DealStats {
  total_deals: number;
  published_deals: number;
  total_views: number;
  total_inquiries: number;
  changes: {
    total: string;
    published: string;
    views: string;
    inquiries: string;
  };
}

interface DealFormData {
  title: string;
  location: string;
  price: string;
  roi: string;
  description: string;
  property_type: string;
  occupancy: string;
  images: File[];
  existingImages: string[];
  imagesToDelete: string[];
  publish_immediately?: boolean;
}

type DealFieldErrors = Partial<Record<keyof DealFormData, string>>;

// ─────────────────────────── Pure helpers ─────────────────────────────

function parseNumericInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/[£,$%\s]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function validateDealForm(deal: DealFormData): DealFieldErrors {
  const errors: DealFieldErrors = {};

  if (!deal.title.trim()) errors.title = 'Deal title is required.';
  if (!deal.location.trim()) errors.location = 'Location is required.';

  const price = parseNumericInput(deal.price);
  if (price !== null && price < 0) {
    errors.price = 'Price cannot be negative.';
  }

  const pctChecks: Array<{ key: 'roi' | 'occupancy'; label: string; required?: boolean }> = [
    { key: 'roi', label: 'ROI' },
    { key: 'occupancy', label: 'Occupancy' },
  ];

  for (const { key, label } of pctChecks) {
    const raw = deal[key].trim();
    if (!raw) continue;
    const num = parseNumericInput(raw);
    if (num === null) errors[key] = `${label} must be a number.`;
    else if (num < 0) errors[key] = `${label} cannot be negative.`;
    else if (num > 100) errors[key] = `${label} cannot exceed 100%.`;
  }

  return errors;
}

function firstValidationMessage(errors: DealFieldErrors, fallback: string): string {
  return Object.values(errors).find(Boolean) ?? fallback;
}

function mapApiFieldErrors(errors: unknown): DealFieldErrors {
  if (!errors || typeof errors !== 'object') return {};
  const mapped: DealFieldErrors = {};
  Object.entries(errors as Record<string, string | string[]>).forEach(([key, value]) => {
    const message = Array.isArray(value) ? value[0] : value;
    if (message) mapped[key as keyof DealFormData] = message;
  });
  return mapped;
}

function fieldInputClass(hasError: boolean, extra = ''): string {
  return `w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border rounded-lg focus:ring-3 transition-all outline-none placeholder:text-gray-600 ${extra} ${
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
  }`;
}

const BLANK_FORM: DealFormData = {
  title: '',
  location: '',
  price: '',
  roi: '',
  description: '',
  property_type: '',
  occupancy: '',
  images: [],
  existingImages: [],
  imagesToDelete: [],
  publish_immediately: true,
};

const propertyTypes = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'residential', label: 'Residential' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'retail', label: 'Retail' },
  { value: 'mixed-use', label: 'Mixed Use' },
];

function normalizeFeatured(value: unknown): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false' || value == null || value === '') {
    return false;
  }
  return Boolean(value);
}

function formatPrice(value: string | number) {
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return '£0';
  return '£' + num.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function dealToFormData(deal: Deal): DealFormData {
  const stripMoney = (value: string | number | null | undefined) => {
    if (value == null || value === '') return '';
    return String(value).replace(/[£,$,]/g, '');
  };
  const stripPercent = (value: string | number | null | undefined) => {
    if (value == null || value === '') return '';
    return String(value).replace(/%/g, '');
  };

  // Get existing images from the deal
  const existingImages = deal.images || (deal.image_url ? [deal.image_url] : []);

  return {
    title: deal.title || '',
    location: deal.location || '',
    price: stripMoney(deal.price),
    roi: stripPercent(deal.roi),
    description: deal.description || '',
    property_type: deal.property_type || '',
    occupancy: deal.occupancy == null || deal.occupancy === '' ? '' : String(deal.occupancy),
    images: [],
    existingImages: existingImages,
    imagesToDelete: [],
    publish_immediately: deal.status === 'VERIFIED' || String(deal.status).toLowerCase() === 'published',
  };
}

// ── Full-Screen Image Viewer Component ──────────────────────────────

const FullScreenImageViewer = ({ 
  images, 
  initialIndex = 0,
  onClose 
}: { 
  images: string[], 
  initialIndex?: number,
  onClose: () => void 
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);

  const getImageUrl = (imageUrl: string) => {
    if (!imageUrl || imageUrl === 'null' || imageUrl === 'undefined') {
      return '/images/placeholder-property.jpg';
    }
    return resolveStorageUrl(imageUrl) ?? '/images/placeholder-property.jpg';
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setZoomLevel(1);
    setOffsetX(0);
  };

  const goToPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setZoomLevel(1);
    setOffsetX(0);
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setStartX(e.clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      const diff = e.clientX - startX;
      setOffsetX(diff);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft') {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
      setZoomLevel(1);
      setOffsetX(0);
    } else if (e.key === 'ArrowRight') {
      setCurrentIndex((prev) => (prev + 1) % images.length);
      setZoomLevel(1);
      setOffsetX(0);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!images || images.length === 0) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100]"
      onClick={onClose}
    >
      <div 
        className="relative w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-white/80 hover:text-white bg-black/50 hover:bg-black/70 rounded-full p-3 transition-all backdrop-blur-sm"
        >
          <Close className="w-8 h-8" />
        </button>

        {/* Zoom Controls */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          <button
            onClick={handleZoomIn}
            className="text-white/80 hover:text-white bg-black/50 hover:bg-black/70 rounded-full p-2.5 transition-all backdrop-blur-sm"
          >
            <ZoomIn className="w-6 h-6" />
          </button>
          <button
            onClick={handleZoomOut}
            className="text-white/80 hover:text-white bg-black/50 hover:bg-black/70 rounded-full p-2.5 transition-all backdrop-blur-sm"
          >
            <ZoomOut className="w-6 h-6" />
          </button>
          <div className="text-white/60 text-xs text-center bg-black/50 px-2 py-1 rounded">
            {Math.round(zoomLevel * 100)}%
          </div>
        </div>

        {/* Image Counter */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 text-white/80 text-sm font-medium bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Previous Button */}
        {images.length > 1 && (
          <button
            onClick={goToPrev}
            className="absolute left-4 z-20 text-white/80 hover:text-white bg-black/50 hover:bg-black/70 rounded-full p-3 transition-all backdrop-blur-sm"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}

        {/* Main Image */}
        <div 
          className="flex-1 flex items-center justify-center h-full w-full overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={getImageUrl(images[currentIndex])}
            alt={`Property image ${currentIndex + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain transition-transform duration-200 select-none"
            style={{
              transform: `scale(${zoomLevel}) translateX(${offsetX / zoomLevel}px)`,
              cursor: zoomLevel > 1 ? 'grab' : 'default',
            }}
            draggable={false}
          />
        </div>

        {/* Next Button */}
        {images.length > 1 && (
          <button
            onClick={goToNext}
            className="absolute right-4 z-20 text-white/80 hover:text-white bg-black/50 hover:bg-black/70 rounded-full p-3 transition-all backdrop-blur-sm"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        )}

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex gap-2 max-w-[90vw] overflow-x-auto px-4 py-2 bg-black/40 backdrop-blur-sm rounded-lg">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setZoomLevel(1);
                  setOffsetX(0);
                }}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                  idx === currentIndex 
                    ? 'border-white shadow-lg scale-105' 
                    : 'border-white/30 hover:border-white/60'
                }`}
              >
                <img
                  src={getImageUrl(img)}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────── Component ────────────────────────────────

type ListingKind = 'marketplace' | 'review';

interface DealManagerProps {
  listingKind?: ListingKind;
}

const DealManager: React.FC<DealManagerProps> = ({ listingKind = 'marketplace' }) => {
  const isReview = listingKind === 'review';
  const sectionTitle = isReview ? 'Deal Review' : 'Deal Marketplace';
  const sectionSubtitle = isReview
    ? 'Review private learner submissions. Approved deals stay here after they are sent to the marketplace.'
    : 'Manage investment opportunities, verify learner deals, and track marketplace statistics.';
  const { admin } = useAdminAuth();
  const isAdmin = ['admin', 'super_admin'].includes(String(admin?.role || '').toLowerCase());
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pendingEditIdRef = useRef<string | null>(null);
  const hasOpenedEditFromUrlRef = useRef(false);

  const { toasts, push: toast } = useAppToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stats, setStats] = useState<DealStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<DealFieldErrors>({});
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    perPage: 10,
  });

  // Image viewer state
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // Rejection / approval modals
  const [rejectModal, setRejectModal] = useState<{ deal: Deal } | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [approveModal, setApproveModal] = useState<{ deal: Deal } | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant?: 'danger' | 'primary';
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [featuringDealId, setFeaturingDealId] = useState<string | null>(null);

  const [newDeal, setNewDeal] = useState<DealFormData>(BLANK_FORM);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || sessionStorage.getItem('token');
    }
    return null;
  };

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${getAuthToken()}`,
    Accept: 'application/json',
  }), []);

  // Get image URL with fallback
  const getImageUrl = (imageUrl: string | undefined | null) => {
    if (!imageUrl || imageUrl === 'null' || imageUrl === 'undefined') {
      return '/images/placeholder-property.jpg';
    }
    return resolveStorageUrl(imageUrl) ?? '/images/placeholder-property.jpg';
  };

  // ── Data fetching ──────────────────────────────────────────────────

  const fetchDeals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      params.append('tab', activeTab);
      params.append('listing_kind', listingKind);
      params.append('per_page', String(pagination.perPage));
      params.append('page', String(pagination.currentPage));

      let data;
      if (isAdmin) {
        data = await dealService.adminGetDeals(Object.fromEntries(params.entries()));
      } else {
        data = await dealService.getDeals(Object.fromEntries(params.entries()));
      }

      if (data.success) {
        const rows = (data.data.data || data.data || []) as Deal[];
        setDeals(
          rows.map((deal) => ({
            ...deal,
            featured: normalizeFeatured((deal as Deal).featured),
            images: deal.images || (deal.image_url ? [deal.image_url] : []),
          }))
        );
        if (data.data.current_page) {
          setPagination(prev => {
            if (prev.currentPage === data.data.current_page && prev.lastPage === data.data.last_page) {
              return prev;
            }
            return {
              ...prev,
              currentPage: data.data.current_page,
              lastPage: data.data.last_page || 1,
            };
          });
        }
      } else {
        throw new Error(data.message || 'Failed to fetch deals');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deals');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, activeTab, pagination.currentPage, pagination.perPage, isAdmin, listingKind]);

  const fetchStats = useCallback(async () => {
    try {
      if (isAdmin) return;
      const data = await dealService.getStats();
      if (data.success) setStats(data.data);
    } catch {}
  }, [isAdmin]);

  useEffect(() => {
    setPagination(prev => {
      if (prev.currentPage === 1) return prev;
      return { ...prev, currentPage: 1 };
    });
  }, [activeTab, searchQuery]);

  useEffect(() => {
    fetchDeals();
    fetchStats();
  }, [fetchDeals, fetchStats]);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      pendingEditIdRef.current = editId;
      hasOpenedEditFromUrlRef.current = false;
    }
  }, [searchParams]);

  const openDealForEdit = useCallback((deal: Deal) => {
    setEditingDeal(deal);
    setNewDeal(dealToFormData(deal));
    setFieldErrors({});
    setError(null);
    setShowAddModal(true);
  }, []);

  useEffect(() => {
    const editId = pendingEditIdRef.current;
    if (!editId || hasOpenedEditFromUrlRef.current || isLoading) return;

    const dealFromList = deals.find((deal) => String(deal.id) === editId);
    if (dealFromList) {
      openDealForEdit(dealFromList);
      hasOpenedEditFromUrlRef.current = true;
      pendingEditIdRef.current = null;
      router.replace(pathname, { scroll: false });
      return;
    }

    if (deals.length === 0) return;

    const loadDealForEdit = async () => {
      try {
        const deal = await dealService.adminGetDealById(editId, listingKind);
        if (deal) {
          openDealForEdit(deal);
        } else {
          toast('Could not find the selected deal to edit.', 'error');
        }
      } catch {
        toast('Could not load the selected deal to edit.', 'error');
      } finally {
        hasOpenedEditFromUrlRef.current = true;
        pendingEditIdRef.current = null;
        router.replace(pathname, { scroll: false });
      }
    };

    void loadDealForEdit();
  }, [deals, isLoading, isAdmin, listingKind, openDealForEdit, pathname, router, toast]);

  // ── Status helpers ─────────────────────────────────────────────────

  const getStatusColors = (status: string, deal?: Deal) => {
    if (isReview && status === 'VERIFIED' && deal?.published_at) {
      return {
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        label: 'In Marketplace',
      };
    }
    if (isReview && status === 'VERIFIED') {
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        label: 'Approved — Private',
      };
    }
    switch (status) {
      case 'VERIFIED':
        return { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Verified' };
      case 'PENDING':
        return { bg: 'bg-blue-100', text: 'text-blue-800', icon: <HourglassEmpty className="w-3.5 h-3.5" />, label: 'Pending Verification' };
      case 'REJECTED':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: <ThumbDown className="w-3.5 h-3.5" />, label: 'Rejected' };
      case 'RESUBMITTED':
        return { bg: 'bg-violet-100', text: 'text-violet-800', icon: <Refresh className="w-3.5 h-3.5" />, label: 'Resubmitted' };
      case 'DRAFT':
        return { bg: 'bg-amber-100', text: 'text-amber-800', icon: <Pending className="w-3.5 h-3.5" />, label: 'Draft' };
      case 'CLOSED':
        return { bg: 'bg-slate-100', text: 'text-slate-700', icon: <Block className="w-3.5 h-3.5" />, label: 'Closed' };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-600', icon: null, label: status };
    }
  };

  // ── Confirm helper ─────────────────────────────────────────────────

  const runConfirmAction = async () => {
    if (!confirmDialog) return;
    setConfirmLoading(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  // ── Form handlers ──────────────────────────────────────────────────

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewDeal((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof DealFormData]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setNewDeal((prev) => ({ ...prev, [name]: checked }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewDeal((prev) => ({ 
      ...prev, 
      images: [...(prev.images || []), ...files] 
    }));
  };

  const handleRemoveNewImage = (index: number) => {
    setNewDeal((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index),
    }));
  };

  const handleRemoveExistingImage = (imageUrl: string) => {
    setNewDeal((prev) => ({
      ...prev,
      existingImages: (prev.existingImages || []).filter((url) => url !== imageUrl),
      imagesToDelete: [...(prev.imagesToDelete || []), imageUrl],
    }));
  };

  const openImageViewer = (images: string[], index: number = 0) => {
    if (images.length > 0) {
      setViewerImages(images);
      setViewerInitialIndex(index);
      setImageViewerOpen(true);
    }
  };

  // ── Submit (create / update) ───────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const clientErrors = validateDealForm(newDeal);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setError(firstValidationMessage(clientErrors, 'Please fix the highlighted fields.'));
      setIsSubmitting(false);
      return;
    }
    setFieldErrors({});

    try {
      const formData = new FormData();
      formData.append('title', newDeal.title.trim());
      formData.append('location', newDeal.location.trim());

      const price = parseNumericInput(newDeal.price);
      if (price !== null) {
        formData.append('price', String(price));
      }

      const roi = parseNumericInput(newDeal.roi);
      if (roi !== null) {
        formData.append('roi', String(roi));
      }

      if (newDeal.property_type) {
        formData.append('property_type', newDeal.property_type);
      }
      formData.append('listing_kind', listingKind);
      if (newDeal.description.trim()) formData.append('description', newDeal.description.trim());

      const occupancy = parseNumericInput(newDeal.occupancy);
      if (occupancy !== null) formData.append('occupancy', String(occupancy));

      if (isAdmin) {
        if (editingDeal) {
          if (
            newDeal.publish_immediately &&
            editingDeal.status !== 'VERIFIED' &&
            String(editingDeal.status).toLowerCase() !== 'published'
          ) {
            formData.append('status', 'VERIFIED');
          }
        } else {
          formData.append('publish_immediately', newDeal.publish_immediately ? '1' : '0');
        }
      }

      // Append new images
      for (const imageFile of (newDeal.images || [])) {
        formData.append('images[]', imageFile, imageFile.name);
      }

      // Append images to delete
      for (const imageUrl of (newDeal.imagesToDelete || [])) {
        formData.append('delete_images[]', imageUrl);
      }

      // Use POST with _method=PUT for updates
      if (editingDeal) {
        formData.append('_method', 'PUT');
      }

      let data;
      if (isAdmin) {
        if (editingDeal) {
          data = await dealService.adminUpdateDeal(editingDeal.id, formData);
        } else {
          data = await dealService.adminCreateDeal(formData);
        }
      } else {
        if (editingDeal) {
          formData.append('_method', 'PUT');
          data = await dealService.updateDeal(editingDeal.id, formData);
        } else {
          data = await dealService.createDeal(formData);
        }
      }

      await fetchDeals();
      await fetchStats();
      setNewDeal(BLANK_FORM);
      setEditingDeal(null);
      setShowAddModal(false);
      
      toast(
        editingDeal
          ? 'Deal updated successfully!'
          : isAdmin && newDeal.publish_immediately
            ? 'Deal created and verified immediately!'
            : 'Deal created! Awaiting admin verification.',
        'success'
      );
    } catch (err) {
      const apiErrors = err instanceof Error && 'errors' in err
        ? mapApiFieldErrors((err as Error & { errors?: unknown }).errors)
        : {};
      if (Object.keys(apiErrors).length > 0) {
        setFieldErrors(apiErrors);
      }
      setError(err instanceof Error ? err.message : 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNewDeal(BLANK_FORM);
    setEditingDeal(null);
    setShowAddModal(false);
    setError(null);
    setFieldErrors({});
  };

  const handleOpenAddModal = () => { setError(null); setFieldErrors({}); setShowAddModal(true); };

  const handleEdit = (deal: Deal) => {
    openDealForEdit(deal);
  };

  // ── Delete ─────────────────────────────────────────────────────────

  const handleDelete = (id: number | string) => {
    setConfirmDialog({
      title: 'Delete Deal',
      message: 'Are you sure you want to permanently delete this deal? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        if (isAdmin) {
          await dealService.adminDeleteDeal(id, listingKind);
        } else {
          await dealService.deleteDeal(id);
        }
        await fetchDeals();
        await fetchStats();
        toast('Deal deleted successfully!', 'success');
      },
    });
  };

  // ── Close ──────────────────────────────────────────────────────────

  const handleClose = (id: number | string) => {
    setConfirmDialog({
      title: 'Close Deal',
      message: 'Close this deal? It will no longer be visible in the verified marketplace.',
      confirmLabel: 'Close Deal',
      variant: 'primary',
      onConfirm: async () => {
        await dealService.closeDeal(id);
        await fetchDeals();
        await fetchStats();
        toast('Deal closed successfully!', 'success');
      },
    });
  };

  // ── Featured toggle ────────────────────────────────────────────────

  const handleToggleFeatured = async (deal: Deal) => {
    const dealId = String(deal.id);
    const status = String(deal.status || '').toUpperCase();
    if (status !== 'VERIFIED' && status !== 'PUBLISHED') {
      toast('Only verified deals can be featured', 'error');
      return;
    }
    if (featuringDealId === dealId) return;

    const previous = normalizeFeatured(deal.featured);
    const optimistic = !previous;
    setFeaturingDealId(dealId);
    setDeals((prev) =>
      prev.map((item) =>
        String(item.id) === dealId ? { ...item, featured: optimistic } : item
      )
    );

    try {
      const result = await dealService.toggleFeatured(deal.id);
      const raw =
        result?.data?.featured ??
        result?.data?.data?.featured ??
        result?.featured;
      const featured = raw === undefined ? optimistic : normalizeFeatured(raw);
      setDeals((prev) =>
        prev.map((item) =>
          String(item.id) === dealId
            ? {
                ...item,
                featured,
                published_at: result?.data?.published_at ?? item.published_at,
              }
            : item
        )
      );
      toast(featured ? 'Deal marked as featured' : 'Deal removed from featured', 'success');
    } catch (err) {
      setDeals((prev) =>
        prev.map((item) =>
          String(item.id) === dealId ? { ...item, featured: previous } : item
        )
      );
      toast(err instanceof Error ? err.message : 'Failed to update featured status', 'error');
    } finally {
      setFeaturingDealId(null);
    }
  };

  // ── Admin: Approve ─────────────────────────────────────────────────

  const handleApproveDeal = (deal: Deal) => {
    setApprovalNote('');
    setApproveModal({ deal });
  };

  const submitApproveDeal = async () => {
    if (!approveModal) return;
    setIsApproving(true);
    try {
      await dealService.approveDeal(
        approveModal.deal.id,
        listingKind,
        approvalNote.trim() || undefined
      );
      await fetchDeals();
      toast(
        isReview ? 'Deal review approved successfully!' : 'Deal approved and verified successfully!',
        'success'
      );
      setApproveModal(null);
      setApprovalNote('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to approve deal', 'error');
    } finally {
      setIsApproving(false);
    }
  };

  // ── Admin: Reject ──────────────────────────────────────────────────

  const handleRejectDeal = async () => {
    if (!rejectModal) return;
    if (!rejectionNote.trim()) {
      toast('Rejection note is mandatory.', 'error');
      return;
    }
    setIsRejecting(true);
    try {
      await dealService.rejectDeal(rejectModal.deal.id, rejectionNote.trim(), listingKind);
      await fetchDeals();
      toast('Deal rejected successfully. Rejection note has been recorded.', 'success');
      setRejectModal(null);
      setRejectionNote('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to reject deal', 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  // ── Stats Counts ───────────────────────────────────────────────────

  const pendingCount = deals.filter((d) => d.status === 'PENDING' || d.status === 'RESUBMITTED').length;
  const verifiedCount = deals.filter((d) => d.status === 'VERIFIED' && !d.published_at).length;
  const inMarketplaceCount = deals.filter((d) => d.status === 'VERIFIED' && !!d.published_at).length;
  const rejectedCount = deals.filter((d) => d.status === 'REJECTED').length;

  const displayStats = [
    { label: 'Total Deals', value: (stats?.total_deals ?? deals.length).toString(), change: stats?.changes?.total ?? '+0%', icon: <TrendingUp className="text-blue-500" />, bgColor: 'bg-blue-50' },
    { label: 'Verified Marketplace', value: (stats?.published_deals ?? verifiedCount).toString(), change: stats?.changes?.published ?? '+0%', icon: <CheckCircle className="text-green-500" />, bgColor: 'bg-green-50' },
    { label: 'Total Views', value: (stats?.total_views ?? deals.reduce((s, d) => s + d.views, 0)).toString(), change: stats?.changes?.views ?? '+0%', icon: <Visibility className="text-amber-500" />, bgColor: 'bg-amber-50' },
    { label: 'Inquiries', value: (stats?.total_inquiries ?? deals.reduce((s, d) => s + d.inquiries, 0)).toString(), change: stats?.changes?.inquiries ?? '+0%', icon: <CurrencyPound className="text-violet-500" />, bgColor: 'bg-violet-50' },
  ];

  const hasActiveFilters = searchQuery.trim() !== '' || activeTab !== 'all';

  const workflowTabs = [
    { key: 'all', label: isReview ? 'All Reviews' : 'All Deals', icon: null },
    ...(isAdmin && !isReview ? [{ key: 'my_deals', label: 'My Deals', icon: null }] : []),
    { key: 'pending', label: 'Pending Verification', icon: <Pending className="w-4 h-4" /> },
    ...(isReview ? [{ key: 'verified', label: 'Approved', icon: <CheckCircle className="w-4 h-4" /> }] : []),
    ...(isReview ? [{ key: 'in_marketplace', label: 'In Marketplace', icon: <CheckCircle className="w-4 h-4" /> }] : []),
    { key: 'rejected', label: 'Rejection', icon: <ThumbDown className="w-4 h-4" /> },
  ] as const;

  // ──────────────────────────────── Render ──────────────────────────────────

  return (
    <>
      <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{sectionTitle}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {sectionSubtitle}
            </p>
          </div>
          {!isReview && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors shadow-lg shadow-blue-900/10 flex-shrink-0"
            >
              <Add className="w-5 h-5" /> Add New Deal
            </button>
          )}
        </div>

        {/* Stats Grid */}
        {!isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayStats.map((item) => (
              <div key={item.label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{item.label}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-2">{item.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${item.bgColor} flex items-center justify-center`}>
                  {item.icon}
                </div>
              </div>
            ))}
          </div>
        )}

          {/* Workflow tabs */}
          {isAdmin && (
            <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
              {workflowTabs.map((tab) => {
                const isActive = activeTab === tab.key;
                const count =
                  tab.key === 'pending' ? pendingCount
                  : tab.key === 'rejected' ? rejectedCount
                  : tab.key === 'verified' ? verifiedCount
                  : tab.key === 'in_marketplace' ? inMarketplaceCount
                  : null;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      isActive
                        ? 'bg-blue-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 bg-white border border-slate-200'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {count !== null && count > 0 && (
                      <span className={`ml-1 px-1.5 rounded-full text-xs font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Search */}
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search deals by title, location or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-3 focus:ring-blue-100 transition-all outline-none"
              />
            </div>
          </div>

          {/* Loading */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-sm text-slate-600">Loading deals...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {deals.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                    <Business className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-1.5 sm:mb-2">No deals found</h3>
                  <p className="text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6 px-4">
                    {hasActiveFilters
                      ? 'No deals match your current filters. Try adjusting your search or filters.'
                      : isAdmin
                        ? isReview
                          ? 'No deal reviews have been submitted yet.'
                          : 'No deals have been submitted yet.'
                        : isReview
                          ? "You haven't submitted any deal reviews yet."
                          : "You haven't added any deals yet. Click 'Add New Deal' to create your first investment opportunity."}
                  </p>
                  {!isAdmin && deals.length === 0 && !hasActiveFilters && (
                    <button onClick={handleOpenAddModal} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors">
                      <Add className="w-4 h-4" /> Add Your First Deal
                    </button>
                  )}
                </div>
              ) : (
                <>
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-semibold text-slate-600 whitespace-nowrap">Deal</th>
                      {isAdmin && <th className="py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-semibold text-slate-600 whitespace-nowrap">Creator</th>}
                      <th className="py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-semibold text-slate-600 whitespace-nowrap">Location</th>
                      <th className="py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-semibold text-slate-600 whitespace-nowrap">Price</th>
                      <th className="py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-semibold text-slate-600 whitespace-nowrap">ROI</th>
                      <th className="py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-semibold text-slate-600 whitespace-nowrap">Workflow Status</th>
                      {!isReview && (
                        <th className="py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-semibold text-slate-600 whitespace-nowrap">Activity</th>
                      )}
                      <th className="py-3 px-3 sm:px-4 text-right text-xs sm:text-sm font-semibold text-slate-600 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deals.map((deal) => {
                      const statusConfig = getStatusColors(deal.status, deal);
                      const status = String(deal.status || '').toUpperCase();
                      const images = deal.images || (deal.image_url ? [deal.image_url] : []);
                      
                      const canEdit = isAdmin
                        ? status !== 'CLOSED' && status !== 'REJECTED'
                        : status === 'DRAFT' || status === 'REJECTED';
                      const canDelete = isAdmin && !isReview;

                      return (
                        <tr key={deal.id} className="border-b border-slate-100 hover:bg-slate-50/40 transition-colors">
                          {/* Title */}
                          <td className="py-4 px-4">
                            <div className="font-bold text-slate-800 text-base">{deal.title}</div>
                            <div className="text-xs text-slate-400 mt-1">
                              Added: {new Date(deal.created_at).toLocaleDateString()}
                            </div>
                            {/* Thumbnails */}
                            {images.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {images.slice(0, 3).map((img, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => openImageViewer(images, idx)}
                                    className="w-8 h-8 rounded border border-slate-200 overflow-hidden hover:border-blue-400 transition-colors"
                                  >
                                    <img
                                      src={getImageUrl(img)}
                                      alt={`Thumbnail ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                ))}
                                {images.length > 3 && (
                                  <span className="w-8 h-8 rounded border border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 flex items-center justify-center">
                                    +{images.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                            {deal.status === 'REJECTED' && deal.rejection_note && (
                              <div className="mt-2 text-xs text-red-700 bg-red-50 p-2 rounded-lg border border-red-100 max-w-[280px]">
                                <strong>Note:</strong> {deal.rejection_note}
                              </div>
                            )}
                          </td>

                          {/* Creator */}
                          {isAdmin && (
                            <td className="py-4 px-4">
                              <div className="font-semibold text-slate-700">
                                {deal.user?.first_name} {deal.user?.last_name || ''}
                              </div>
                              <div className="text-xs text-slate-400 uppercase font-medium">
                                Role: {deal.submitted_by_role || 'LEARNER'}
                              </div>
                            </td>
                          )}

                          {/* Location */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1 text-slate-600 font-medium">
                              <LocationOn className="w-4 h-4 text-slate-400" />
                              {deal.location}
                            </div>
                          </td>

                          {/* Price */}
                          <td className="py-4 px-4">
                            <div className="font-bold text-blue-900">{deal.formatted_price || (deal.price != null && deal.price !== '' ? formatPrice(deal.price) : '—')}</div>
                            {deal.occupancy && (
                              <div className="text-xs text-slate-500 mt-0.5">Occupancy: {deal.occupancy}%</div>
                            )}
                          </td>

                          {/* ROI */}
                          <td className="py-3 px-3 sm:px-4">
                            <div className="font-semibold text-green-600 text-xs sm:text-sm">
                              {deal.roi == null || deal.roi === ''
                                ? '—'
                                : typeof deal.roi === 'string'
                                  ? deal.roi.includes('%')
                                    ? deal.roi
                                    : `${deal.roi}%`
                                  : `${deal.roi}%`}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                              {statusConfig.icon}
                              {statusConfig.label}
                            </span>
                            {isReview && deal.status === 'VERIFIED' && !deal.published_at && (
                              <div className="mt-1 text-xs text-violet-600 font-medium">Waiting for learner to send to marketplace</div>
                            )}
                            {isReview && deal.status === 'VERIFIED' && !!deal.published_at && (
                              <div className="mt-1 text-xs text-emerald-700 font-medium">Live on Deal Marketplace — still kept in Deal Review</div>
                            )}
                          </td>

                          {/* Activity — marketplace only */}
                          {!isReview && (
                            <td className="py-4 px-4">
                              <div className="text-xs text-slate-500">Views: <span className="font-bold text-slate-700">{deal.views}</span></div>
                              <div className="text-xs text-slate-500 mt-1">Inquiries: <span className="font-bold text-violet-600">{deal.inquiries}</span></div>
                            </td>
                          )}

                          {/* Actions */}
                          <td className="py-4 px-4 text-right">
                            <div className="flex gap-2 justify-end items-center">


                              {/* Admin moderation verify/reject */}
                              {isAdmin && (deal.status === 'PENDING' || deal.status === 'RESUBMITTED') && (
                                <>
                                  <button
                                    onClick={() => handleApproveDeal(deal)}
                                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                                  >
                                    <ThumbUp className="w-3.5 h-3.5" /> {isReview ? 'Approve' : 'Verify'}
                                  </button>
                                  <button
                                    onClick={() => { setRejectModal({ deal }); setRejectionNote(''); }}
                                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                                  >
                                    <ThumbDown className="w-3.5 h-3.5" /> Reject
                                  </button>
                                </>
                              )}

                              {/* Close / feature — marketplace verified deals only */}
                              {(deal.status === 'VERIFIED' ||
                                String(deal.status).toLowerCase() === 'published') &&
                                !isReview && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      void handleToggleFeatured(deal);
                                    }}
                                    disabled={featuringDealId === String(deal.id)}
                                    className={`p-1.5 border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait ${
                                      deal.featured
                                        ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                    }`}
                                    title={deal.featured ? 'Unfeature deal' : 'Feature deal'}
                                  >
                                    <Star className={`w-4 h-4 ${deal.featured ? 'fill-current' : ''}`} />
                                  </button>
                                  <button
                                    onClick={() => handleClose(deal.id)}
                                    className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                                  >
                                    <Block className="w-3.5 h-3.5" /> Close
                                  </button>
                                </>
                              )}

                              {/* Edit */}
                              {canEdit && (
                                <button
                                  onClick={() => handleEdit(deal)}
                                  className="p-1.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete */}
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(deal.id)}
                                  className="p-1.5 bg-red-50 border border-red-100 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                  title="Delete"
                                >
                                  <Delete className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              {pagination.lastPage > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                  <button
                    type="button"
                    disabled={pagination.currentPage === 1}
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                    className="px-4 py-2 bg-blue-50 text-blue-900 border border-blue-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-100 transition-all font-semibold text-xs cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-slate-600 font-medium text-xs">
                    Page {pagination.currentPage} of {pagination.lastPage}
                  </span>
                  <button
                    type="button"
                    disabled={pagination.currentPage === pagination.lastPage}
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                    className="px-4 py-2 bg-blue-50 text-blue-900 border border-blue-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-100 transition-all font-semibold text-xs cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
                </>
              )}
            </div>
          )}
      </div>

      {/* ── Add / Edit Deal Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingDeal
                    ? isReview
                      ? 'Modify Deal Review'
                      : 'Modify Investment Deal'
                    : 'Add New Marketplace Deal'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Fill in property financials and metadata. Fields marked * are required.
                </p>
              </div>
              <button onClick={handleCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <Close className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Side */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Property Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={newDeal.title}
                      onChange={handleInputChange}
                      placeholder="Downtown Commercial Plaza"
                      className={fieldInputClass(Boolean(fieldErrors.title))}
                    />
                    {fieldErrors.title && <p className="text-xs text-red-500 mt-1">{fieldErrors.title}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Location *</label>
                    <input
                      type="text"
                      name="location"
                      value={newDeal.location}
                      onChange={handleInputChange}
                      placeholder="Chicago, IL"
                      className={fieldInputClass(Boolean(fieldErrors.location))}
                    />
                    {fieldErrors.location && <p className="text-xs text-red-500 mt-1">{fieldErrors.location}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Price <span className="font-normal text-slate-400">(optional)</span></label>
                      <div className="relative">
                        <CurrencyPound className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
                        <input type="text" name="price" value={newDeal.price} onChange={handleInputChange} placeholder="2450000" className={fieldInputClass(Boolean(fieldErrors.price), 'pl-9 sm:pl-10')} />
                      </div>
                      {fieldErrors.price && <p className="text-xs text-red-600 mt-1">{fieldErrors.price}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Property Type <span className="font-normal text-slate-400">(optional)</span></label>
                      <select name="property_type" value={newDeal.property_type} onChange={handleInputChange} className={fieldInputClass(Boolean(fieldErrors.property_type))}>
                        <option value="">Select property type</option>
                        {propertyTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description <span className="font-normal text-slate-400">(optional)</span></label>
                    <textarea
                      name="description"
                      value={newDeal.description}
                      onChange={handleInputChange}
                      placeholder="Describe occupancy, potential, location highlights..."
                      rows={4}
                      className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-3 focus:ring-blue-100 outline-none resize-none placeholder:text-slate-400 transition-all"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">ROI (%) <span className="font-normal text-slate-400">(optional)</span></label>
                    <input type="text" name="roi" value={newDeal.roi} onChange={handleInputChange} placeholder="12.5" className={fieldInputClass(Boolean(fieldErrors.roi))} />
                    {fieldErrors.roi && <p className="text-xs text-red-600 mt-1">{fieldErrors.roi}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Occupancy (%)</label>
                    <input
                      type="text"
                      name="occupancy"
                      value={newDeal.occupancy}
                      onChange={handleInputChange}
                      placeholder="92"
                      className={fieldInputClass(Boolean(fieldErrors.occupancy))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Images</label>
                    
                    {/* Existing Images */}
                    {(newDeal.existingImages || []).length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 mb-2">Current Images:</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {(newDeal.existingImages || []).map((imageUrl, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={getImageUrl(imageUrl)}
                                alt={`Existing image ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border-2 border-green-200 group-hover:border-red-400 transition-colors"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveExistingImage(imageUrl)}
                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-all shadow-lg opacity-0 group-hover:opacity-100"
                              >
                                <Close className="w-3 h-3" />
                              </button>
                              <div className="absolute bottom-1 left-1 bg-green-600/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                                Existing
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New Images Upload */}
                    <div 
                      className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50 hover:bg-slate-100/50 hover:border-blue-400 transition-all cursor-pointer"
                      onClick={() => document.getElementById('admin-image-upload')?.click()}
                    >
                      <CloudUpload className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-600">
                        {(newDeal.images || []).length > 0 
                          ? `${(newDeal.images || []).length} new image(s) selected` 
                          : 'Add new images (multiple allowed)'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {(newDeal.images || []).length > 0 
                          ? `Click to add more images` 
                          : 'Click to browse or drag and drop'}
                      </p>
                      <input 
                        id="admin-image-upload"
                        type="file" 
                        accept="image/*" 
                        multiple 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </div>
                    
                    {/* New image previews */}
                    {(newDeal.images || []).length > 0 && (
                      <div className="mt-3">
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {(newDeal.images || []).map((file, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`New image ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border-2 border-blue-200 group-hover:border-red-400 transition-colors"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveNewImage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-all shadow-lg opacity-0 group-hover:opacity-100"
                              >
                                <Close className="w-3 h-3" />
                              </button>
                              <div className="absolute bottom-1 left-1 bg-blue-600/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                                New
                              </div>
                            </div>
                          ))}
                        </div>
                        {(newDeal.images || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => setNewDeal(prev => ({ ...prev, images: [] }))}
                            className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium"
                          >
                            Clear all new images
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isAdmin && !isReview && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <label className="flex items-center gap-2.5 text-sm font-bold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newDeal.publish_immediately}
                          onChange={handleCheckboxChange}
                          name="publish_immediately"
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        Publish Immediately
                      </label>
                      <p className="text-xs text-slate-500 mt-1 ml-6">
                        If checked, the deal is automatically marked as VERIFIED and published to all learners immediately.
                      </p>
                    </div>
                  )}
                  {isAdmin && isReview && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <p className="text-sm font-semibold text-amber-900">Private review listing</p>
                      <p className="text-xs text-amber-800 mt-1">
                        Approved deal reviews stay visible only to the submitting learner and admins until they choose to send it to the marketplace.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-slate-100 pt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-5 py-2.5 border border-slate-300 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {editingDeal
                        ? 'Update Opportunity'
                        : isAdmin
                          ? isReview
                            ? 'Create Review'
                            : newDeal.publish_immediately
                              ? 'Create & Publish'
                              : 'Create (Not Published)'
                          : 'Submit for Verification'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Admin Approval Modal ── */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {isReview ? 'Approve Deal Review' : 'Verify Deal'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Target: {approveModal.deal.title}</p>
              </div>
              <button
                onClick={() => setApproveModal(null)}
                className="p-1 hover:bg-slate-100 rounded-full"
                disabled={isApproving}
              >
                <Close className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-100 flex items-start gap-2">
                <InfoOutlined className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  {isReview
                    ? 'Add an optional review note for the learner. The deal stays private until they send it to the marketplace.'
                    : 'Add an optional verification note for the learner before approving this deal.'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Review / Approval Note (optional)
                </label>
                <textarea
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="e.g. Looks good — comps and yield check out. Ready for learner to proceed."
                  rows={4}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:border-emerald-500 focus:ring-3 focus:ring-emerald-100 outline-none resize-none"
                  maxLength={1000}
                />
              </div>
            </div>
            <div className="p-6 pt-0 border-t border-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setApproveModal(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-500 bg-slate-50 rounded-xl hover:bg-slate-100"
                disabled={isApproving}
              >
                Cancel
              </button>
              <button
                onClick={submitApproveDeal}
                disabled={isApproving}
                className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApproving
                  ? 'Approving...'
                  : isReview
                    ? 'Approve Review'
                    : 'Approve & Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Admin Rejection Modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Reject Deal Submission</h3>
                <p className="text-xs text-slate-400 mt-0.5">Target: {rejectModal.deal.title}</p>
              </div>
              <button onClick={() => setRejectModal(null)} className="p-1 hover:bg-slate-100 rounded-full">
                <Close className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-red-50 text-red-800 text-xs rounded-xl border border-red-100 flex items-start gap-2">
                <InfoOutlined className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Provide a clear, mandatory note explaining why this deal does not meet specifications. The submitter must fix the issues to resubmit.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Rejection Note (Mandatory) *
                </label>
                <textarea
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="e.g. Price cap rate mismatch, please upload authentic document reports..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:border-red-500 focus:ring-3 focus:ring-red-100 outline-none resize-none"
                  maxLength={1000}
                />
              </div>
            </div>
            <div className="p-6 pt-0 border-t border-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-500 bg-slate-50 rounded-xl hover:bg-slate-100"
                disabled={isRejecting}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectDeal}
                disabled={isRejecting || !rejectionNote.trim()}
                className="px-4 py-2 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRejecting ? 'Rejecting...' : 'Reject Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image Viewer */}
      {imageViewerOpen && (
        <FullScreenImageViewer 
          images={viewerImages} 
          initialIndex={viewerInitialIndex}
          onClose={() => setImageViewerOpen(false)} 
        />
      )}

      {confirmDialog && (
        <ConfirmDialog
          open={!!confirmDialog}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          variant={confirmDialog.variant as any}
          loading={confirmLoading}
          onConfirm={runConfirmAction}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </>
  );
};

export default DealManager;