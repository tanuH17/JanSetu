import { supabase } from './supabase';

const MEDIA_RULES = {
  avatar: { maxBytes: 5 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] },
  complaint: {
    maxBytes: 20 * 1024 * 1024,
    types: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'],
  },
  project: {
    maxBytes: 50 * 1024 * 1024,
    types: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'],
  },
};

const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

export function validateMediaFile(file, kind) {
  const rule = MEDIA_RULES[kind];
  if (!rule) return 'Unsupported upload type.';
  if (!rule.types.includes(file?.type)) return 'Choose a supported JPG, PNG, WEBP, MP4, or WEBM file.';
  if (file.size > rule.maxBytes) return `File exceeds the ${Math.floor(rule.maxBytes / 1024 / 1024)} MB limit.`;
  return null;
}

export async function uploadPrivateMedia(bucket, file, kind, pathPrefix) {
  const validationError = validateMediaFile(file, kind);
  if (validationError) throw new Error(validationError);
  const extension = EXTENSIONS[file.type];
  const path = `${pathPrefix}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: file.type,
    cacheControl: '3600',
  });
  if (error) throw error;
  return path;
}

export async function removePrivateMedia(bucket, path) {
  if (!path || /^https?:\/\//i.test(path)) return;
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

export async function resolvePrivateMediaUrl(bucket, path, expiresIn = 3600) {
  if (!path) return null;
  // Existing public URLs continue to render during migration from the old storage setup.
  if (/^https?:\/\//i.test(path)) return path;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
