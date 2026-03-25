/**
 * Typed API functions for the RSP price monitoring backend.
 * Each function maps 1:1 to a backend endpoint.
 */

import * as api from "./apiClient";

// ── Types ─────────────────────────────────────────────────────────

export interface Company {
  id: number;
  name: string;
  slug: string;
  base_url: string | null;
  logo_url: string | null;
  is_active: boolean;
  price_selectors: string[] | null;
  title_selectors: string[] | null;
  availability_selectors: string[] | null;
  wait_for_selector: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  internal_name: string;
  internal_sku: string | null;
  barcode: string | null;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  notes: string | null;
  is_active: boolean;
  url_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ProductCompanyUrl {
  id: number;
  product_id: number;
  company_id: number;
  product_url: string;
  external_title: string | null;
  external_sku: string | null;
  external_barcode: string | null;
  selector_price: string | null;
  selector_title: string | null;
  selector_availability: string | null;
  currency: string;
  is_active: boolean;
  last_status: string | null;
  last_checked_at: string | null;
  image_url: string | null;
  internal_name: string;
  internal_sku: string | null;
  brand: string | null;
  category: string | null;
  company_name: string;
  company_slug: string;
  created_at: string;
  updated_at: string;
}

export interface PriceSnapshot {
  id: number;
  product_id: number;
  company_id: number;
  product_company_url_id: number | null;
  title_found: string | null;
  price: number | null;
  original_price: number | null;
  currency: string;
  availability: string;
  raw_price_text: string | null;
  raw_availability_text: string | null;
  scrape_status: "success" | "error" | "timeout" | "no_price";
  error_message: string | null;
  checked_at: string;
  created_at: string;
  internal_name: string;
  company_name: string;
  image_url: string | null;
  product_url: string | null;
}

export interface SyncRun {
  id: number;
  company_id: number | null;
  company_name: string | null;
  run_type: "single_url" | "company_batch" | "full_batch";
  status: "running" | "completed" | "failed" | "partial";
  triggered_by: string;
  started_at: string;
  finished_at: string | null;
  total_checked: number;
  success_count: number;
  fail_count: number;
  error_message: string | null;
  meta: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// ── Companies ─────────────────────────────────────────────────────

export const companiesApi = {
  list: (includeInactive = false) =>
    api.get<ApiResponse<Company[]>>("/api/companies", {
      include_inactive: includeInactive ? "true" : undefined,
    }),

  get: (id: number) =>
    api.get<ApiResponse<Company>>(`/api/companies/${id}`),

  create: (body: { name: string; slug: string; base_url?: string }) =>
    api.post<ApiResponse<Company>>("/api/companies", body),

  update: (id: number, body: Partial<Company>) =>
    api.put<ApiResponse<Company>>(`/api/companies/${id}`, body),

  delete: (id: number) =>
    api.del<{ success: boolean; message: string }>(`/api/companies/${id}`),

  upsertConfig: (id: number, body: { page_options?: Record<string, unknown>; notes?: string }) =>
    api.put<ApiResponse<unknown>>(`/api/companies/${id}/config`, body),
};

// ── Products ──────────────────────────────────────────────────────

export const productsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; is_active?: boolean }) =>
    api.get<PaginatedResponse<Product>>("/api/products", params as Record<string, string | number | boolean | undefined>),

  get: (id: number) =>
    api.get<ApiResponse<Product>>(`/api/products/${id}`),

  create: (body: {
    internal_name: string;
    internal_sku?: string;
    barcode?: string;
    brand?: string;
    category?: string;
  }) => api.post<ApiResponse<Product>>("/api/products", body),

  update: (id: number, body: Partial<Product>) =>
    api.put<ApiResponse<Product>>(`/api/products/${id}`, body),

  delete: (id: number) =>
    api.del<{ success: boolean; message: string }>(`/api/products/${id}`),

  import: (products: Array<{
    internal_name: string;
    internal_sku: string;
    barcode?: string;
    brand?: string;
    image_url?: string;
    is_active?: boolean;
  }>) => api.post<{ success: boolean; data: { inserted: number; updated: number; total: number } }>("/api/products/import", { products }),
};

// ── Product Company URLs ──────────────────────────────────────────

export const urlsApi = {
  list: (params?: {
    product_id?: number;
    company_id?: number;
    is_active?: boolean;
    page?: number;
    limit?: number;
  }) => api.get<PaginatedResponse<ProductCompanyUrl>>("/api/product-company-urls", params as Record<string, string | number | boolean | undefined>),

  get: (id: number) =>
    api.get<ApiResponse<ProductCompanyUrl>>(`/api/product-company-urls/${id}`),

  create: (body: {
    product_id: number;
    company_id: number;
    product_url: string;
    currency?: string;
    selector_price?: string;
    selector_title?: string;
    selector_availability?: string;
  }) => api.post<ApiResponse<ProductCompanyUrl>>("/api/product-company-urls", body),

  update: (id: number, body: Partial<ProductCompanyUrl>) =>
    api.put<ApiResponse<ProductCompanyUrl>>(`/api/product-company-urls/${id}`, body),

  delete: (id: number) =>
    api.del<{ success: boolean; message: string }>(`/api/product-company-urls/${id}`),
};

// ── Price Snapshots ───────────────────────────────────────────────

export const snapshotsApi = {
  list: (params?: {
    product_id?: number;
    company_id?: number;
    scrape_status?: string;
    page?: number;
    limit?: number;
  }) => api.get<PaginatedResponse<PriceSnapshot>>("/api/price-snapshots", params as Record<string, string | number | boolean | undefined>),

  latest: (params?: { product_id?: number; company_id?: number }) =>
    api.get<ApiResponse<PriceSnapshot[]>>("/api/price-snapshots/latest", params as Record<string, string | number | boolean | undefined>),

  history: (productId: number, companyId: number, days = 30) =>
    api.get<ApiResponse<PriceSnapshot[]>>("/api/price-snapshots/history", {
      product_id: productId,
      company_id: companyId,
      days,
    }),

  delete: (id: number) =>
    api.del<{ success: boolean; message: string }>(`/api/price-snapshots/${id}`),
};

// ── Sync Runs ─────────────────────────────────────────────────────

export const syncRunsApi = {
  list: (params?: { status?: string; run_type?: string; limit?: number }) =>
    api.get<ApiResponse<SyncRun[]>>("/api/sync-runs", params as Record<string, string | number | boolean | undefined>),

  get: (id: number) =>
    api.get<ApiResponse<SyncRun>>(`/api/sync-runs/${id}`),
};

// ── Scraper Actions ───────────────────────────────────────────────

export const scraperApi = {
  runOne: (urlId: number) =>
    api.post<ApiResponse<SyncRun>>("/api/scraper/run-one", { url_id: urlId }),

  runCompany: (companyId: number) =>
    api.post<{ success: boolean; message: string }>("/api/scraper/run-company", { company_id: companyId }),

  runAll: () =>
    api.post<{ success: boolean; message: string }>("/api/scraper/run-all"),
};

// ── Auto-Discover ─────────────────────────────────────────────────

export interface DiscoveryMatch {
  found: { name: string; url: string; imageUrl?: string | null };
  match: { product: Product; confidence: number } | null;
  method: 'ai' | 'fuzzy';
  already_tracked: boolean;
}

export interface DiscoveryResult {
  company: Company;
  results: DiscoveryMatch[];
  total_found: number;
  query: string;
}

export interface ProbeResult {
  success: boolean;
  search_url_template?: string;
  pattern?: string;
  products_found?: number;
  product_url_pattern?: string | null;
  sample?: Array<{ name: string; url: string }>;
  message?: string;
}

export const discoveryApi = {
  search: (companyId: number, query: string) =>
    api.post<ApiResponse<DiscoveryResult>>('/api/discovery/search', { company_id: companyId, query }),
  confirm: (companyId: number, mappings: Array<{ product_id: number; url: string; image_url?: string | null }>) =>
    api.post<ApiResponse<{ added: number }>>('/api/discovery/confirm', { company_id: companyId, mappings }),
  probe: (url: string, query?: string) =>
    api.post<ApiResponse<ProbeResult>>('/api/discovery/probe', { url, query }),
};
