import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { dealService } from '../../services/dealService';
import chatService from '../../services/chatService';
import { resolveStorageUrl } from '../../utils/mediaUrl';
import { appendMediaToFormData, MEDIA_UPLOAD_PRESETS } from '../../services/mediaUploadService';
import toast from 'react-hot-toast';
import { mapDealsTabToQueryTab, mapQueryTabToDealsTab } from '../../utils/learnTabRouting';
import {
  Favorite,
  FavoriteBorder,
  Share,
  BusinessCenter,
  LocationOn,
  CurrencyPound,
  Star,
  Person,
  Search,
  Close,
  Analytics,
  FilterList,
  Sort,
  Email,
  Phone,
  Chat,
  Refresh,
  ArrowBack,
  Add,
  Edit,
  Delete,
  CloudUpload,
  Pending,
  Block,
  CheckCircle,
  HourglassEmpty,
  ThumbDown,
  InfoOutlined,
  Storefront,
  Groups,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from '@mui/icons-material';

interface Deal {
  id: number;
  title: string;
  type: 'residential' | 'commercial' | 'industrial' | 'retail' | 'mixed-use' | string;
  status: 'DRAFT' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'RESUBMITTED' | 'CLOSED';
  listing_kind?: 'marketplace' | 'review';
  rejection_note?: string | null;
  propertyType: string;
  location: string;
  price: number;
  estimatedValue: number;
  roi: number;
  cashFlow: number;
  image: string;
  images?: string[];
  featured: boolean;
  mentor: string;
  mentorAvatar: string;
  mentorId: number;
  mentorEmail?: string;
  dateAdded: string;
  favorite: boolean;
  inquiries: number;
  views: number;
  publishedAt?: string | null;
  description: string;
  occupancy: number | undefined;
  formatted_price?: string;
  property_type: string;
  details: {
    sqft: number;
    yearBuilt: number;
    lotSize: string;
  };
  analysis: {
    score: number;
    risk: 'low' | 'medium' | 'high';
    marketTrend: string;
    highlights: string[];
    notes: string;
  };
}

type DealFormData = {
  title: string;
  location: string;
  price: string;
  roi: string;
  description: string;
  property_type: string;
  occupancy: string;
  images: File[];
};

function parseNumericInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/[,$%\s]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
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
};

const propertyTypes = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'residential', label: 'Residential' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'retail', label: 'Retail' },
  { value: 'mixed-use', label: 'Mixed Use' },
];

function parseHighlights(description?: string): string[] {
  if (!description) return [];
  return description
    .split(/[.\n]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 10)
    .slice(0, 3);
}

function mapApiDeal(apiDeal: any, favoriteIds: Set<number> = new Set()): Deal {
  const mentorName = apiDeal.user
    ? `${apiDeal.user.first_name || ''} ${apiDeal.user.last_name || ''}`.trim()
    : 'Unknown Member';

  const mentorInitials = apiDeal.user?.first_name
    ? `${apiDeal.user.first_name.charAt(0)}${apiDeal.user.last_name?.charAt(0) || ''}`.toUpperCase()
    : 'UM';

  const images = apiDeal.images || (apiDeal.image_url ? [apiDeal.image_url] : []);

  return {
    id: apiDeal.id,
    title: apiDeal.title,
    type: apiDeal.property_type || '',
    status: apiDeal.status,
    rejection_note: apiDeal.rejection_note,
    propertyType: apiDeal.property_type,
    location: apiDeal.location,
    price: apiDeal.price != null && apiDeal.price !== '' ? parseFloat(apiDeal.price) : 0,
    estimatedValue: apiDeal.price != null && apiDeal.price !== '' ? parseFloat(apiDeal.price) * 1.15 : 0,
    roi: apiDeal.roi != null && apiDeal.roi !== '' ? parseFloat(apiDeal.roi) : 0,
    cashFlow: parseFloat(apiDeal.cash_flow || 0),
    image: apiDeal.image_url || (images.length > 0 ? images[0] : ''),
    images: images,
    featured: apiDeal.featured || false,
    mentor: mentorName,
    mentorAvatar: mentorInitials,
    mentorId: apiDeal.created_by,
    mentorEmail: apiDeal.user?.email || undefined,
    dateAdded: apiDeal.published_at || apiDeal.created_at,
    favorite: favoriteIds.has(apiDeal.id),
    inquiries: apiDeal.inquiries || 0,
    views: apiDeal.views || 0,
    publishedAt: apiDeal.published_at,
    description: apiDeal.description,
    occupancy: apiDeal.occupancy ? parseFloat(apiDeal.occupancy) : undefined,
    listing_kind: apiDeal.listing_kind || 'marketplace',
    property_type: apiDeal.property_type || '',
    details: {
      sqft: apiDeal.sqft || 0,
      yearBuilt: apiDeal.year_built || 2020,
      lotSize: apiDeal.lot_size || 'N/A',
    },
    analysis: {
      score: Math.min(Math.floor(parseFloat(apiDeal.roi || 0) * 6), 95),
      risk: parseFloat(apiDeal.roi || 0) > 15 ? 'low' : parseFloat(apiDeal.roi || 0) > 10 ? 'medium' : 'high',
      marketTrend: 'stable',
      highlights: parseHighlights(apiDeal.description),
      notes: apiDeal.description || '',
    },
  };
}

const resolveDealsTabFromUrl = (tab: string | null, isReview = false): string => {
  const mapped = mapQueryTabToDealsTab(tab);
  if (isReview) {
    if (mapped && ['my_deals', 'pending', 'rejected', 'verified'].includes(mapped)) {
      return mapped;
    }
    return 'my_deals';
  }
  return mapped ?? 'all';
};

type ListingKind = 'marketplace' | 'review';

interface DealsProps {
  listingKind?: ListingKind;
}

// Full-Screen Image Viewer Component with Slider
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

const Deals: React.FC<DealsProps> = ({ listingKind = 'marketplace' }) => {
  const isReview = listingKind === 'review';
  const sectionTitle = isReview ? 'Deal Review' : 'Deal Marketplace';
  const sectionSubtitle = isReview
    ? 'Submit private deal reviews for admin approval. Only you and admins can see these until you send them to the marketplace.'
    : 'Browse and analyze investment deals, search locations, or submit property proposals.';
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlTab = new URLSearchParams(window.location.search).get('tab');
      return resolveDealsTabFromUrl(urlTab, isReview);
    }
    return resolveDealsTabFromUrl(searchParams.get('tab'), isReview);
  });
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFeaturedOnly, setIsFeaturedOnly] = useState(false);
  const [dealToShare, setDealToShare] = useState<Deal | null>(null);
  const [messageModalDeal, setMessageModalDeal] = useState<Deal | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Image viewer state
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  
  // Create / Edit Form State
  const [showFormModal, setShowFormModal] = useState(false);
  const [formDeal, setFormDeal] = useState<DealFormData>(BLANK_FORM);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof DealFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendToMarketplaceDeal, setSendToMarketplaceDeal] = useState<Deal | null>(null);
  const [isSendingToMarketplace, setIsSendingToMarketplace] = useState(false);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    perPage: 10,
    total: 0,
  });

  // Current authenticated user info
  const getCurrentUser = () => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  };
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id;

  const isDealOwner = (deal: Deal) => Number(deal.mentorId) === Number(currentUserId);

  const canLearnerEditDeal = (deal: Deal) =>
    isDealOwner(deal) && (deal.status === 'DRAFT' || deal.status === 'REJECTED');

  const getOwnerEditLabel = (status: Deal['status']) => {
    if (status === 'REJECTED') return 'Resubmit';
    return 'Edit';
  };

  // Get image URL with fallback
  const getImageUrl = (imageUrl: string | undefined | null) => {
    if (!imageUrl || imageUrl === 'null' || imageUrl === 'undefined') {
      return '/images/placeholder-property.jpg';
    }
    return resolveStorageUrl(imageUrl) ?? '/images/placeholder-property.jpg';
  };

  // Sync sub-tab from URL on load / browser back-forward
  useEffect(() => {
    const mappedTab = resolveDealsTabFromUrl(searchParams.get('tab'), isReview);

    setActiveTab((prev) => {
      if (prev === mappedTab) return prev;
      setPagination((p) => ({ ...p, currentPage: 1 }));
      setSelectedDeal(null);
      if (!searchParams.get('dealId')) {
        sessionStorage.removeItem('learner_open_deal_id');
      }
      return mappedTab;
    });
  }, [searchParams, isReview]);

  // Fetch deals from API
  const fetchDeals = async (tabOverride?: string) => {
    setLoading(true);
    setError(null);

    const tab = tabOverride ?? activeTab;

    try {
      const response = await dealService.getLearnerDeals({
        tab: isReview ? (tab === 'all' ? 'my_deals' : tab) : tab,
        search: searchTerm || undefined,
        featured: !isReview && tab === 'featured' ? true : isFeaturedOnly || undefined,
        per_page: pagination.perPage,
        page: tabOverride ? 1 : pagination.currentPage,
        sort_by: isReview ? 'created_at' : 'published_at',
        sort_order: 'desc',
        listing_kind: listingKind,
      });

      if (response.success) {
        let favoriteIds = new Set<number>();
        if (!isReview) {
          try {
            const favoritesResponse = await dealService.getFavoriteDeals({ per_page: 500 });
            const favorites = Array.isArray(favoritesResponse.data)
              ? favoritesResponse.data
              : [];
            favoriteIds = new Set(favorites.map((item: { id: number }) => item.id));
          } catch (favoriteErr) {
            console.warn('Could not load favorite deals:', favoriteErr);
          }
        }

        const rows = response.data?.data ?? response.data ?? [];
        const mappedDeals = (Array.isArray(rows) ? rows : []).map((apiDeal: any) =>
          mapApiDeal(apiDeal, favoriteIds)
        );
        setDeals(mappedDeals);

        if (response.data?.current_page) {
          setPagination({
            currentPage: response.data.current_page,
            lastPage: response.data.last_page,
            perPage: response.data.per_page,
            total: response.data.total,
          });
        } else if (tabOverride) {
          setPagination((prev) => ({ ...prev, currentPage: 1 }));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch deals');
      console.error('Error fetching deals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [activeTab, searchTerm, pagination.currentPage, isFeaturedOnly, listingKind]);

  const openDealById = useCallback(async (dealId: number) => {
    if (!Number.isFinite(dealId)) {
      sessionStorage.removeItem('learner_open_deal_id');
      return;
    }

    const removeDealIdFromUrl = () => {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('dealId')) {
          url.searchParams.delete('dealId');
          window.history.replaceState(null, '', url.toString());
        }
      } catch {
        // ignore if URL cannot be parsed
      }
    };

    try {
      const response = await dealService.getLearnerDealById(dealId);
      if (response.success && response.data) {
        let fetchedDeal = mapApiDeal(response.data);

        if (!isReview) {
          try {
            const favoriteStatus = await dealService.getFavoriteStatus(dealId);
            if (favoriteStatus.success && favoriteStatus.data?.saved !== undefined) {
              fetchedDeal = { ...fetchedDeal, favorite: favoriteStatus.data.saved };
            }
          } catch (favoriteErr) {
            console.warn('Could not load favorite status:', favoriteErr);
          }
        }

        setSelectedDeal(fetchedDeal);

        let updatedViews = fetchedDeal.views;
        try {
          const viewResult = await dealService.recordView(dealId);
          if (viewResult.success && viewResult.data?.views !== undefined) {
            updatedViews = viewResult.data.views;
          }
        } catch (viewErr) {
          console.warn('Could not record deal view:', viewErr);
        }

        setDeals((previousDeals) =>
          previousDeals.map((item) =>
            item.id === dealId
              ? {
                  ...item,
                  views: updatedViews,
                  inquiries: fetchedDeal.inquiries,
                  image: fetchedDeal.image,
                  images: fetchedDeal.images,
                  featured: fetchedDeal.featured,
                }
              : item
          )
        );
        setSelectedDeal((prevDeal) => prevDeal ? { ...prevDeal, views: updatedViews } : prevDeal);
        sessionStorage.removeItem('learner_open_deal_id');
        removeDealIdFromUrl();
        return;
      }
    } catch (err) {
      console.error('Failed to open deal:', err);
    }

    const existingDeal = deals.find((item) => item.id === dealId);
    if (existingDeal) {
      setSelectedDeal(existingDeal);
      sessionStorage.removeItem('learner_open_deal_id');
      removeDealIdFromUrl();
    }
  }, [deals]);

  useEffect(() => {
    const dealIdFromUrl = searchParams.get('dealId');
    const dealIdFromStorage = sessionStorage.getItem('learner_open_deal_id');
    const rawDealId = dealIdFromUrl || dealIdFromStorage;
    if (!rawDealId) return;

    const dealId = Number(rawDealId);
    if (!Number.isFinite(dealId)) {
      sessionStorage.removeItem('learner_open_deal_id');
      return;
    }

    void openDealById(dealId);
  }, [searchParams, openDealById]);

  useEffect(() => {
    const handleOpenDeal = (event: Event) => {
      const customEvent = event as CustomEvent<{ dealId?: number }>;
      const dealId = customEvent.detail?.dealId;
      if (dealId) {
        void openDealById(dealId);
      }
    };

    window.addEventListener('learner-open-deal', handleOpenDeal);
    return () => window.removeEventListener('learner-open-deal', handleOpenDeal);
  }, [openDealById]);

  // Event Handlers
  const handleToggleFavorite = async (dealId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReview) return;
    try {
      const deal =
        deals.find((d) => d.id === dealId) ??
        (selectedDeal?.id === dealId ? selectedDeal : null);
      if (!deal) {
        toast.error('Unable to save this deal right now.');
        return;
      }

      const result = await dealService.toggleFavorite(dealId);
      const saved = Boolean(result.data?.saved ?? result.saved ?? !deal.favorite);

      setDeals((prev) =>
        prev.map((item) => (item.id === dealId ? { ...item, favorite: saved } : item))
      );

      if (selectedDeal?.id === dealId) {
        setSelectedDeal((prev) => (prev ? { ...prev, favorite: saved } : prev));
      }

      toast.success(saved ? 'Deal saved to favorites!' : 'Deal removed from favorites.');
    } catch (err: any) {
      console.error('Failed to toggle favorite:', err);
      toast.error(err.message || 'Failed to update favorite.');
    }
  };

  const handleShareDeal = (deal: Deal, e: React.MouseEvent) => {
    e.stopPropagation();
    setDealToShare(deal);
    setShowShareModal(true);
  };

  const handleShareAction = (method: string) => {
    if (!dealToShare) return;

    const shareUrl = `${window.location.origin}/learn?tab=deals&dealId=${dealToShare.id}`;
    const shareText = `Check out this investment property: ${dealToShare.title} - £${dealToShare.price.toLocaleString()}`;

    switch (method) {
      case 'copy':
        navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        toast.success('Link copied to clipboard!');
        break;
      case 'email':
        window.open(
          `mailto:?subject=${encodeURIComponent(dealToShare.title)}&body=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`,
          '_blank'
        );
        break;
    }

    setShowShareModal(false);
  };

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    setSelectedDeal(null);
    sessionStorage.removeItem('learner_open_deal_id');

    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', mapDealsTabToQueryTab(tab));
    params.delete('dealId');

    const basePath = pathname || (isReview ? '/learn/deal-review' : '/learn/deals');
    router.push(`${basePath}?${params.toString()}`, { scroll: false });
  }, [router, searchParams, pathname, isReview]);

  const recordDealInquiry = async (
    dealId: number,
    contactType: 'email' | 'call' | 'message',
    message?: string
  ) => {
    if (contactType === 'email') {
      return {
        success: true,
        data: {
          deal_id: dealId,
          contact_type: 'email',
          counted: false,
        },
        message: 'Email opened in your mail app. Inquiry count was not changed.',
      };
    }

    const response = await dealService.recordInquiry(dealId, {
      contact_type: contactType,
      message,
    });

    if (response.success) {
      setDeals((prev) =>
        prev.map((deal) =>
          deal.id === dealId
            ? { ...deal, inquiries: response.data?.inquiries ?? deal.inquiries + 1 }
            : deal
        )
      );
    }

    return response;
  };

  const openMentorEmail = (deal: Deal) => {
    const subject = encodeURIComponent(`Inquiry: ${deal.title}`);
    const body = encodeURIComponent(
      `Hi ${deal.mentor},\n\nI am interested in the property deal "${deal.title}" in ${deal.location} (£${deal.price.toLocaleString()}).\n\nPlease share more details.\n\nThank you.`
    );
    const mailto = `mailto:${deal.mentorEmail}?subject=${subject}&body=${body}`;
    const popup = window.open(mailto, '_blank');
    if (!popup) {
      window.location.href = mailto;
    }
  };

  const handleContactMentor = async (deal: Deal, method: 'email' | 'phone' | 'message') => {
    try {
      if (method === 'email') {
        if (!deal.mentorEmail) {
          toast.error(`No email address is available for ${deal.mentor}.`);
          return;
        }

        openMentorEmail(deal);
        toast.success(`Opening your email app to contact ${deal.mentor}.`);
        return;
      }

      if (method === 'phone') {
        const confirmed = window.confirm(
          `Request a call with ${deal.mentor} about "${deal.title}"? They will reach out to schedule a time.`
        );
        if (!confirmed) return;

        await recordDealInquiry(deal.id, 'call', `Call request for ${deal.title}`);
        toast.success(`Call request sent! ${deal.mentor} will contact you to schedule a call.`);
        return;
      }

      setMessageModalDeal(deal);
      setMessageText('');
    } catch (err) {
      console.error('Failed to contact mentor:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to contact mentor.');
    }
  };

  const handleSendMessageToMentor = async () => {
    if (!messageModalDeal) return;

    const trimmed = messageText.trim();
    if (!trimmed) {
      toast.error('Please enter a message.');
      return;
    }

    setSendingMessage(true);
    try {
      const deal = messageModalDeal;
      const chatPayload = `Regarding "${deal.title}" (${deal.location}): ${trimmed}`;

      await recordDealInquiry(deal.id, 'message', chatPayload);

      try {
        const chat = (await chatService.createPrivateChat(deal.mentorId)) as { id?: number };
        if (chat?.id) {
          await chatService.sendMessage(chat.id, { message: chatPayload });
          sessionStorage.setItem('learner_open_chat_id', String(chat.id));
        }
      } catch (chatErr) {
        console.warn('Could not open in-app chat:', chatErr);
      }

      setMessageModalDeal(null);
      setMessageText('');
      toast.success(`Message sent to ${deal.mentor}!`);

      window.dispatchEvent(new CustomEvent('learner-navigate-tab', { detail: { tab: 'Chat' } }));
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleViewDeal = async (deal: Deal) => {
    try {
      await openDealById(deal.id);
    } catch (err) {
      console.error('Failed to load deal details:', err);
      setSelectedDeal(deal);
    }
  };

  // ── Learner Form Handlers ──────────────────────────────────────────

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormDeal((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof DealFormData]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Update the handleFileChange to handle multiple files properly
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;
  
  setFormDeal((prev) => {
    // Combine existing images with new ones
    const existingImages = prev.images || [];
    const newImages = [...existingImages, ...files];
    return { ...prev, images: newImages };
  });
};

// Update the handleRemoveImage to properly filter
const handleRemoveImage = (index: number) => {
  setFormDeal((prev) => ({
    ...prev,
    images: prev.images.filter((_, i) => i !== index),
  }));
};

  const handleOpenAddModal = () => {
    setFormDeal({ ...BLANK_FORM, images: [] });
    setEditingDeal(null);
    setFormErrors({});
    setShowFormModal(true);
  };

  const handleEditDeal = (deal: Deal, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deal.status === 'CLOSED') {
      toast.error('Closed deals cannot be edited.');
      return;
    }
    if (!canLearnerEditDeal(deal)) {
      toast.error('Verified and pending deals cannot be edited.');
      return;
    }
    setEditingDeal(deal);
    setFormDeal({
      title: deal.title,
      location: deal.location,
      price: deal.price.toString(),
      roi: deal.roi.toString(),
      description: deal.description || '',
      property_type: deal.propertyType || '',
      occupancy: deal.occupancy?.toString() || '',
      images: [],
    });
    setFormErrors({});
    setShowFormModal(true);
  };

  const handleDeleteDeal = async (dealId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this deal?')) return;
    try {
      await dealService.learnerDeleteDeal(dealId, listingKind);
      toast.success('Deal deleted successfully!');
      fetchDeals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete deal.');
    }
  };

  const handlePublishDeal = async (dealId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to publish this deal? Once published, it will be visible to all members in the marketplace.')) return;
    try {
      await dealService.publishLearnerDeal(dealId);
      toast.success('Deal published successfully!');
      fetchDeals();
      if (selectedDeal && selectedDeal.id === dealId) {
        setSelectedDeal(prev => prev ? { ...prev, publishedAt: new Date().toISOString() } : null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish deal.');
    }
  };

  const handleSendToMarketplace = (dealId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const deal =
      deals.find((d) => d.id === dealId) ||
      (selectedDeal?.id === dealId ? selectedDeal : null);
    if (!deal) return;
    setSendToMarketplaceDeal(deal);
  };

  const confirmSendToMarketplace = async () => {
    if (!sendToMarketplaceDeal || isSendingToMarketplace) return;
    const dealId = sendToMarketplaceDeal.id;
    setIsSendingToMarketplace(true);
    try {
      await dealService.sendDealToMarketplace(dealId);
      toast.success('Deal sent to marketplace successfully!');
      setSendToMarketplaceDeal(null);
      const publishedAt = new Date().toISOString();
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, publishedAt } : d))
      );
      if (selectedDeal && selectedDeal.id === dealId) {
        setSelectedDeal((prev) => (prev ? { ...prev, publishedAt } : null));
      }
      await fetchDeals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send deal to marketplace.');
    } finally {
      setIsSendingToMarketplace(false);
    }
  };

  const goToTabAndRefresh = async (targetTab: string) => {
    if (activeTab === targetTab) {
      setPagination((prev) => ({ ...prev, currentPage: 1 }));
      await fetchDeals(targetTab);
      return;
    }
    handleTabChange(targetTab);
  };

  const handleFormSubmit = async (e: React.FormEvent, submitMode: 'draft' | 'submit' = 'submit') => {
    e.preventDefault();
    setIsSubmitting(true);

    const errors: Partial<Record<keyof DealFormData, string>> = {};
    if (!formDeal.title.trim()) errors.title = 'Title is required';
    if (!formDeal.location.trim()) errors.location = 'Location is required';
    if (formDeal.price.trim()) {
      const price = parseNumericInput(formDeal.price);
      if (price === null) errors.price = 'Price must be a number';
      else if (price < 0) errors.price = 'Price cannot be negative';
    }
    if (formDeal.roi.trim()) {
      const roi = parseNumericInput(formDeal.roi);
      if (roi === null) errors.roi = 'ROI must be a number';
      else if (roi < 0) errors.roi = 'ROI cannot be negative';
      else if (roi > 100) errors.roi = 'ROI cannot exceed 100%';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', formDeal.title.trim());
      formData.append('location', formDeal.location.trim());
      if (formDeal.description.trim()) {
        formData.append('description', formDeal.description.trim());
      }
      const price = parseNumericInput(formDeal.price);
      if (price !== null) formData.append('price', String(price));
      const roi = parseNumericInput(formDeal.roi);
      if (roi !== null) formData.append('roi', String(roi));
      if (formDeal.property_type) {
        formData.append('property_type', formDeal.property_type);
      }
      formData.append('listing_kind', listingKind);
      const occupancy = parseNumericInput(formDeal.occupancy);
      if (occupancy !== null) formData.append('occupancy', String(occupancy));

      formDeal.images.forEach((imageFile) => {
        formData.append('images[]', imageFile, imageFile.name);
      });

      for (const imageFile of formDeal.images) {
        await appendMediaToFormData(formData, imageFile, MEDIA_UPLOAD_PRESETS.dealImage);
      }

      if (editingDeal) {
        const wasRejected = editingDeal.status === 'REJECTED';
        const isDraftEdit = editingDeal.status === 'DRAFT';

        if (isDraftEdit && submitMode === 'submit') {
          formData.append('status', 'PENDING');
        }

        await dealService.learnerUpdateDeal(editingDeal.id, formData);

        if (wasRejected) {
          toast.success('Deal resubmitted successfully!');
        } else if (isDraftEdit && submitMode === 'draft') {
          toast.success('Draft saved successfully!');
        } else if (isDraftEdit) {
          toast.success('Deal submitted for verification!');
        } else {
          toast.success('Deal updated successfully!');
        }

        setShowFormModal(false);
        setFormDeal({ ...BLANK_FORM, images: [] });
        setEditingDeal(null);

        if (wasRejected || (isDraftEdit && submitMode === 'submit')) {
          await goToTabAndRefresh('pending');
        } else {
          await fetchDeals();
        }
      } else {
        if (submitMode === 'draft') {
          formData.append('status', 'DRAFT');
        }
        await dealService.learnerCreateDeal(formData);
        toast.success(
          submitMode === 'draft'
            ? 'Deal saved as draft!'
            : 'Deal created and submitted for verification!'
        );
        setShowFormModal(false);
        setFormDeal({ ...BLANK_FORM, images: [] });
        setEditingDeal(null);
        await goToTabAndRefresh(submitMode === 'draft' ? 'my_deals' : 'pending');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit deal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, publishedAt?: string | null) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-bold shadow-sm whitespace-nowrap";
    switch (status) {
      case 'VERIFIED':
        if (isReview && publishedAt) {
          return (
            <span className={`${baseClasses} bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1`}>
              <Storefront className="!text-sm" />
              In Marketplace
            </span>
          );
        }
        if (!publishedAt) {
          return (
            <span className={`${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`}>
              {isReview ? 'Approved — Private' : 'Verified (Unpublished)'}
            </span>
          );
        }
        return <span className={`${baseClasses} bg-emerald-100 text-emerald-800 border border-emerald-200`}>Verified & Published</span>;
      case 'PENDING':
        return <span className={`${baseClasses} bg-amber-100 text-amber-800 border border-amber-200`}>Pending Verification</span>;
      case 'REJECTED':
        return <span className={`${baseClasses} bg-red-100 text-red-800 border border-red-200`}>Rejected</span>;
      case 'RESUBMITTED':
        return <span className={`${baseClasses} bg-violet-100 text-violet-800 border border-violet-200`}>Resubmitted</span>;
      case 'DRAFT':
        return <span className={`${baseClasses} bg-slate-100 text-slate-800 border border-slate-200`}>Draft</span>;
      case 'CLOSED':
        return <span className={`${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`}>Closed</span>;
      default:
        return <span className={`${baseClasses} bg-slate-100 text-slate-800 border border-slate-200`}>{status}</span>;
    }
  };

  // Deal Detail View Component
  const DealDetailView = ({ deal }: { deal: Deal }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const images = deal.images || (deal.image ? [deal.image] : []);

    const openImageViewer = (index: number = 0) => {
      if (images.length > 0) {
        setViewerImages(images);
        setViewerInitialIndex(index);
        setImageViewerOpen(true);
      }
    };

    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        {/* Back Button */}
        <div className="bg-gradient-to-r from-blue-50 to-white p-4 border-b border-slate-100 flex items-center justify-between">
          <button
            className="bg-transparent border-none cursor-pointer text-blue-900 font-semibold flex items-center gap-2 hover:text-blue-800 text-sm sm:text-base"
            onClick={() => setSelectedDeal(null)}
          >
            <ArrowBack className="text-xl" />
            Back to {sectionTitle}
          </button>
          <div className="flex gap-2">
              {deal.status !== 'CLOSED' && canLearnerEditDeal(deal) && (
                <button
                  onClick={(e) => { setSelectedDeal(null); handleEditDeal(deal, e); }}
                  className={`px-3.5 py-1.5 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 ${
                    deal.status === 'REJECTED'
                      ? 'bg-violet-50 border border-violet-200 text-violet-800 hover:bg-violet-100'
                      : 'bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  <Edit className="w-3.5 h-3.5" />
                  {deal.status === 'REJECTED' ? 'Resubmit Proposal' : 'Edit Deal'}
                </button>
              )}
              {deal.status !== 'CLOSED' && isDealOwner(deal) && deal.status === 'VERIFIED' && !deal.publishedAt && (
                <button
                  onClick={(e) => {
                    setSelectedDeal(null);
                    if (isReview) handleSendToMarketplace(deal.id, e);
                    else handlePublishDeal(deal.id, e);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-lg text-xs hover:bg-emerald-100 transition-colors flex items-center gap-1"
                >
                  {isReview ? 'Send to Marketplace' : 'Publish Deal'}
                </button>
              )}
              {isDealOwner(deal) && deal.status !== 'VERIFIED' && (
                <button
                  onClick={(e) => { setSelectedDeal(null); handleDeleteDeal(deal.id, e); }}
                  className="px-3.5 py-1.5 bg-red-50 border border-red-200 text-red-600 font-bold rounded-lg text-xs hover:bg-red-100 transition-colors flex items-center gap-1"
                >
                  <Delete className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
        </div>

        {/* Image Gallery - Full Width Banner */}
        <div className="relative w-full bg-slate-100">
          {images.length > 0 ? (
            <div className="relative">
              <div 
                className="w-full h-[400px] sm:h-[500px] lg:h-[600px] flex items-center justify-center bg-slate-900 cursor-pointer overflow-hidden"
                onClick={() => openImageViewer(currentImageIndex)}
              >
                <img
                  src={getImageUrl(images[currentImageIndex])}
                  alt={`${deal.title} - Image ${currentImageIndex + 1}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/images/placeholder-property.jpg';
                  }}
                />
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                
                {/* Click to expand hint */}
                <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-xs font-medium backdrop-blur-sm pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                  Click to view full screen
                </div>
              </div>

              {/* Navigation Controls */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
                    }}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all backdrop-blur-sm z-10"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) => (prev + 1) % images.length);
                    }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all backdrop-blur-sm z-10"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>

                  {/* Image Counter */}
                  <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm z-10">
                    {currentImageIndex + 1} / {images.length}
                  </div>

                  {/* Thumbnails */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-lg z-10">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(idx);
                        }}
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx === currentImageIndex 
                            ? 'bg-white w-6' 
                            : 'bg-white/50 hover:bg-white/80'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Full screen button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openImageViewer(currentImageIndex);
                    }}
                    className="absolute top-4 left-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg transition-all backdrop-blur-sm z-10"
                    title="View full screen"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Featured Badge */}
              {deal.featured && !isReview && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg z-10">
                  <Star className="text-base" />
                  <span className="font-semibold text-sm">Featured Deal</span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-[400px] sm:h-[500px] flex flex-col items-center justify-center text-slate-400 gap-4 bg-slate-100">
              <CloudUpload className="w-20 h-20" />
              <span className="text-sm font-medium text-slate-500">No images available</span>
            </div>
          )}

          {/* Bottom overlay with status and title */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge(deal.status, deal.publishedAt)}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{deal.title}</h2>
            <div className="text-white/90 flex items-center gap-2 text-sm sm:text-base">
              <LocationOn className="text-lg" />
              {deal.location}
            </div>
            <div className="text-white/80 text-xl font-bold mt-2">
              {deal.price ? `£${deal.price.toLocaleString()}` : 'Price on request'}
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Rest of the deal detail view remains the same */}
          <div className="flex justify-between items-center mb-6">
            <div className="text-3xl font-bold text-blue-900">{deal.price ? `£${deal.price.toLocaleString()}` : 'Price on request'}</div>
            <div className="flex gap-2">
              <button
                className="bg-blue-900 text-white px-4 py-2 rounded-lg border border-blue-900 cursor-pointer text-sm font-semibold transition-all flex items-center gap-1.5 hover:bg-blue-800"
                onClick={(e) => handleShareDeal(deal, e)}
              >
                <Share className="text-base" />
                Share
              </button>
              {!isReview && (
                <button
                  type="button"
                  className={`px-4 py-2 rounded-lg cursor-pointer text-sm font-semibold transition-all flex items-center gap-1.5 ${
                    deal.favorite
                      ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                      : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                  }`}
                  onClick={(e) => handleToggleFavorite(deal.id, e)}
                >
                  {deal.favorite ? <Favorite className="text-base" /> : <FavoriteBorder className="text-base" />}
                  {deal.favorite ? 'Saved' : 'Save'}
                </button>
              )}
            </div>
          </div>

          {deal.status === 'VERIFIED' && !deal.publishedAt && (
            <div className="bg-blue-50 rounded-xl p-5 mb-6 text-blue-900 border border-blue-150 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <HourglassEmpty className="text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-bold mb-1">
                    {isReview ? 'Approved — Ready for Marketplace' : 'Verified & Ready to Publish'}
                  </h4>
                  <p className="text-sm text-blue-700">
                    {isReview
                      ? 'An admin approved this deal review. Click Send to Marketplace if you want other learners to see it.'
                      : 'This deal has been verified by the academy admin! You can now publish it so that it is visible to other learners in the marketplace.'}
                  </p>
                </div>
              </div>
              {isDealOwner(deal) && (
                <button
                  onClick={(e) => (isReview ? handleSendToMarketplace(deal.id, e) : handlePublishDeal(deal.id, e))}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  {isReview ? 'Send to Marketplace' : 'Publish Deal'}
                </button>
              )}
            </div>
          )}

          {isReview && deal.status === 'VERIFIED' && !!deal.publishedAt && (
            <div className="bg-emerald-50 rounded-xl p-5 mb-6 text-emerald-900 border border-emerald-200 flex items-start gap-3">
              <Storefront className="text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold mb-1">Already in Marketplace</h4>
                <p className="text-sm text-emerald-800">
                  This approved deal review is live on the Deal Marketplace. Other learners can see it there. It remains listed here in Deal Review for your records.
                </p>
              </div>
            </div>
          )}

          {deal.status === 'REJECTED' && deal.rejection_note && (
            <div className="bg-red-50 rounded-xl p-5 mb-6 text-red-900 border border-red-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <ThumbDown className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold mb-1">Feedback / Rejection Note from Admin</h4>
                  <p className="text-sm text-red-700">{deal.rejection_note}</p>
                </div>
              </div>
              {canLearnerEditDeal(deal) && (
                <button
                  onClick={(e) => { setSelectedDeal(null); handleEditDeal(deal, e); }}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex-shrink-0"
                >
                  Resubmit Proposal
                </button>
              )}
            </div>
          )}

          {deal.featured && !isReview && (
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl p-5 mb-6 text-white shadow-md">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                  {deal.mentorAvatar}
                </div>
                <div>
                  <h4 className="font-semibold mb-1 flex items-center gap-2">
                    Featured by {deal.mentor}
                    <Star className="text-amber-300 fill-current" />
                  </h4>
                  <p className="text-blue-100 text-sm">{deal.analysis.notes}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Key Metrics */}
              <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <CurrencyPound className="text-blue-900 text-xl" />
                  Investment Metrics
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-4 text-center border border-slate-100">
                    <div className="text-lg font-bold text-emerald-600 mb-1">{deal.roi ? `${deal.roi.toFixed(1)}%` : '—'}</div>
                    <div className="text-xs text-slate-500 font-semibold uppercase">ROI</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center border border-slate-100">
                    <div className="text-lg font-bold text-blue-600 mb-1">{deal.occupancy != null ? `${deal.occupancy}%` : '—'}</div>
                    <div className="text-xs text-slate-500 font-semibold uppercase">Occupancy</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center border border-blue-100">
                    <div className="text-base font-bold text-blue-900 mb-1">£{deal.cashFlow.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Monthly Cash Flow</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center border border-slate-100">
                    <div className="text-lg font-bold text-slate-900 mb-1">{deal.views}</div>
                    <div className="text-xs text-slate-500 font-semibold uppercase">Views</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-4 text-center border border-slate-100">
                    <div className="text-lg font-bold text-violet-600 mb-1">{deal.inquiries}</div>
                    <div className="text-xs text-slate-500 font-semibold uppercase">Inquiries</div>
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <BusinessCenter className="text-blue-900 text-xl" />
                  Property Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Property Type:</span>
                    <span className="font-semibold text-slate-800 capitalize">{deal.propertyType}</span>
                  </div>
                  {deal.occupancy !== undefined && (
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Occupancy:</span>
                      <span className="font-semibold text-slate-800">{deal.occupancy}%</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-500">Added:</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(deal.dateAdded).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {deal.description && (
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-3">Property Description</h3>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{deal.description}</p>
              </div>
            )}

            {/* Contact Section */}
            {deal.status === 'VERIFIED' && !isDealOwner(deal) && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-blue-900 mb-2">Interested in this property?</h3>
                <p className="text-blue-800 text-sm mb-4">Contact the mentor featured on this opportunity to request more info or discuss financials.</p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  {deal.mentorEmail && (
                    <button
                      onClick={() => handleContactMentor(deal, 'email')}
                      className="flex-1 bg-white border border-blue-200 hover:bg-blue-100 text-blue-900 font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Email className="text-lg" /> Email Mentor
                    </button>
                  )}
                  <button
                    onClick={() => handleContactMentor(deal, 'phone')}
                    className="flex-1 bg-white border border-blue-200 hover:bg-blue-100 text-blue-900 font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Phone className="text-lg" /> Request Call
                  </button>
                  <button
                    onClick={() => handleContactMentor(deal, 'message')}
                    className="flex-1 bg-blue-900 text-white hover:bg-blue-800 font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Chat className="text-lg" /> Send Chat Message
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Share Modal Component
  const ShareModal = () => (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5"
      onClick={() => setShowShareModal(false)}
    >
      <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-3">
            <Share className="text-blue-900 text-2xl" />
            Share Deal
          </h2>
          <button
            className="bg-transparent border-none cursor-pointer text-slate-500 p-2 rounded-lg transition-all hover:bg-slate-100 flex items-center justify-center"
            onClick={() => setShowShareModal(false)}
          >
            <Close className="text-xl" />
          </button>
        </div>

        {dealToShare && (
          <>
            <div className="mb-6">
              <h3 className="text-slate-800 font-semibold mb-2">{dealToShare.title}</h3>
              <p className="text-slate-500">
                £{dealToShare.price.toLocaleString()} • {dealToShare.location}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 text-center cursor-pointer transition-all hover:from-blue-100 hover:to-blue-200 hover:border-blue-300 flex flex-col items-center justify-center group"
                onClick={() => handleShareAction('copy')}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-900 to-blue-800 flex items-center justify-center mb-3 group-hover:from-blue-800 group-hover:to-blue-700">
                  <span className="text-white font-bold text-lg">🔗</span>
                </div>
                <span className="text-blue-900 font-semibold mb-1">Copy Link</span>
                <span className="text-xs text-slate-500">Share via any app</span>
              </button>

              <button
                className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 text-center cursor-pointer transition-all hover:from-blue-100 hover:to-blue-200 hover:border-blue-300 flex flex-col items-center justify-center group"
                onClick={() => handleShareAction('email')}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-900 to-blue-800 flex items-center justify-center mb-3 group-hover:from-blue-800 group-hover:to-blue-700">
                  <Email className="text-white text-xl" />
                </div>
                <span className="text-blue-900 font-semibold mb-1">Email</span>
                <span className="text-xs text-slate-500">Send via email</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Deal Card Component
  const DealCard = ({ deal }: { deal: Deal }) => {
    const images = deal.images || (deal.image ? [deal.image] : []);
    const [cardImageIndex, setCardImageIndex] = useState(0);

    const openImageViewer = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (images.length > 0) {
        setViewerImages(images);
        setViewerInitialIndex(cardImageIndex);
        setImageViewerOpen(true);
      }
    };

    return (
      <div
        className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-slate-300 group flex flex-col h-full"
        onClick={() => handleViewDeal(deal)}
      >
        {/* Property Image */}
        <div className="relative h-48 overflow-hidden flex-shrink-0 bg-slate-100">
          {images.length > 0 ? (
            <>
              <div className="w-full h-full" onClick={openImageViewer}>
                <img
                  src={getImageUrl(images[cardImageIndex])}
                  alt={deal.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = '/images/placeholder-property.jpg';
                  }}
                />
              </div>
              
              {images.length > 1 && (
                <>
                  <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCardImageIndex((prev) => (prev - 1 + images.length) % images.length);
                      }}
                      className="bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors backdrop-blur-sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCardImageIndex((prev) => (prev + 1) % images.length);
                      }}
                      className="bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors backdrop-blur-sm"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Image counter badge */}
                  <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                    {cardImageIndex + 1}/{images.length}
                  </div>
                </>
              )}

              {/* Click to expand icon */}
              <div className="absolute bottom-2 right-2 bg-black/40 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                <ZoomIn className="w-4 h-4" />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-100">
              <CloudUpload className="w-12 h-12" />
              <span className="text-xs font-medium text-slate-500">No image</span>
            </div>
          )}
          
          {deal.featured && !isReview && (
            <div className="absolute top-3 left-3 z-10">
              <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-white px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                <Star className="text-sm fill-current" />
                <span className="text-xs font-semibold">Featured</span>
              </div>
            </div>
          )}

          {/* Status Badge */}
          {activeTab !== 'all' && (
            <div className="absolute bottom-3 left-3 z-10">
              {getStatusBadge(deal.status, deal.publishedAt)}
            </div>
          )}

          {/* Price Overlay */}
          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm z-10">
            <div className="text-lg font-bold text-blue-900">{deal.price ? `£${deal.price.toLocaleString()}` : '—'}</div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 flex-1 flex flex-col justify-between">
          <div>
            {/* Title and Location */}
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-800 mb-1 group-hover:text-blue-900 transition-colors line-clamp-1">
                {deal.title}
              </h3>
              <div className="text-slate-500 text-xs flex items-center gap-1">
                <LocationOn className="text-slate-400 text-sm" />
                <span className="line-clamp-1 font-medium">{deal.location}</span>
              </div>
            </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 text-center border border-blue-100">
              <div className="text-base font-bold text-blue-900 mb-1">{deal.roi ? `${deal.roi.toFixed(1)}%` : '—'}</div>
              <div className="text-xs text-slate-500">ROI</div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 text-center border border-blue-100">
              <div className="text-base font-bold text-blue-900 mb-1">£{deal.cashFlow.toLocaleString()}</div>
              <div className="text-xs text-slate-500">Cash Flow</div>
            </div>
          </div>

            {isReview && deal.status === 'VERIFIED' && !!deal.publishedAt && (
              <div className="mb-4 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-2 rounded-lg border border-emerald-100 flex items-center gap-1.5 font-semibold">
                <Storefront className="!text-sm text-emerald-600" />
                Already in Marketplace
              </div>
            )}

            {deal.status === 'REJECTED' && deal.rejection_note && (
              <div className="mb-4 text-xs text-red-700 bg-red-50 p-2 rounded-lg border border-red-100 line-clamp-2">
                <strong>Rejected note:</strong> {deal.rejection_note}
              </div>
            )}
          </div>

          {/* Card Footer Actions */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-3 flex-shrink-0">
            <span className="text-xs font-semibold text-slate-400 capitalize">
              {deal.property_type || deal.type || '—'}
            </span>
            <div className="flex gap-2">
              {canLearnerEditDeal(deal) && (
                <button
                  onClick={(e) => handleEditDeal(deal, e)}
                  className={`px-2.5 py-1.5 font-bold rounded-lg text-[10px] transition-colors ${
                    deal.status === 'REJECTED'
                      ? 'bg-violet-50 border border-violet-100 text-violet-700 hover:bg-violet-100'
                      : 'bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100'
                  }`}
                  title={deal.status === 'REJECTED' ? 'Edit and resubmit for verification' : 'Edit deal info'}
                >
                  {getOwnerEditLabel(deal.status)}
                </button>
              )}
              {isDealOwner(deal) && deal.status === 'VERIFIED' && !deal.publishedAt && (
                <button
                  onClick={(e) => (isReview ? handleSendToMarketplace(deal.id, e) : handlePublishDeal(deal.id, e))}
                  className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold rounded-lg text-[10px] hover:bg-emerald-100 transition-colors mr-1"
                  title={isReview ? 'Send to Marketplace' : 'Publish Deal'}
                >
                  {isReview ? 'Send to Marketplace' : 'Publish'}
                </button>
              )}
              {isDealOwner(deal) && deal.status !== 'VERIFIED' && (
                <button
                  onClick={(e) => handleDeleteDeal(deal.id, e)}
                  className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  title="Delete"
                >
                  <Delete className="w-3.5 h-3.5" />
                </button>
              )}
              {!isReview && (
              <button
                onClick={(e) => handleToggleFavorite(deal.id, e)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                {deal.favorite ? <Favorite className="text-red-500" /> : <FavoriteBorder />}
              </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{sectionTitle}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {sectionSubtitle}
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors shadow-lg shadow-blue-900/10 flex-shrink-0"
        >
          <Add className="w-5 h-5" /> {isReview ? 'Submit Deal' : 'Submit Deal proposal'}
        </button>
      </div>

      {/* Tabs Select Bar */}
      <div className="flex flex-wrap border-b border-slate-200 bg-white p-2 rounded-xl border border-slate-100 shadow-sm gap-2 w-fit">
        {!isReview && (
          <button
            onClick={() => handleTabChange('all')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${
              activeTab === 'all' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <BusinessCenter className="w-4 h-4" /> All Deals
          </button>
        )}
        <button
          onClick={() => handleTabChange('my_deals')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${
            activeTab === 'my_deals' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Person className="w-4 h-4" /> {isReview ? 'My Reviews' : 'My Deals'}
        </button>
        {!isReview && (
          <button
            onClick={() => handleTabChange('featured')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${
              activeTab === 'featured' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Star className="w-4 h-4" /> Featured
          </button>
        )}
        {isReview && (
          <button
            onClick={() => handleTabChange('verified')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${
              activeTab === 'verified' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CheckCircle className="w-4 h-4" /> Approved
          </button>
        )}
        <button
          onClick={() => handleTabChange('pending')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${
            activeTab === 'pending' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Pending className="w-4 h-4" /> Pending Verification
        </button>
        <button
          onClick={() => handleTabChange('rejected')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${
            activeTab === 'rejected' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ThumbDown className="w-4 h-4" /> Rejection
        </button>
      </div>

      {/* Search Bar */}
      {!selectedDeal && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="relative flex-1 max-w-lg w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-lg" />
            <input
              type="text"
              placeholder="Search by title, location or property description..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white outline-none focus:border-blue-900 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            {!isReview && (
              <label className="inline-flex items-center cursor-pointer select-none text-slate-700 text-sm font-semibold bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-900 border-slate-300 rounded focus:ring-blue-800 focus:ring-2 cursor-pointer transition-all mr-2"
                  checked={isFeaturedOnly}
                  onChange={(e) => setIsFeaturedOnly(e.target.checked)}
                />
                ⭐ Featured Only
              </label>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
          <p className="text-slate-500 mt-4">Retrieving investment opportunities...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
          <p className="text-red-800 font-medium">{error}</p>
          <button className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg mt-3 font-semibold text-xs transition-colors" onClick={() => fetchDeals()}>
            Try again
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {!loading && !error && (
        <>
          {selectedDeal ? (
            <DealDetailView deal={selectedDeal} />
          ) : (
            <>
              {deals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {deals.map((deal) => <DealCard key={deal.id} deal={deal} />)}
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                  <BusinessCenter className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-700">No Deals Found</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                    There are no deals here at the moment. Submissions go through verification process first.
                  </p>
                </div>
              )}

              {/* Pagination */}
              {pagination.lastPage > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <button
                    disabled={pagination.currentPage === 1}
                    onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })}
                    className="px-4 py-2 bg-blue-50 text-blue-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-100 transition-all font-semibold"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-slate-700 font-medium">
                    Page {pagination.currentPage} of {pagination.lastPage}
                  </span>
                  <button
                    disabled={pagination.currentPage === pagination.lastPage}
                    onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage + 1 })}
                    className="px-4 py-2 bg-blue-50 text-blue-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-100 transition-all font-semibold"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Full Screen Image Viewer */}
      {imageViewerOpen && (
        <FullScreenImageViewer 
          images={viewerImages} 
          initialIndex={viewerInitialIndex}
          onClose={() => setImageViewerOpen(false)} 
        />
      )}

      {/* Share Modal */}
      {showShareModal && <ShareModal />}

      {/* Send to Marketplace confirmation */}
      {sendToMarketplaceDeal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[2px]"
          onClick={() => {
            if (!isSendingToMarketplace) setSendToMarketplaceDeal(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="send-to-marketplace-title"
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-900 via-emerald-500 to-emerald-400" />

            <div className="px-6 pt-8 pb-6 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-900 to-emerald-600 shadow-lg shadow-emerald-900/20">
                <Storefront className="text-3xl text-white" />
              </div>

              <h3
                id="send-to-marketplace-title"
                className="text-xl font-bold tracking-tight text-slate-900"
              >
                Send to Marketplace?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Send this approved deal review to the Deal Marketplace? Other learners will be able to see it.
              </p>

              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {sendToMarketplaceDeal.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {sendToMarketplaceDeal.location}
                  {sendToMarketplaceDeal.price
                    ? ` · £${sendToMarketplaceDeal.price.toLocaleString()}`
                    : ''}
                </p>
              </div>

              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3.5 py-3 text-left">
                <Groups className="mt-0.5 shrink-0 text-lg text-emerald-700" />
                <p className="text-xs leading-relaxed text-emerald-900/80">
                  Once sent, this deal stays in Deal Review and also appears in the public Deal Marketplace for all members.
                </p>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
              <button
                type="button"
                disabled={isSendingToMarketplace}
                onClick={() => setSendToMarketplaceDeal(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingToMarketplace}
                onClick={confirmSendToMarketplace}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-900 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition-all hover:from-blue-800 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingToMarketplace ? 'Sending…' : 'Send to Marketplace'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Mentor Modal */}
      {messageModalDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Message {messageModalDeal.mentor}</h3>
                <p className="text-sm text-slate-500">About: {messageModalDeal.title}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMessageModalDeal(null);
                  setMessageText('');
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <Close className="text-lg" />
              </button>
            </div>
            <div className="px-5 py-4">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={5}
                placeholder={`Hi ${messageModalDeal.mentor}, I have a question about this deal...`}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setMessageModalDeal(null);
                  setMessageText('');
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendMessageToMentor}
                disabled={sendingMessage}
                className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {sendingMessage ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Deal Proposal Modal (Learner) ── */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingDeal
                    ? editingDeal.status === 'REJECTED'
                      ? 'Edit & Resubmit Proposal'
                      : 'Edit Investment Proposal'
                    : 'Submit New Investment Proposal'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Fill in property financials. Proposals will be verified by admins before listing in the Marketplace.
                </p>
              </div>
              <button onClick={() => setShowFormModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <Close className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={(e) => e.preventDefault()} noValidate className="p-6 space-y-6">
              {editingDeal?.status === 'REJECTED' && editingDeal.rejection_note && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                  <ThumbDown className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Admin Rejection Feedback:</span> {editingDeal.rejection_note}
                  </div>
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
                      value={formDeal.title}
                      onChange={handleInputChange}
                      placeholder="Downtown Commercial Plaza"
                      className={fieldInputClass(Boolean(formErrors.title))}
                    />
                    {formErrors.title && <p className="text-xs text-red-500 mt-1">{formErrors.title}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Location *</label>
                    <input
                      type="text"
                      name="location"
                      value={formDeal.location}
                      onChange={handleInputChange}
                      placeholder="Chicago, IL"
                      className={fieldInputClass(Boolean(formErrors.location))}
                    />
                    {formErrors.location && <p className="text-xs text-red-500 mt-1">{formErrors.location}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Price <span className="font-normal text-slate-400">(optional)</span></label>
                      <div className="relative">
                        <CurrencyPound className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
                        <input
                          type="text"
                          name="price"
                          value={formDeal.price}
                          onChange={handleInputChange}
                          placeholder="1850000"
                          className={fieldInputClass(Boolean(formErrors.price), 'pl-9 sm:pl-10')}
                        />
                      </div>
                      {formErrors.price && <p className="text-xs text-red-500 mt-1">{formErrors.price}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Property Type <span className="font-normal text-slate-400">(optional)</span></label>
                      <select
                        name="property_type"
                        value={formDeal.property_type}
                        onChange={handleInputChange}
                        className={fieldInputClass(Boolean(formErrors.property_type))}
                      >
                        <option value="">Select property type</option>
                        {propertyTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description <span className="font-normal text-slate-400">(optional)</span></label>
                    <textarea
                      name="description"
                      value={formDeal.description}
                      onChange={handleInputChange}
                      placeholder="Describe occupancy, potential, location highlights..."
                      rows={4}
                      className={fieldInputClass(Boolean(formErrors.description))}
                    />
                    {formErrors.description && <p className="text-xs text-red-500 mt-1">{formErrors.description}</p>}
                  </div>
                </div>

                {/* Right Side */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">ROI (%) <span className="font-normal text-slate-400">(optional)</span></label>
                    <input
                      type="text"
                      name="roi"
                      value={formDeal.roi}
                      onChange={handleInputChange}
                      placeholder="11.2"
                      className={fieldInputClass(Boolean(formErrors.roi))}
                    />
                    {formErrors.roi && <p className="text-xs text-red-500 mt-1">{formErrors.roi}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Occupancy (%)</label>
                    <input
                      type="text"
                      name="occupancy"
                      value={formDeal.occupancy}
                      onChange={handleInputChange}
                      placeholder="92"
                      className={fieldInputClass(Boolean(formErrors.occupancy))}
                    />
                  </div>

                  <div>
  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Upload Images</label>
  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50 hover:bg-slate-100/50 hover:border-blue-400 transition-all cursor-pointer">
    <CloudUpload className="w-12 h-12 text-slate-400 mx-auto mb-2" />
    <p className="text-sm font-medium text-slate-600">
      {formDeal.images.length > 0 
        ? `${formDeal.images.length} image(s) selected` 
        : 'Select property images (multiple allowed)'}
    </p>
    <label className="mt-3 inline-block px-4 py-1.5 bg-blue-900 text-white text-xs font-bold rounded-lg hover:bg-blue-800 cursor-pointer">
      Browse Files
      <input 
        type="file" 
        accept="image/*" 
        multiple 
        onChange={handleFileChange} 
        className="hidden" 
      />
    </label>
  </div>
  
  {/* Image previews - Fixed grid */}
  {formDeal.images.length > 0 && (
    <div className="mt-3 grid grid-cols-3 gap-3">
      {formDeal.images.map((file, index) => (
        <div key={index} className="relative group">
          <img
            src={URL.createObjectURL(file)}
            alt={`Preview ${index + 1}`}
            className="w-full h-24 object-cover rounded-lg border border-slate-200"
          />
          <button
            type="button"
            onClick={() => handleRemoveImage(index)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-lg"
          >
            <Close className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  )}
</div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-slate-100 pt-6 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-5 py-2.5 border border-slate-300 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                {(!editingDeal || editingDeal.status === 'DRAFT') && (
                  <button
                    type="button"
                    onClick={(e) => handleFormSubmit(e, 'draft')}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 border border-blue-200 bg-blue-50 text-blue-900 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors"
                  >
                    {editingDeal ? 'Save Draft' : 'Save as Draft'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => handleFormSubmit(e, 'submit')}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {editingDeal
                        ? (editingDeal.status === 'REJECTED' || editingDeal.status === 'RESUBMITTED'
                            ? (isReview ? 'Resubmit Deal' : 'Resubmit Proposal')
                            : editingDeal.status === 'DRAFT'
                              ? (isReview ? 'Submit Deal' : 'Submit for Verification')
                              : 'Save Changes')
                        : (isReview ? 'Submit Deal' : 'Submit Proposal')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deals;