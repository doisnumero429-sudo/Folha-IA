-- Add CID (ICD-10) code to medical certificates
ALTER TABLE atestados ADD COLUMN IF NOT EXISTS cid TEXT;
