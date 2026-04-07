import { supabase } from "@/integrations/supabase/client";

export interface GoogleDriveUploadResult {
  url: string;
  path: string;
  fileId: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const googleDriveStorageService = {
  async upload(file: File, folder: string): Promise<GoogleDriveUploadResult> {
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${folder}/${timestamp}_${sanitizedName}`;
    
    // Create form data for direct upload through edge function
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    
    // Get session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }
    
    // Upload directly through edge function
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/google-drive-storage`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: formData,
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      url: data.url,
      path: data.path,
      fileId: data.fileId,
    };
  },
  
  async delete(fileId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('google-drive-storage', {
      body: {
        action: 'delete',
        fileId
      }
    });
    
    if (error) {
      throw new Error(`Failed to delete: ${error.message}`);
    }
  },
  
  async getDownloadUrl(fileId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('google-drive-storage', {
      body: {
        action: 'download',
        fileId
      }
    });
    
    if (error) {
      throw new Error(`Failed to get download URL: ${error.message}`);
    }
    
    return data.downloadUrl;
  },
  
  async getImageAsBase64(fileId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('google-drive-storage', {
      body: {
        action: 'proxy',
        fileId
      }
    });
    
    if (error) {
      throw new Error(`Failed to proxy image: ${error.message}`);
    }
    
    return data.base64;
  },
  
  // Extract file ID from Google Drive URL
  extractFileIdFromUrl(url: string): string | null {
    // URLs can be:
    // https://drive.google.com/uc?export=view&id=FILE_ID
    // https://drive.google.com/file/d/FILE_ID/view
    // Or just the file ID itself
    try {
      if (url.includes('id=')) {
        const match = url.match(/id=([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
      }
      if (url.includes('/d/')) {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
      }
      // Check if it's already a file ID (no slashes or http)
      if (!url.includes('/') && !url.includes('http')) {
        return url;
      }
      return null;
    } catch {
      return null;
    }
  }
};
