/**
 * Supabase Storage Client - Reusable image upload utilities
 * Handles uploading images to different buckets (avatars, banners, etc)
 */

import { supabase } from './supabase';

export interface UploadImageOptions {
  bucket: 'avatars' | 'banners' | 'playlist-covers' | 'song-covers';
  userId: string;
  imageUri: string;
  onProgress?: (progress: number) => void;
}

/**
 * Upload an image to Supabase Storage and return its public URL
 * @param options - Upload options including bucket, userId, and imageUri
 * @returns Public URL of the uploaded image or null if upload fails
 */
export async function uploadImageToStorage(
  options: UploadImageOptions
): Promise<string | null> {
  try {
    const { bucket, userId, imageUri } = options;

    // Fetch the image file
    const response = await fetch(imageUri);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const blob = await response.blob();

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const fileName = `${userId}-${timestamp}-${randomId}.jpg`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    
    if (!data?.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    return data.publicUrl;
  } catch (error) {
    console.error('[supabaseStorageClient] Upload error:', error);
    return null;
  }
}

/**
 * Delete an image from Supabase Storage
 * @param bucket - The storage bucket name
 * @param fileName - The file name to delete
 * @returns true if successful, false otherwise
 */
export async function deleteImageFromStorage(
  bucket: 'avatars' | 'banners' | 'playlist-covers' | 'song-covers',
  fileName: string
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName]);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('[supabaseStorageClient] Delete error:', error);
    return false;
  }
}

/**
 * Get the public URL for a stored image without uploading
 * @param bucket - The storage bucket name
 * @param fileName - The file name
 * @returns Public URL of the image
 */
export function getImagePublicUrl(
  bucket: 'avatars' | 'banners' | 'playlist-covers' | 'song-covers',
  fileName: string
): string | null {
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data?.publicUrl || null;
  } catch (error) {
    console.error('[supabaseStorageClient] Get URL error:', error);
    return null;
  }
}

/**
 * Extract file name from a full Supabase storage URL
 * @param url - The full URL or path
 * @returns Just the file name
 */
export function extractFileNameFromUrl(url: string): string {
  if (!url) return '';
  // Handle both full URLs and just file paths
  const parts = url.split('/');
  return parts[parts.length - 1] || '';
}
