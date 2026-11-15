-- Migration: 20261115170000_hab_experiences_tags.sql
-- Purpose: Add tags text[] NOT NULL DEFAULT '{}' and nullable source_count integer to experiences
-- Seed tags for existing experiences based on genuine craft features

-- 1. Add tags column if not exists
ALTER TABLE public.experiences 
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

-- 2. Add source_count nullable column if not exists (null by default, no made up numbers)
ALTER TABLE public.experiences 
  ADD COLUMN IF NOT EXISTS source_count integer DEFAULT NULL;

-- 3. Seed tags for experiences with real characteristics
UPDATE public.experiences
SET tags = ARRAY['vé miễn phí', 'thủ công truyền thống', 'lụa tơ tằm']
WHERE experience_id = 'c8281688-2dc1-5cb1-9ff6-139df04ba562'; -- Vạn Phúc

UPDATE public.experiences
SET tags = ARRAY['workshop', 'làm gốm', 'quà lưu niệm']
WHERE experience_id = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69'; -- Bát Tràng

UPDATE public.experiences
SET tags = ARRAY['làm nón', 'trải nghiệm gia đình', 'vé miễn phí']
WHERE experience_id = 'b70bd0fa-6a81-5aec-9ff6-5303210b2fad'; -- Chuông

UPDATE public.experiences
SET tags = ARRAY['thêu tay', 'nghệ nhân']
WHERE experience_id = 'bad51dc8-1529-506a-8302-cb0b1d95954c'; -- Quất Động

UPDATE public.experiences
SET tags = ARRAY['múa rối nước', 'văn hóa dân gian']
WHERE experience_id = '8e485337-5a2c-5703-9fbf-5e0c6492cd87'; -- Đào Thục

UPDATE public.experiences
SET tags = ARRAY['mây tre đan', 'thủ công mỹ nghệ']
WHERE experience_id = 'd95bc77b-5e7b-53a6-a8af-5ccaabb485d8'; -- Phú Vinh

UPDATE public.experiences
SET tags = ARRAY['điêu khắc gỗ', 'tạc tượng']
WHERE experience_id = '67a2cbab-850c-5f69-b496-59f2e9a5f594'; -- Sơn Đồng
