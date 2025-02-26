-- Add public address column to daos table
ALTER TABLE daos 
ADD COLUMN public_address VARCHAR(42) NOT NULL,  -- Ethereum addresses are 42 chars (including '0x')
ADD CONSTRAINT unique_dao_address UNIQUE (public_address),
ADD CONSTRAINT valid_ethereum_address CHECK (public_address ~ '^0x[a-fA-F0-9]{40}$'); 