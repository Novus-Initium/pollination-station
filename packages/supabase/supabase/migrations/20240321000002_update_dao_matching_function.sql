-- Drop the old function
DROP FUNCTION IF EXISTS find_dao_matches(BIGINT, FLOAT);

-- Create new function that limits to top 5 matches
CREATE OR REPLACE FUNCTION find_dao_matches(need_id BIGINT, similarity_threshold FLOAT DEFAULT 0.7)
RETURNS TABLE (
    dao_id BIGINT,
    dao_name VARCHAR(255),
    dao_address VARCHAR(42),
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id as dao_id,
        d.name as dao_name,
        d.public_address as dao_address,
        1 - (n.embedding <=> d.description_embedding) as similarity
    FROM needs n
    CROSS JOIN daos d
    WHERE n.id = need_id
    AND n.dao_id != d.id  -- Don't match with own DAO
    AND 1 - (n.embedding <=> d.description_embedding) > similarity_threshold
    ORDER BY similarity DESC
    LIMIT 5;  -- Only return top 5 matches
END;
$$ LANGUAGE plpgsql;

-- Create a function to automatically create pollen records for top matches
CREATE OR REPLACE FUNCTION create_pollen_matches(need_id_param BIGINT)
RETURNS void AS $$
DECLARE
    requesting_dao_id_var BIGINT;
BEGIN
    -- Get the requesting DAO's ID
    SELECT dao_id INTO requesting_dao_id_var
    FROM needs
    WHERE id = need_id_param;

    -- Delete existing pollen records for this need
    DELETE FROM pollen WHERE need_id = need_id_param;

    -- Insert new pollen records for top 5 matches
    INSERT INTO pollen (
        need_id,
        requesting_dao_id,
        fulfilling_dao_id,
        collaboration_description,
        confidence_score
    )
    SELECT 
        need_id_param,
        requesting_dao_id_var,
        matches.dao_id,
        CONCAT(
            'Match Score: ', ROUND(matches.similarity::numeric, 2)::text,
            E'\nDAO: ', matches.dao_name,
            E'\nAddress: ', matches.dao_address
        ),
        matches.similarity
    FROM find_dao_matches(need_id_param) matches;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically create matches when a need is created
CREATE OR REPLACE FUNCTION auto_create_matches()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create matches if the embedding is not null
    IF NEW.embedding IS NOT NULL THEN
        PERFORM create_pollen_matches(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add the trigger to the needs table
DROP TRIGGER IF EXISTS create_matches_on_need_insert ON needs;
CREATE TRIGGER create_matches_on_need_insert
    AFTER INSERT ON needs
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_matches();

-- Also trigger when the embedding is updated
DROP TRIGGER IF EXISTS create_matches_on_need_update ON needs;
CREATE TRIGGER create_matches_on_need_update
    AFTER UPDATE OF embedding ON needs
    FOR EACH ROW
    WHEN (OLD.embedding IS DISTINCT FROM NEW.embedding)
    EXECUTE FUNCTION auto_create_matches(); 