function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('auth_token') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('auth_token')
  );
}

function fileNameFromDisposition(disposition: string | null): string | null {
  if (!disposition) return null;
  const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)"?/i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function triggerUrlDownload(url: string, fileName?: string, inline = false): void {
  if (inline) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  if (fileName) {
    link.download = fileName;
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function isPresignedS3Url(url: string): boolean {
  return url.includes('X-Amz-') || url.includes('AWSAccessKeyId=');
}

function isApiRecordingFileUrl(url: string): boolean {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.href : 'http://localhost');
    return parsed.pathname.includes('/recording/file');
  } catch {
    return false;
  }
}

function triggerPresignedDownload(url: string, fileName?: string): void {
  void fileName;
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    window.location.assign(url);
  }
}

async function openSignedUrl(url: string, fileName?: string, inline = false): Promise<void> {
  if (inline) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  if (isPresignedS3Url(url) || isApiRecordingFileUrl(url)) {
    triggerPresignedDownload(url, fileName);
    return;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed (${response.status})`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

type SignedDownloadPayload = {
  success?: boolean;
  message?: string;
  data?: {
    download_url?: string;
    url?: string;
    file_name?: string;
    inline?: boolean;
  };
};

async function parseErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const json = JSON.parse(text) as SignedDownloadPayload;
    return json.message || 'Request failed';
  } catch {
    return text.trim() || `Request failed (${response.status})`;
  }
}

/** Fetch a protected file and open it in a new browser tab (for PDF viewing). */
export async function viewAuthenticatedFile(url: string): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  const contentType = response.headers.get('Content-Type') || '';

  if (contentType.includes('application/json')) {
    const json = (await response.json()) as SignedDownloadPayload;
    if (!response.ok || !json.success) {
      throw new Error(json.message || 'Unable to open file');
    }
    const signedUrl = json.data?.download_url ?? json.data?.url;
    if (!signedUrl) {
      throw new Error('File URL not available');
    }
    await openSignedUrl(signedUrl, json.data?.file_name, true);
    return;
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

/** Download a file through an authenticated API endpoint (S3-safe). */
export async function downloadAuthenticatedFile(
  url: string,
  fileName?: string
): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (response.redirected && response.url) {
    await openSignedUrl(response.url, fileName, false);
    return;
  }

  const contentType = response.headers.get('Content-Type') || '';

  if (contentType.includes('application/json')) {
    const json = (await response.json()) as SignedDownloadPayload;
    if (!response.ok || json.success === false) {
      throw new Error(json.message || 'Download failed');
    }
    const signedUrl = json.data?.download_url ?? json.data?.url;
    if (!signedUrl) {
      throw new Error('Download URL not available');
    }
    await openSignedUrl(signedUrl, json.data?.file_name ?? fileName, Boolean(json.data?.inline));
    return;
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const blob = await response.blob();
  const downloadName =
    fileName ||
    fileNameFromDisposition(response.headers.get('Content-Disposition')) ||
    'download';

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}
