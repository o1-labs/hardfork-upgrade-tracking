export interface BlockProducer {
  public_key: string;
  total_stake: number;
  num_delegators: number;
  is_active: boolean;
  percent_total_stake: number;
  percent_total_active_stake: number | null;
  upgraded: boolean;
}
