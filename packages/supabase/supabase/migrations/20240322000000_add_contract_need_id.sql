-- Add contract_need_id column to needs table
ALTER TABLE needs 
ADD COLUMN contract_need_id VARCHAR(255) NULL;

-- Add an index for faster lookups
CREATE INDEX idx_needs_contract_need_id ON needs(contract_need_id);

-- Add a comment explaining the purpose of this column
COMMENT ON COLUMN needs.contract_need_id IS 'The ID of the need in the smart contract, which may differ from the database ID';