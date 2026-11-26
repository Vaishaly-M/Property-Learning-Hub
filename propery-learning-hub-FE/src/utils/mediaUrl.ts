/**
 * Resolve learner/instructor media paths to a browser-loadable URL.
 * Images/thumbnails: API inline proxy (redirects to S3).
 * Videos: stream endpoint or presigned S3 URL — never proxied through PHP.
 */

function getApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/$/, '');
}

function getApiOrigin(): string {
  return getApiBase().replace(/\/api\/?$/, '');
}

function getMediaCdnOrigin(): string | null {
  const cdn = process.env.NEXT_PUBLIC_MEDIA_CDN_URL?.trim();
  return cdn ? cdn.replace(/\/$/, '') : null;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  return (
    localStorage.getItem('token') ||
    localStorage.getItem('auth_token') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('auth_token')
  );
}

function normalizeStoragePathname(pathname: string): string {
  let path = pathname;
  while (path.includes('/storage/storage/')) {
    path = path.replace('/storage/storage/', '/storage/');
  }
  return path;
}

function isPresignedS3Url(url: string): boolean {
  return (
    (url.includes('amazonaws.com') || url.includes('cloudfront.net')) &&
    (url.includes('X-Amz-') || url.includes('AWSAccessKeyId='))
  );
}

function isVideoStoragePath(path: string): boolean {
  const normalized = path.replace(/^\/+/, '').toLowerCase();
  const ext = normalized.split('.').pop() ?? '';

  if (['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v'].includes(ext)) {
    return true;
  }

  return (
    normalized.includes('content/videos/') ||
    normalized.includes('past-recordings/') ||
    normalized.includes('webinar-recordings/')
  );
}

function extractS3StoragePath(url: string): string | null {
  try {
    const { hostname, pathname } = new URL(url);
    if (!hostname.includes('amazonaws.com') && !hostname.includes('cloudfront.net')) {
      return null;
    }

    const key = decodeURIComponent(pathname.replace(/^\//, ''));
    return key || null;
  } catch {
    return null;
  }
}

function appendMediaToken(url: string): string {
  const token = getAuthToken();
  if (!token || url.includes('token=')) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

function buildMediaInlineUrl(storagePath: string): string {
  const apiBase = getApiBase();
  return appendMediaToken(`${apiBase}/media/inline?path=${encodeURIComponent(storagePath)}`);
}

function buildMediaStreamUrl(storagePath: string): string {
  const apiBase = getApiBase();
  return appendMediaToken(`${apiBase}/media/stream?path=${encodeURIComponent(storagePath)}`);
}

function resolveMediaStreamPath(trimmed: string): string | null {
  if (!trimmed.includes('/media/stream') && !trimmed.includes('/content/') && !trimmed.endsWith('/stream')) {
    return null;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return appendMediaToken(trimmed);
  }

  const path = trimmed.startsWith('/api/') ? trimmed : `/api${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
  return appendMediaToken(`${getApiOrigin()}${path}`);
}

function resolveMediaInlinePath(trimmed: string): string | null {
  if (!trimmed.includes('/media/inline')) {
    return null;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return appendMediaToken(trimmed);
  }

  const path = trimmed.startsWith('/api/') ? trimmed : `/api${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
  return appendMediaToken(`${getApiOrigin()}${path}`);
}

function isAbsoluteMediaUrl(url: string): boolean {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }

  try {
    const { hostname, pathname } = new URL(url);

    if (hostname.includes('amazonaws.com') || hostname.includes('cloudfront.net')) {
      return isPresignedS3Url(url);
    }

    if (pathname.includes('/media/inline') || pathname.includes('/media/stream')) {
      return false;
    }

    return !pathname.includes('/storage/');
  } catch {
    return false;
  }
}

function storagePathToMediaKey(path: string): string | null {
  const normalized = path.replace(/^\/+/, '').replace(/^storage\//, '');
  if (/^(courses|content|deals|webinar|past-recordings|profile-photos|chat|contracts)\//.test(normalized)) {
    return normalized;
  }
  return null;
}

export function resolveStorageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  if (isPresignedS3Url(trimmed)) {
    return trimmed;
  }

  const s3Path = extractS3StoragePath(trimmed);
  if (s3Path) {
    return isVideoStoragePath(s3Path) ? buildMediaStreamUrl(s3Path) : buildMediaInlineUrl(s3Path);
  }

  const streamPath = resolveMediaStreamPath(trimmed);
  if (streamPath) {
    return streamPath;
  }

  const inlinePath = resolveMediaInlinePath(trimmed);
  if (inlinePath) {
    return inlinePath;
  }

  if (isAbsoluteMediaUrl(trimmed)) {
    return trimmed;
  }

  const apiOrigin = getApiOrigin();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const { pathname } = new URL(trimmed);
      const normalizedPath = normalizeStoragePathname(pathname);

      if (normalizedPath.includes('/storage/')) {
        return `${apiOrigin}${normalizedPath}`;
      }

      if (/\/(content|courses)\/(thumbnails|videos|documents)\//.test(normalizedPath)) {
        const key = normalizedPath.replace(/^\//, '');
        return isVideoStoragePath(key) ? buildMediaStreamUrl(key) : buildMediaInlineUrl(key);
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  let path = trimmed;
  if (path.startsWith('storage/')) {
    path = `/${path}`;
  }

  if (path.startsWith('/storage/')) {
    const mediaKey = storagePathToMediaKey(path);
    if (mediaKey) {
      return isVideoStoragePath(mediaKey) ? buildMediaStreamUrl(mediaKey) : buildMediaInlineUrl(mediaKey);
    }
  }

  if (!path.startsWith('/storage/') && !path.startsWith('/api/')) {
    const mediaKey = storagePathToMediaKey(path);
    if (mediaKey) {
      return isVideoStoragePath(mediaKey) ? buildMediaStreamUrl(mediaKey) : buildMediaInlineUrl(mediaKey);
    }

    path = `/storage/${path.replace(/^\//, '')}`;
  }

  const cdnOrigin = getMediaCdnOrigin();
  if (cdnOrigin && path.startsWith('/storage/')) {
    return `${cdnOrigin}/${path.replace(/^\/storage\//, '')}`;
  }

  return `${apiOrigin}${normalizeStoragePathname(path)}`;
}

/** Stream URL for course content video (redirects to signed S3 URL). */
export function getVideoStreamUrl(contentId: string): string | null {
  if (!contentId || typeof window === 'undefined') return null;

  const token = getAuthToken();
  if (!token) return null;

  return `${getApiBase()}/learner/content/${contentId}/stream?token=${encodeURIComponent(token)}`;
}

export function getLearnerDocumentUrl(contentId: string): string {
  const apiBase = getApiBase();
  const token = getAuthToken();
  let url = `${apiBase}/learner/content/${contentId}/document`;
  if (token) {
    url += `?token=${encodeURIComponent(token)}`;
  }
  return url;
}

export function courseThumbnailSrc(
  course: { thumbnailUrl?: string | null; thumbnail_url?: string | null }
): string | null {
  return resolveStorageUrl(course.thumbnailUrl ?? course.thumbnail_url ?? null);
}

/** True when URL is already a direct S3 presigned playback link. */
export function isDirectS3PlaybackUrl(url: string | null | undefined): boolean {
  return Boolean(url && isPresignedS3Url(url));
}
