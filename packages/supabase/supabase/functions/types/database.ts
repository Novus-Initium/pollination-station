export interface Dao {
    id: number;
    name: string;
    description: string;
    public_address: string;
    description_embedding: number[] | null;
    created_at: string;
    updated_at: string;
}

export interface Need {
    id: number;
    dao_id: number;
    description: string;
    embedding: number[] | null;
    is_fulfilled: boolean;
    fulfilled_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Pollen {
    id: number;
    need_id: number;
    requesting_dao_id: number;
    fulfilling_dao_id: number;
    collaboration_description: string;
    confidence_score: number;
    created_at: string;
    updated_at: string;
} 