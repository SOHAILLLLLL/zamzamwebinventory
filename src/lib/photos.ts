import { supabase } from './supabase'

export type PhotoBucket = 'car-photos' | 'part-photos'

// Buckets are private — always resolve through the authenticated session, never getPublicUrl.
const SIGNED_URL_TTL_SECONDS = 60 * 60

export async function getSignedPhotoUrl(bucket: PhotoBucket, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return null
  return data.signedUrl
}

export async function getSignedPhotoUrls(bucket: PhotoBucket, paths: string[]): Promise<(string | null)[]> {
  if (paths.length === 0) return []
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return paths.map(() => null)
  return data.map((entry) => entry.signedUrl ?? null)
}
