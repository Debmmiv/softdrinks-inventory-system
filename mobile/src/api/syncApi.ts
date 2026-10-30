import { api } from './client';

export type PendingTransaction = {
  transaction_id: string;
  product_id: string;
  type: 'DELIVERY' | 'RELEASE' | 'ADJUSTMENT';
  cases: number;
  bottles: number;
  total_bottles: number;
  party?: string;
  device_id?: string;
  created_at: string;
};

export type SyncResult = {
  transaction_id: string;
  status: 'SYNCED' | 'DUPLICATE' | 'FAILED';
  error?: string;
};

export function pushTransactions(transactions: PendingTransaction[]) {
  return api<{ results: SyncResult[] }>('/api/sync', {
    method: 'POST',
    body: JSON.stringify({ transactions }),
  });
}
