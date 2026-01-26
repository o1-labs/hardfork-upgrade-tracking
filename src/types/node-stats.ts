export interface NodeStats {
  max_observed_block_height: number;
  commit_hash: string;
  chain_id: string;
  peer_id: string;
  peer_count: number;
  timestamp: string;
  block_producer_public_key?: string;
  upgraded?: boolean;
}
