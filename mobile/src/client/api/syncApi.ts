import { apiClient } from './client';
import type { BatchSyncPayload, BatchSyncResponse } from '../types/sync';
import type { Product } from '../types/inventory';
import type { User } from '../types/user';

export interface LoginResponse {
  token: string;
  user: User;
}

export interface DownstreamResponse {
  server_time: string;
  count: number;
  products: {
    _id: string;
    brand_name: string;
    product_name: string;
    bottle_size: string;
    units_per_case: number;
    reorder_threshold_bottles: number;
    total_stock_bottles: number;
    is_active: boolean;
    updated_at: string;
  }[];
}

/**
 * Pushes a batch of offline transactions to the cloud API. (FR20)
 */
export async function uploadBatchApi(payload: BatchSyncPayload): Promise<BatchSyncResponse> {
  const response = await apiClient.post<BatchSyncResponse>('/sync/batch', payload);
  return response.data;
}

/**
 * Pulls authoritative products and stock levels updated since timestamp. (FR23, FR31)
 */
export async function fetchDownstreamApi(since?: string | null): Promise<DownstreamResponse> {
  const params: Record<string, string> = {};
  if (since) params.since = since;
  const response = await apiClient.get<DownstreamResponse>('/sync/downstream', { params });
  return response.data;
}

/**
 * Authenticates user credentials online against MongoDB Atlas. (FR2)
 */
export async function loginApi(username: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', {
    username,
    password,
  });
  return response.data;
}

/**
 * Changes password online. (FR28)
 */
export async function changePasswordApi(
  current_password: string,
  new_password: string
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>('/auth/change-password', {
    current_password,
    new_password,
  });
  return response.data;
}
