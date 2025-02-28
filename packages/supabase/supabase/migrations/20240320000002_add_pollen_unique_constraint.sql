-- Add unique constraint to pollen table for upsert operations
ALTER TABLE pollen 
ADD CONSTRAINT unique_pollen_match 
UNIQUE (need_id, fulfilling_dao_id);

-- This ensures we don't have duplicate matches between the same need and fulfilling DAO 