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

export interface AdminUserRecord {
  _id: string;
  username: string;
  full_name: string;
  role: 'staff' | 'owner/manager';
  is_active: boolean;
  created_at: string;
}

export interface EnrollPayload {
  username: string;
  full_name: string;
  initial_password: string;
  role?: 'staff' | 'owner/manager';
}

/**
 * Enrolls a new staff member online. (FR6)
 */
export async function enrollUserApi(payload: EnrollPayload): Promise<{ message: string; user: AdminUserRecord }> {
  const response = await apiClient.post<{ message: string; user: AdminUserRecord }>('/auth/admin/enroll', payload);
  return response.data;
}

/**
 * Retrieves all registered users in the cloud database. (FR7)
 */
export async function fetchUsersApi(): Promise<{ users: AdminUserRecord[] }> {
  const response = await apiClient.get<{ users: AdminUserRecord[] }>('/auth/users');
  return response.data;
}

/**
 * Toggles an account active/deactivated status. (FR7)
 */
export async function toggleUserStatusApi(userId: string, is_active: boolean): Promise<{ message: string; user: AdminUserRecord }> {
  const response = await apiClient.patch<{ message: string; user: AdminUserRecord }>(`/auth/users/${userId}/status`, { is_active });
  return response.data;
}

/**
 * Resets a staff member's forgotten password. (FR29)
 */
export async function resetUserPasswordApi(user_id: string, new_temporary_password: string): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>('/auth/admin/reset-password', {
    user_id,
    new_temporary_password,
  });
  return response.data;
}
