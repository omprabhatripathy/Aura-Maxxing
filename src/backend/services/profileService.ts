import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, paths } from '../db';
import { storage } from '../firebase/config';
import { ValidationError } from '../core/errors';
import { nowIso } from '../core/ids';
import { validateUsername } from '../validators';
import type { Gender, Preferences } from '../models';
import { activityOp, commit, setOp } from './ops';

export const SCHEMA_VERSION = 2;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export async function ensureUserDocument(uid: string, profile: { username: string; email: string | null; photoURL: string | null }, isNew: boolean): Promise<void> {
  const existing = await database.getDoc(paths.users(), uid);
  if (existing) return;
  await commit([
    setOp(paths.users(), uid, { uid, ...profile, gender: null, createdAt: nowIso(), schemaVersion: SCHEMA_VERSION }),
    ...(isNew ? [activityOp(uid, 'registration', `Created account as ${profile.username}`)] : []),
  ]);
}

export async function updateUsername(uid: string, username: string): Promise<void> {
  const valid = validateUsername(username);
  await commit([setOp(paths.users(), uid, { username: valid }, true), activityOp(uid, 'profile-updated', `Changed display name to ${valid}`)]);
}

export async function setGender(uid: string, gender: Gender): Promise<void> {
  await commit([setOp(paths.users(), uid, { gender }, true)]);
}

export async function savePreferences(uid: string, patch: Partial<Preferences>): Promise<void> {
  await saveSettings(uid, 'preferences', patch);
}

export async function saveSettings(uid: string, id: string, patch: Record<string, unknown>): Promise<void> {
  await commit([setOp(paths.settings(uid), id, { ...patch, updatedAt: nowIso() }, true)]);
}

/** Downscales an image to a square JPEG so avatars stay small in storage and on the network. */
async function resizeImage(file: File, size = 256): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  const side = Math.min(bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding failed'))), 'image/jpeg', 0.85));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Uploads a profile photo to Firebase Storage (or stores a small data URL in local mode) and saves it on the profile. */
export async function uploadAvatar(uid: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new ValidationError('Please choose an image file.');
  if (file.size > MAX_AVATAR_BYTES) throw new ValidationError('Images must be 5 MB or smaller.');
  const blob = await resizeImage(file);
  let url: string;
  if (storage) {
    const objectRef = ref(storage, `users/${uid}/avatar.jpg`);
    await uploadBytes(objectRef, blob, { contentType: 'image/jpeg' });
    url = await getDownloadURL(objectRef);
  } else {
    url = await blobToDataUrl(await resizeImage(file, 128));
  }
  await commit([setOp(paths.users(), uid, { photoURL: url }, true), activityOp(uid, 'profile-updated', 'Updated profile photo')]);
  return url;
}
