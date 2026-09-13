'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@/components/account/AuthProvider';
import { Avatar } from '@/components/account/Avatar';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/Form';
import { SpinnerIcon } from '@/components/ui/Icons';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/auth/client';
import { toFailure } from '@/lib/auth/form';
import type { PublicUser, UserResponse } from '@/lib/auth/types';

/**
 * The profile-picture editor, as a glass sheet.
 *
 * Opened from the hero avatar on any account screen. The file goes to the server
 * as raw bytes on a `PUT`, not as multipart: the route reads the body with a hard
 * byte ceiling, and a multipart envelope would have to be buffered in full before
 * any limit could apply. The client-side checks are a courtesy — the server
 * sniffs the real magic bytes and re-encodes every upload regardless.
 */

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/pjpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

export function AvatarEditorSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Profile picture"
      description="A square picture works best. Cineora resizes it to 512 pixels and strips the location and camera data most photos carry."
      size="sm"
    >
      {user ? <PickerBody user={user} onClose={onClose} /> : null}
    </Sheet>
  );
}

function PickerBody({ user, onClose }: { user: PublicUser; onClose: () => void }) {
  const { setUser } = useAuth();
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [error, setError] = useState('');

  async function upload(file: File) {
    // A picker on Android often reports an empty type for a HEIC from the camera
    // roll, so an unknown type is passed through and left to the server's sniffer
    // rather than blocking a legitimate photo.
    if (file.type && !ALLOWED_TYPES.has(file.type.toLowerCase())) {
      setError('Use a JPEG, PNG, WebP, GIF or HEIC image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Images must be 5 MB or smaller.');
      return;
    }

    setError('');
    setBusy('upload');
    try {
      const result = await api<UserResponse>('/api/profile/avatar', {
        method: 'PUT',
        blob: file.type ? file : new Blob([file], { type: 'application/octet-stream' }),
      });
      setUser(result.user);
      toast('Profile picture updated', { tone: 'success' });
      onClose();
    } catch (cause) {
      setError(toFailure(cause).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setError('');
    setBusy('remove');
    try {
      await api<void>('/api/profile/avatar', { method: 'DELETE' });
      setUser({ ...user, avatarUrl: null });
      toast('Profile picture removed');
      onClose();
    } catch (cause) {
      setError(toFailure(cause).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* The preview: the current picture in the same glass frame the hero uses. */}
      <div className="edge-ring relative shrink-0 rounded-full ring-1 ring-white/15">
        <Avatar user={user} size="xl" />
        {busy === 'upload' ? (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-ink-900/70">
            <SpinnerIcon className="size-6 text-white" />
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {/* The label is the control: a bare file input cannot be styled, and a
            button that clicks a hidden input keeps the native picker. */}
        <Button variant="glass" size="sm" disabled={busy !== null} onClick={() => input.current?.click()}>
          {user.avatarUrl ? 'Change photo' : 'Upload a photo'}
        </Button>
        {user.avatarUrl ? (
          <Button variant="ghost" size="sm" disabled={busy !== null} onClick={remove}>
            {busy === 'remove' ? 'Removing…' : 'Remove'}
          </Button>
        ) : null}
      </div>

      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        aria-label="Choose a profile picture"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset first, so choosing the same file twice still fires a change.
          event.target.value = '';
          if (file) void upload(file);
        }}
      />

      {error ? <FormAlert>{error}</FormAlert> : null}
    </div>
  );
}
