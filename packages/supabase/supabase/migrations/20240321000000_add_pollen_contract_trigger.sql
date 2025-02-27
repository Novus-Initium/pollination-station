-- First create a function to track the status of contract updates
CREATE TABLE contract_updates (
    id BIGSERIAL PRIMARY KEY,
    pollen_id BIGINT REFERENCES pollen(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'success', 'failed'
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add updated_at trigger for contract_updates
CREATE TRIGGER update_contract_updates_updated_at
    BEFORE UPDATE ON contract_updates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create the trigger function for new pollen records
CREATE OR REPLACE FUNCTION handle_new_pollen()
RETURNS TRIGGER AS $$
DECLARE
    requesting_dao_address TEXT;
    fulfilling_dao_address TEXT;
BEGIN
    -- Create a record in contract_updates
    INSERT INTO contract_updates (pollen_id)
    VALUES (NEW.id);

    -- Get the public addresses for both DAOs
    SELECT public_address INTO requesting_dao_address
    FROM daos
    WHERE id = NEW.requesting_dao_id;

    SELECT public_address INTO fulfilling_dao_address
    FROM daos
    WHERE id = NEW.fulfilling_dao_id;

    -- Notify the Edge Function via pg_notify
    PERFORM pg_notify(
        'ethcontract_updates',
        json_build_object(
            'pollen_id', NEW.id,
            'need_id', NEW.need_id,
            'requesting_dao_address', requesting_dao_address,
            'fulfilling_dao_address', fulfilling_dao_address,
            'confidence_score', NEW.confidence_score
        )::text
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_pollen_insert
    AFTER INSERT ON pollen
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_pollen();

-- Add RLS policies for contract_updates
ALTER TABLE contract_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all authenticated users"
    ON contract_updates FOR SELECT
    TO authenticated
    USING (true); 