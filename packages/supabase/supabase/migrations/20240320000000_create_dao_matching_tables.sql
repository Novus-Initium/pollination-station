-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create DAOs table
CREATE TABLE daos (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    description_embedding vector(1536), -- Using 1536 dimensions for OpenAI embeddings
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create needs table
CREATE TABLE needs (
    id BIGSERIAL PRIMARY KEY,
    dao_id BIGINT REFERENCES daos(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    embedding vector(1536),
    is_fulfilled BOOLEAN NOT NULL DEFAULT FALSE,
    fulfilled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create pollen table (matching records)
CREATE TABLE pollen (
    id BIGSERIAL PRIMARY KEY,
    need_id BIGINT REFERENCES needs(id) ON DELETE CASCADE,
    requesting_dao_id BIGINT REFERENCES daos(id) ON DELETE CASCADE,
    fulfilling_dao_id BIGINT REFERENCES daos(id) ON DELETE CASCADE,
    collaboration_description TEXT NOT NULL,
    confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for vector similarity search
CREATE INDEX dao_embedding_idx ON daos 
USING ivfflat (description_embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX need_embedding_idx ON needs 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_daos_updated_at
    BEFORE UPDATE ON daos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_needs_updated_at
    BEFORE UPDATE ON needs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pollen_updated_at
    BEFORE UPDATE ON pollen
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to find matching DAOs for a need
CREATE OR REPLACE FUNCTION find_dao_matches(need_id BIGINT, similarity_threshold FLOAT DEFAULT 0.7)
RETURNS TABLE (
    dao_id BIGINT,
    dao_name VARCHAR(255),
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id as dao_id,
        d.name as dao_name,
        1 - (n.embedding <=> d.description_embedding) as similarity
    FROM needs n
    CROSS JOIN daos d
    WHERE n.id = need_id
    AND n.dao_id != d.id  -- Don't match with own DAO
    AND 1 - (n.embedding <=> d.description_embedding) > similarity_threshold
    ORDER BY similarity DESC;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE daos ENABLE ROW LEVEL SECURITY;
ALTER TABLE needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pollen ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to all authenticated users"
    ON daos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow read access to all authenticated users"
    ON needs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow read access to all authenticated users"
    ON pollen FOR SELECT
    TO authenticated
    USING (true);

-- Allow users to update their own DAOs and needs
CREATE POLICY "Allow users to update their own DAOs"
    ON daos FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by);

CREATE POLICY "Allow users to update their own needs"
    ON needs FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM daos
        WHERE daos.id = needs.dao_id
        AND daos.created_by = auth.uid()
    ));

-- Allow users to create DAOs
CREATE POLICY "Allow users to create DAOs"
    ON daos FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by); 