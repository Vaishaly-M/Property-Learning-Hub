//services/mediaUploadService.ts
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/$/, '');

export type MediaUploadFolder =
  | 'content/videos'
  | 'content/documents'
  | 'content/thumbnails'
  | 'courses/thumbnails'
  | 'webinar-thumbnails'
  | 'past-recordings'
  | 'webinar-recordings'
  | 'deals'
  | 'profile-photos'
  | 'contracts'
  | 'chat/avatars'
  | `chat/${number}`;

export interface DirectUploadResult {
  path: string;
  fileName: string;
  fileSize: number;
}

export interface MediaUploadConfig {
  direct_upload_enabled: boolean;
  max_video_bytes: number;
  max_document_bytes: number;
  max_thumbnail_bytes: number;
  max_image_bytes?: number;
}

export interface AppendMediaOptions {
  folder: string;
  fileField: string;
  pathField: string;
  nameField?: string;
  sizeField?: string;
  mimeField?: string;
  private?: boolean;
  onProgress?: (percent: number) => void;
}

/** Reusable field mappings for direct S3 upload → Laravel path fields */
export const MEDIA_UPLOAD_PRESETS = {
  contentVideo: {
    folder: 'content/videos',
    fileField: 'file',
    pathField: 'file_path',
    nameField: 'file_name',
    sizeField: 'file_size',
  },
  contentDocument: {
    folder: 'content/documents',
    fileField: 'file',
    pathField: 'file_path',
    nameField: 'file_name',
    sizeField: 'file_size',
  },
  contentThumbnail: {
    folder: 'content/thumbnails',
    fileField: 'thumbnail_image',
    pathField: 'thumbnail_path',
  },
  courseThumbnail: {
    folder: 'courses/thumbnails',
    fileField: 'thumbnail_image',
    pathField: 'thumbnail_path',
  },
  webinarThumbnail: {
    folder: 'webinar-thumbnails',
    fileField: 'thumbnail',
    pathField: 'thumbnail_path',
  },
  pastRecordingVideo: {
    folder: 'past-recordings',
    fileField: 'video',
    pathField: 'video_path',
    nameField: 'video_name',
    sizeField: 'video_size',
  },
  webinarRecording: {
    folder: 'webinar-recordings',
    fileField: 'recording',
    pathField: 'recording_path',
    nameField: 'recording_original_name',
    sizeField: 'recording_size',
    mimeField: 'recording_mime_type',
    private: true,
  },
  dealImage: {
    folder: 'deals',
    fileField: 'image',
    pathField: 'image_path',
  },
  profilePhoto: {
    folder: 'profile-photos',
    fileField: 'profile_photo',
    pathField: 'profile_photo_path',
  },
  learnerProfilePhoto: {
    folder: 'profile-photos',
    fileField: 'profile_image',
    pathField: 'profile_photo_path',
  },
  proofOfAddress: {
    folder: 'learner-id-docs',
    fileField: 'proof_of_address',
    pathField: 'proof_of_address_path',
    nameField: 'proof_of_address_original_name',
    sizeField: 'proof_of_address_size',
    mimeField: 'proof_of_address_mime',
    private: true,
  },
  avatar: {
    folder: 'profile-photos',
    fileField: 'avatar',
    pathField: 'avatar_path',
  },
  contractFile: {
    folder: 'contracts',
    fileField: 'file',
    pathField: 'file_path',
    nameField: 'file_name',
    sizeField: 'file_size',
    mimeField: 'mime_type',
  },
  chatFile: (chatId: number) => ({
    folder: chatUploadFolder(chatId),
    fileField: 'file',
    pathField: 'file_path',
    nameField: 'file_name',
    sizeField: 'file_size',
    mimeField: 'mime_type',
  }),
  chatAvatar: {
    folder: 'chat/avatars',
    fileField: 'avatar',
    pathField: 'avatar_path',
  },
} as const;

type PresignResponse = {
  success: boolean;
  message?: string;
  data?: {
    upload_url: string;
    path: string;
    headers?: Record<string, string>;
  };
};

let cachedConfig: MediaUploadConfig | null = null;
let configPromise: Promise<MediaUploadConfig> | null = null;

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('auth_token') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('auth_token')
  );
}

export function clearMediaUploadConfigCache(): void {
  cachedConfig = null;
  configPromise = null;
}

export async function getMediaUploadConfig(forceRefresh = false): Promise<MediaUploadConfig> {
  if (!forceRefresh && cachedConfig) {
    return cachedConfig;
  }

  if (!forceRefresh && configPromise) {
    return configPromise;
  }

  configPromise = (async () => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/media/upload-config`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const fallback: MediaUploadConfig = {
        direct_upload_enabled: false,
        max_video_bytes: 100 * 1024 * 1024,
        max_document_bytes: 100 * 1024 * 1024,
        max_thumbnail_bytes: 5 * 1024 * 1024,
        max_image_bytes: 5 * 1024 * 1024,
      };
      console.warn(
        `[mediaUpload] GET /media/upload-config failed (${response.status}). ` +
          'Direct S3 upload disabled — files will upload through the API (slow for large videos). ' +
          'Ensure the backend has MEDIA_DISK_DRIVER=s3 and AWS_* env vars set, then run php artisan config:clear.'
      );
      return fallback;
    }

    const json = await response.json();
    cachedConfig = json.data as MediaUploadConfig;
    if (!cachedConfig.direct_upload_enabled) {
      console.warn(
        '[mediaUpload] direct_upload_enabled is false on the API. ' +
          'Set MEDIA_DISK_DRIVER=s3 on the server and run composer install + php artisan config:clear.'
      );
    }
    return cachedConfig;
  })();

  try {
    return await configPromise;
  } finally {
    configPromise = null;
  }
}

export async function isDirectUploadEnabled(): Promise<boolean> {
  const config = await getMediaUploadConfig();
  return Boolean(config.direct_upload_enabled);
}

function putFileToPresignedUrl(
  uploadUrl: string,
  file: File,
  headers: Record<string, string> = {},
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);

    const contentType = file.type || 'application/octet-stream';
    xhr.setRequestHeader('Content-Type', contentType);

    Object.entries(headers).forEach(([key, value]) => {
      if (key.toLowerCase() === 'host' || key.toLowerCase() === 'content-type') return;
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`S3 upload failed (${xhr.status})`));
    };

    xhr.onerror = () => reject(new Error('Network error during S3 upload'));
    xhr.send(file);
  });
}

/**
 * Upload a file directly to S3 using a presigned URL from the API.
 * No AWS credentials are stored in the frontend.
 */
export async function uploadFileDirectToS3(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void,
  options?: { private?: boolean }
): Promise<DirectUploadResult> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('You must be logged in to upload files.');
  }

  const presignResponse = await fetch(`${API_BASE}/media/presign-upload`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      folder,
      filename: file.name,
      content_type: file.type || 'application/octet-stream',
      file_size: file.size,
      private: options?.private ?? folder === 'webinar-recordings',
    }),
  });

  const presignJson = (await presignResponse.json()) as PresignResponse;
  if (presignResponse.status === 401) {
    throw new Error('Session expired. Please log in again and retry the upload.');
  }
  if (!presignResponse.ok || !presignJson.success || !presignJson.data) {
    throw new Error(
      presignJson.message ||
        `Could not start direct S3 upload (HTTP ${presignResponse.status}). ` +
          'Check backend MEDIA_DISK_DRIVER=s3 and AWS credentials.'
    );
  }

  const { upload_url, path, headers = {} } = presignJson.data;
  await putFileToPresignedUrl(upload_url, file, headers, onProgress);

  return {
    path,
    fileName: file.name,
    fileSize: file.size,
  };
}

/**
 * Upload to S3 when enabled, otherwise return null so the caller can send multipart.
 */
const MULTIPART_FALLBACK_MAX_BYTES = 10 * 1024 * 1024;

export async function uploadIfDirectEnabled(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void,
  options?: { private?: boolean }
): Promise<DirectUploadResult | null> {
  // Always re-check server config before upload (avoids stale cache after deploy).
  const config = await getMediaUploadConfig(true);
  if (!config.direct_upload_enabled) {
    if (file.size > MULTIPART_FALLBACK_MAX_BYTES) {
      throw new Error(
        'Direct S3 upload is not enabled on the server. Large files cannot be uploaded through the API. ' +
          'On the backend set MEDIA_DISK_DRIVER=s3, configure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, ' +
          'AWS_DEFAULT_REGION, AWS_BUCKET, then run: composer install && php artisan config:clear'
      );
    }
    return null;
  }

  return uploadFileDirectToS3(file, folder, onProgress, options);
}

/**
 * Append a file to FormData — uploads directly to S3 when enabled, otherwise multipart.
 */
export async function appendMediaToFormData(
  formData: FormData,
  file: File,
  options: AppendMediaOptions
): Promise<void> {
  const uploaded = await uploadIfDirectEnabled(
    file,
    options.folder,
    options.onProgress,
    { private: options.private }
  );

  if (uploaded) {
    formData.append(options.pathField, uploaded.path);
    if (options.nameField) formData.append(options.nameField, uploaded.fileName);
    if (options.sizeField) formData.append(options.sizeField, String(uploaded.fileSize));
    if (options.mimeField && file.type) formData.append(options.mimeField, file.type);
    return;
  }

  formData.append(options.fileField, file);
}

export function shouldUseDirectUpload(
  config: MediaUploadConfig | null,
  _file?: File,
  _type?: 'video' | 'document' | 'thumbnail' | 'image'
): boolean {
  return Boolean(config?.direct_upload_enabled);
}

export function getMaxBytesForType(
  config: MediaUploadConfig | null,
  type: 'video' | 'document' | 'thumbnail' | 'image'
): number {
  if (!config) {
    if (type === 'thumbnail' || type === 'image') return 5 * 1024 * 1024;
    return 100 * 1024 * 1024;
  }

  if (type === 'video') return config.max_video_bytes;
  if (type === 'thumbnail') return config.max_thumbnail_bytes;
  if (type === 'image') return config.max_image_bytes ?? config.max_thumbnail_bytes;
  return config.max_document_bytes;
}

export function chatUploadFolder(chatId: number): `chat/${number}` {
  return `chat/${chatId}`;
}

/**
 * Fetch a presigned S3 playback URL for a storage path (large videos).
 * DB stores only `path`; this returns the temporary S3 URL for &lt;video src&gt;.
 */
export async function getPresignedPlaybackUrl(storagePath: string): Promise<string> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('You must be logged in to play media.');
  }

  const response = await fetch(`${API_BASE}/media/presign-playback`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ path: storagePath.replace(/^\/+/, '') }),
  });

  const json = await response.json();
  if (!response.ok || !json.success || !json.data?.playback_url) {
    throw new Error(json.message || 'Could not get playback URL');
  }

  return json.data.playback_url as string;
}
