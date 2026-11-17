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
): Promise<{ message: string; token?: string }> {
  const response = await apiClient.post<{ message: string; token?: string }>('/auth/change-password', {
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

export interface DiscrepancyRecord {
  id: string;
  uuid: string;
  status: 'OPEN' | 'RESOLVED';
  transaction_type: 'DELIVERY' | 'RELEASE' | 'ADJUSTMENT';
  total_bottles_delta: number;
  /** What the recording device believed the stock would be after this transaction. */
  device_expected_stock: number;
  /** Central stock right after the server applied it. */
  stock_after_sync: number | null;
  device_id: string;
  note: string | null;
  created_at: string;
  synced_at: string | null;
  product: {
    id: string;
    name: string;
    bottle_size: string;
    units_per_case: number;
    current_stock_bottles: number;
  } | null;
  recorded_by: { username: string; full_name: string } | null;
  resolved_at: string | null;
  resolved_by: { username: string; full_name: string } | null;
  resolution_note: string | null;
}

export type DiscrepancyFilter = 'open' | 'resolved';

/**
 * Lists transactions flagged CONCURRENCY_DEFICIT for owner review. Owner only. (NFR13)
 */
export async function fetchDiscrepanciesApi(
  status: DiscrepancyFilter = 'open'
): Promise<{ open_count: number; discrepancies: DiscrepancyRecord[] }> {
  const response = await apiClient.get<{ open_count: number; discrepancies: DiscrepancyRecord[] }>(
    '/discrepancies',
    { params: { status } }
  );
  return response.data;
}

/**
 * Marks a flagged transaction as resolved with an audit note. Owner only. (NFR13)
 */
export async function resolveDiscrepancyApi(
  id: string,
  resolution_note: string
): Promise<{ message: string; open_count: number }> {
  const response = await apiClient.patch<{ message: string; open_count: number }>(
    `/discrepancies/${id}`,
    { resolution_note }
  );
  return response.data;
}

// ---- Owner: product catalog (FR8, FR9, FR10) ------------------------------

export interface CatalogProduct {
  _id: string;
  brand_name: string;
  product_name: string;
  bottle_size: string;
  units_per_case: number;
  reorder_threshold_bottles: number;
  total_stock_bottles: number;
  is_active: boolean;
  updated_at: string;
}

export interface ProductFormPayload {
  brand_name: string;
  product_name: string;
  bottle_size: string;
  units_per_case: number;
  reorder_threshold_bottles: number;
}

/** Owner view of the catalog, including deactivated products. */
export async function fetchCatalogApi(): Promise<{ products: CatalogProduct[] }> {
  const response = await apiClient.get<{ products: CatalogProduct[] }>('/products', {
    params: { include_inactive: 'true' },
  });
  return response.data;
}

export async function createProductApi(
  payload: ProductFormPayload
): Promise<{ message: string; product: CatalogProduct }> {
  const response = await apiClient.post<{ message: string; product: CatalogProduct }>('/products', payload);
  return response.data;
}

export async function updateProductApi(
  id: string,
  payload: Partial<ProductFormPayload> & { is_active?: boolean }
): Promise<{ message: string; product: CatalogProduct }> {
  const response = await apiClient.patch<{ message: string; product: CatalogProduct }>(`/products/${id}`, payload);
  return response.data;
}

// ---- Owner: reports (FR25, FR26) ------------------------------------------

export interface ReplenishmentItem {
  product_id: string;
  brand_name: string;
  product_name: string;
  bottle_size: string;
  units_per_case: number;
  current_stock_bottles: number;
  reorder_threshold_bottles: number;
  deficit_bottles: number;
  deficit_display: string;
}

export async function fetchReplenishmentApi(): Promise<{
  total_items_to_replenish: number;
  replenishment: ReplenishmentItem[];
}> {
  const response = await apiClient.get('/reports/replenishment');
  return response.data;
}

export interface MovementRow {
  product_id: string;
  product_name: string;
  units_per_case: number;
  transaction_type: 'DELIVERY' | 'RELEASE' | 'ADJUSTMENT';
  total_cases: number;
  total_loose_bottles: number;
  total_bottles_delta: number;
  transaction_count: number;
}

export interface SummaryParams {
  start_date?: string;
  end_date?: string;
  type?: 'DELIVERY' | 'RELEASE' | 'ADJUSTMENT';
}

export async function fetchSummaryApi(params: SummaryParams = {}): Promise<{ movements: MovementRow[] }> {
  const response = await apiClient.get<{ movements: MovementRow[] }>('/reports/summary', { params });
  return response.data;
}
