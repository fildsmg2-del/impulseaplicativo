import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')!;
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')!;
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')!;
const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME')!;
const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL') || '';

const encoder = new TextEncoder();

async function hmacSha256(key: BufferSource, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
}

async function sha256(data: Uint8Array | string): Promise<string> {
  const dataToHash = typeof data === 'string' ? encoder.encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataToHash as unknown as BufferSource);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(encoder.encode(`AWS4${secretKey}`).buffer as ArrayBuffer, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentTypeHeader = req.headers.get('content-type') || '';
    
    // Handle multipart form data upload (direct upload through edge function)
    if (contentTypeHeader.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      const path = formData.get('path') as string;
      
      if (!file || !path) {
        return new Response(JSON.stringify({ error: 'File and path are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const fileBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(fileBuffer);
      const payloadHash = await sha256(fileBytes);
      
      const r2Endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      const url = new URL(`${r2Endpoint}/${R2_BUCKET_NAME}/${path}`);
      
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = amzDate.slice(0, 8);
      const region = 'auto';
      const service = 's3';
      
      const signedHeadersList = ['content-type', 'host', 'x-amz-content-sha256', 'x-amz-date'];
      const signedHeaders = signedHeadersList.join(';');
      
      const canonicalHeaders = [
        `content-type:${file.type}`,
        `host:${url.host}`,
        `x-amz-content-sha256:${payloadHash}`,
        `x-amz-date:${amzDate}`,
      ].join('\n') + '\n';
      
      const canonicalRequest = [
        'PUT',
        `/${R2_BUCKET_NAME}/${path}`,
        '',
        canonicalHeaders,
        signedHeaders,
        payloadHash
      ].join('\n');
      
      const canonicalRequestHash = await sha256(canonicalRequest);
      const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
      
      const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        canonicalRequestHash
      ].join('\n');
      
      const signingKey = await getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, region, service);
      const signatureBuffer = await hmacSha256(signingKey, stringToSign);
      const signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      const authHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
      
      console.log('Uploading to R2:', path);
      
      const uploadResponse = await fetch(url.toString(), {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          'x-amz-date': amzDate,
          'x-amz-content-sha256': payloadHash,
          'Authorization': authHeader,
        },
        body: fileBytes,
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('R2 upload error:', uploadResponse.status, errorText);
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
      }
      
      console.log('Upload successful:', path);
      
      // Build public URL
      const publicUrl = R2_PUBLIC_URL 
        ? `${R2_PUBLIC_URL}/${path}`
        : `https://pub-${R2_ACCOUNT_ID}.r2.dev/${path}`;
      
      return new Response(JSON.stringify({ 
        success: true,
        url: publicUrl,
        path 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle JSON requests (delete, download)
    const { action, path } = await req.json();
    const r2Endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    
    if (action === 'delete') {
      const url = new URL(`${r2Endpoint}/${R2_BUCKET_NAME}/${path}`);
      
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = amzDate.slice(0, 8);
      const region = 'auto';
      const service = 's3';
      const payloadHash = await sha256('');
      
      const signedHeadersList = ['host', 'x-amz-content-sha256', 'x-amz-date'];
      const signedHeaders = signedHeadersList.join(';');
      
      const canonicalHeaders = [
        `host:${url.host}`,
        `x-amz-content-sha256:${payloadHash}`,
        `x-amz-date:${amzDate}`,
      ].join('\n') + '\n';
      
      const canonicalRequest = [
        'DELETE',
        `/${R2_BUCKET_NAME}/${path}`,
        '',
        canonicalHeaders,
        signedHeaders,
        payloadHash
      ].join('\n');
      
      const canonicalRequestHash = await sha256(canonicalRequest);
      const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
      
      const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        canonicalRequestHash
      ].join('\n');
      
      const signingKey = await getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, region, service);
      const signatureBuffer = await hmacSha256(signingKey, stringToSign);
      const signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      const authHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
      
      console.log('Deleting from R2:', path);
      
      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          'x-amz-date': amzDate,
          'x-amz-content-sha256': payloadHash,
          'Authorization': authHeader,
        },
      });
      
      if (!response.ok && response.status !== 204) {
        const errorText = await response.text();
        console.error('R2 delete error:', response.status, errorText);
        throw new Error(`Failed to delete: ${response.status}`);
      }
      
      console.log('Delete successful:', path);
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (action === 'download') {
      // Return public URL for download
      const publicUrl = R2_PUBLIC_URL 
        ? `${R2_PUBLIC_URL}/${path}`
        : `https://pub-${R2_ACCOUNT_ID}.r2.dev/${path}`;
      
      return new Response(JSON.stringify({ downloadUrl: publicUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (action === 'proxy') {
      // Proxy image through edge function to avoid CORS
      const publicUrl = R2_PUBLIC_URL 
        ? `${R2_PUBLIC_URL}/${path}`
        : `https://pub-${R2_ACCOUNT_ID}.r2.dev/${path}`;
      
      try {
        const response = await fetch(publicUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await response.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        
        return new Response(JSON.stringify({ 
          base64: `data:${contentType};base64,${base64}`,
          contentType 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Error proxying image:', error);
        return new Response(JSON.stringify({ error: 'Failed to proxy image' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('R2 Storage error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});