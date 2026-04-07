INSERT INTO api_settings (key, description, category, is_secret, value) VALUES 
('R2_ACCOUNT_ID', 'ID da conta Cloudflare R2', 'storage', true, NULL),
('R2_ACCESS_KEY_ID', 'Access Key ID do Cloudflare R2', 'storage', true, NULL),
('R2_SECRET_ACCESS_KEY', 'Secret Access Key do Cloudflare R2', 'storage', true, NULL),
('R2_BUCKET_NAME', 'Nome do bucket Cloudflare R2', 'storage', false, NULL)
ON CONFLICT (key) DO NOTHING;