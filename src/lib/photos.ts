import { supabase } from './supabase'

export type PhotoBucket = 'car-photos' | 'part-photos'

export function getPhotoUrl(bucket: PhotoBucket, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

export function getPhotoUrls(bucket: PhotoBucket, paths: string[]): string[] {
  return paths.map((path) => getPhotoUrl(bucket, path))
}
