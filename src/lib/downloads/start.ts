import { api } from '@/lib/auth/client';
import { enqueueNative, type NativeDownloadRequest } from '@/lib/downloads/bridge';
import type { DownloadGrantResponse, DownloadItem } from '@/lib/downloads/types';
import { recordDownload } from '@/lib/storage';
import type { MediaKind } from '@/types/media';

/**
 * Starting a download, from the browser's side.
 *
 * Two steps, because they have different requirements. Authorisation is an ordinary
 * API call with the session cookie and the CSRF header; the transfer is a plain URL
 * that whatever downloads it will fetch on its own terms. Keeping them apart is what
 * lets a native host take the second half.
 */

export interface DownloadContext {
  titleId: string;
  kind: MediaKind;
}

export interface StartedDownload {
  /** Who took it. The sheet words its confirmation from this. */
  via: 'native' | 'browser';
  fileName: string;
}

/**
 * Hands the URL to the browser.
 *
 * The response carries `Content-Disposition: attachment`, which is what makes this a
 * download rather than a navigation; the `download` attribute only supplies the
 * filename, and is honoured because the link is same-origin.
 */
function handOffToBrowser(url: string, fileName: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

/** Throws `ApiError` if authorisation is refused, so a form can report it. */
export async function startDownload(
  context: DownloadContext,
  item: DownloadItem,
): Promise<StartedDownload> {
  const grant = await api<DownloadGrantResponse>('/api/downloads/grant', {
    method: 'POST',
    body: { key: item.key },
  });

  // The route answers with a root-relative path; the absolute form is built here
  // because a native host cannot resolve one.
  const url = new URL(grant.url, window.location.origin).toString();

  const request: NativeDownloadRequest = {
    url,
    fileName: grant.fileName,
    contentType: grant.contentType,
    sizeBytes: grant.sizeBytes,
    title: grant.title,
    quality: grant.quality,
    expiresAt: grant.expiresAt,
  };

  const handoff = await enqueueNative(request);
  const via = handoff.via === 'native' ? 'native' : 'browser';
  if (via === 'browser') handOffToBrowser(url, grant.fileName);

  recordDownload({
    key: item.key,
    titleId: context.titleId,
    kind: context.kind,
    title: grant.title,
    group: item.group,
    quality: grant.quality,
    sizeBytes: grant.sizeBytes,
    fileName: grant.fileName,
    handoff: via,
    nativeId: handoff.via === 'native' ? handoff.id : null,
  });

  return { via, fileName: grant.fileName };
}
