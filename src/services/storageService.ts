// Unified storage service - using Cloudflare R2
// This file abstracts the storage implementation so it can be easily swapped

import { r2StorageService } from '@/services/r2StorageService';

export interface StorageUploadResult {
  url: string;
  path: string;
}

export const storageService = {
  async upload(file: File, folder: string): Promise<StorageUploadResult> {
    const result = await r2StorageService.upload(file, folder);
    return {
      url: result.url,
      path: result.path,
    };
  },
  
  async delete(pathOrUrl: string): Promise<void> {
    const path = r2StorageService.extractPathFromUrl(pathOrUrl) || pathOrUrl;
    await r2StorageService.delete(path);
  },
  
  async getDownloadUrl(pathOrUrl: string): Promise<string> {
    const path = r2StorageService.extractPathFromUrl(pathOrUrl) || pathOrUrl;
    return r2StorageService.getDownloadUrl(path);
  },
  
  async getImageAsBase64(pathOrUrl: string): Promise<string> {
    const path = r2StorageService.extractPathFromUrl(pathOrUrl) || pathOrUrl;
    return r2StorageService.getImageAsBase64(path);
  },
  
  extractPathFromUrl(url: string): string | null {
    return r2StorageService.extractPathFromUrl(url);
  }
};
