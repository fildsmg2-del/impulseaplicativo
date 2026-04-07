import { supabase } from "@/integrations/supabase/client";

export interface R2UploadResult {
  url: string;
  path: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const r2StorageService = {
  async upload(file: File, folder: string): Promise<R2UploadResult> {
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
    
    // Upload directly through edge function (avoids CORS issues)
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/r2-storage`,
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
      path: data.path
    };
  },
  
  async delete(path: string): Promise<void> {
    const { error } = await supabase.functions.invoke('r2-storage', {
      body: {
        action: 'delete',
        path
      }
    });
    
    if (error) {
      throw new Error(`Failed to delete: ${error.message}`);
    }
  },
  
  async getDownloadUrl(path: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('r2-storage', {
      body: {
        action: 'download',
        path
      }
    });
    
    if (error) {
      throw new Error(`Failed to get download URL: ${error.message}`);
    }
    
    return data.downloadUrl;
  },
  
  async getImageAsBase64(path: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('r2-storage', {
      body: {
        action: 'proxy',
        path
      }
    });
    
    if (error) {
      throw new Error(`Failed to proxy image: ${error.message}`);
    }
    
    return data.base64;
  },
  
  // Extract path from full URL
  extractPathFromUrl(url: string): string | null {
    // URLs are in format: https://pub-xxx.r2.dev/path or https://custom-domain.com/path
    try {
      const urlObj = new URL(url);
      // Remove leading slash
      return urlObj.pathname.substring(1);
    } catch {
      return null;
    }
  }
};