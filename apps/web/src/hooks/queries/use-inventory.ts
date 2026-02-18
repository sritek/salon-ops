/**
 * Inventory Hooks
 * React Query hooks for inventory management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type {
  Product,
  ProductCategory,
  ProductFilters,
  CategoryFilters,
  CreateProductInput,
  UpdateProductInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  BranchProductSettings,
  UpdateBranchSettingsInput,
  Vendor,
  VendorFilters,
  CreateVendorInput,
  UpdateVendorInput,
  VendorProductMapping,
  CreateVendorProductInput,
  UpdateVendorProductInput,
} from '@/types/inventory';

// ============================================
// Query Keys
// ============================================

export const inventoryKeys = {
  all: ['inventory'] as const,
  // Categories
  categories: () => [...inventoryKeys.all, 'categories'] as const,
  categoryList: (filters: CategoryFilters) =>
    [...inventoryKeys.categories(), 'list', filters] as const,
  categoryDetail: (id: string) => [...inventoryKeys.categories(), 'detail', id] as const,
  // Products
  products: () => [...inventoryKeys.all, 'products'] as const,
  productList: (filters: ProductFilters) => [...inventoryKeys.products(), 'list', filters] as const,
  productDetail: (id: string) => [...inventoryKeys.products(), 'detail', id] as const,
  // Branch Settings
  branchSettings: (branchId: string, productId: string) =>
    [...inventoryKeys.products(), 'branchSettings', branchId, productId] as const,
  // Vendors
  vendors: () => [...inventoryKeys.all, 'vendors'] as const,
  vendorList: (filters: VendorFilters) => [...inventoryKeys.vendors(), 'list', filters] as const,
  vendorDetail: (id: string) => [...inventoryKeys.vendors(), 'detail', id] as const,
  vendorProducts: (vendorId: string) => [...inventoryKeys.vendors(), vendorId, 'products'] as const,
  productVendors: (productId: string) =>
    [...inventoryKeys.products(), productId, 'vendors'] as const,
};

// ============================================
// Category Hooks
// ============================================

/**
 * Get product categories
 */
export function useProductCategories(filters: CategoryFilters = {}) {
  return useQuery({
    queryKey: inventoryKeys.categoryList(filters),
    queryFn: () =>
      api.get<ProductCategory[]>('/inventory/categories', {
        parentId: filters.parentId,
        isActive: filters.isActive,
        search: filters.search,
      }),
  });
}

/**
 * Get single category by ID
 */
export function useProductCategory(id: string) {
  return useQuery({
    queryKey: inventoryKeys.categoryDetail(id),
    queryFn: () => api.get<ProductCategory>(`/inventory/categories/${id}`),
    enabled: !!id,
  });
}

/**
 * Create a new product category
 */
export function useCreateProductCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryInput) =>
      api.post<ProductCategory>('/inventory/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories() });
    },
  });
}

/**
 * Update a product category
 */
export function useUpdateProductCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryInput }) =>
      api.patch<ProductCategory>(`/inventory/categories/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categoryDetail(id) });
    },
  });
}

/**
 * Delete a product category
 */
export function useDeleteProductCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/inventory/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories() });
    },
  });
}

// ============================================
// Product Hooks
// ============================================

/**
 * Get products with pagination
 */
export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: inventoryKeys.productList(filters),
    queryFn: () =>
      api.getPaginated<Product>('/inventory/products', {
        page: filters.page,
        limit: filters.limit,
        categoryId: filters.categoryId,
        productType: filters.productType,
        isActive: filters.isActive,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
  });
}

/**
 * Get single product by ID
 */
export function useProduct(id: string) {
  return useQuery({
    queryKey: inventoryKeys.productDetail(id),
    queryFn: () => api.get<Product>(`/inventory/products/${id}`),
    enabled: !!id,
  });
}

/**
 * Create a new product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductInput) => api.post<Product>('/inventory/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
    },
  });
}

/**
 * Update a product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductInput }) =>
      api.patch<Product>(`/inventory/products/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.productDetail(id) });
    },
  });
}

/**
 * Delete a product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/inventory/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
    },
  });
}

// ============================================
// Branch Product Settings Hooks
// ============================================

/**
 * Get branch product settings
 */
export function useBranchProductSettings(branchId: string, productId: string) {
  return useQuery({
    queryKey: inventoryKeys.branchSettings(branchId, productId),
    queryFn: () =>
      api.get<BranchProductSettings>(
        `/inventory/products/${productId}/branch-settings/${branchId}`
      ),
    enabled: !!branchId && !!productId,
  });
}

/**
 * Update branch product settings
 */
export function useUpdateBranchProductSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      branchId,
      productId,
      data,
    }: {
      branchId: string;
      productId: string;
      data: UpdateBranchSettingsInput;
    }) =>
      api.patch<BranchProductSettings>(
        `/inventory/products/${productId}/branch-settings/${branchId}`,
        data
      ),
    onSuccess: (_, { branchId, productId }) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.branchSettings(branchId, productId),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.productDetail(productId) });
    },
  });
}

// ============================================
// Vendor Hooks
// ============================================

/**
 * Get vendors with pagination
 */
export function useVendors(filters: VendorFilters = {}) {
  return useQuery({
    queryKey: inventoryKeys.vendorList(filters),
    queryFn: () =>
      api.getPaginated<Vendor>('/inventory/vendors', {
        page: filters.page,
        limit: filters.limit,
        isActive: filters.isActive,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
  });
}

/**
 * Get single vendor by ID
 */
export function useVendor(id: string) {
  return useQuery({
    queryKey: inventoryKeys.vendorDetail(id),
    queryFn: () => api.get<Vendor>(`/inventory/vendors/${id}`),
    enabled: !!id,
  });
}

/**
 * Create a new vendor
 */
export function useCreateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVendorInput) => api.post<Vendor>('/inventory/vendors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.vendors() });
    },
  });
}

/**
 * Update a vendor
 */
export function useUpdateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVendorInput }) =>
      api.patch<Vendor>(`/inventory/vendors/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.vendors() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.vendorDetail(id) });
    },
  });
}

/**
 * Delete a vendor
 */
export function useDeleteVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/inventory/vendors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.vendors() });
    },
  });
}

// ============================================
// Vendor-Product Mapping Hooks
// ============================================

/**
 * Get products for a vendor
 */
export function useVendorProducts(vendorId: string) {
  return useQuery({
    queryKey: inventoryKeys.vendorProducts(vendorId),
    queryFn: () => api.get<VendorProductMapping[]>(`/inventory/vendors/${vendorId}/products`),
    enabled: !!vendorId,
  });
}

/**
 * Get vendors for a product
 */
export function useProductVendors(productId: string) {
  return useQuery({
    queryKey: inventoryKeys.productVendors(productId),
    queryFn: () => api.get<VendorProductMapping[]>(`/inventory/products/${productId}/vendors`),
    enabled: !!productId,
  });
}

/**
 * Map a product to a vendor
 */
export function useCreateVendorProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVendorProductInput) =>
      api.post<VendorProductMapping>(`/inventory/vendors/${data.vendorId}/products`, data),
    onSuccess: (_, { vendorId, productId }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.vendorProducts(vendorId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.productVendors(productId) });
    },
  });
}

/**
 * Update vendor-product mapping
 */
export function useUpdateVendorProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      vendorId,
      productId,
      data,
    }: {
      vendorId: string;
      productId: string;
      data: UpdateVendorProductInput;
    }) =>
      api.patch<VendorProductMapping>(`/inventory/vendors/${vendorId}/products/${productId}`, data),
    onSuccess: (_, { vendorId, productId }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.vendorProducts(vendorId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.productVendors(productId) });
    },
  });
}

/**
 * Remove vendor-product mapping
 */
export function useDeleteVendorProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vendorId, productId }: { vendorId: string; productId: string }) =>
      api.delete<{ message: string }>(`/inventory/vendors/${vendorId}/products/${productId}`),
    onSuccess: (_, { vendorId, productId }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.vendorProducts(vendorId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.productVendors(productId) });
    },
  });
}

// ============================================
// Purchase Order Types Import
// ============================================

import type {
  PurchaseOrder,
  POFilters,
  CreatePOInput,
  UpdatePOInput,
  ReorderSuggestion,
} from '@/types/inventory';

// Add PO keys to inventoryKeys
export const purchaseOrderKeys = {
  all: ['purchaseOrders'] as const,
  lists: () => [...purchaseOrderKeys.all, 'list'] as const,
  list: (filters: POFilters) => [...purchaseOrderKeys.lists(), filters] as const,
  details: () => [...purchaseOrderKeys.all, 'detail'] as const,
  detail: (id: string) => [...purchaseOrderKeys.details(), id] as const,
  reorderSuggestions: (branchId: string) =>
    [...purchaseOrderKeys.all, 'reorder', branchId] as const,
};

// ============================================
// Purchase Order Hooks
// ============================================

/**
 * Get purchase orders with pagination
 */
export function usePurchaseOrders(branchId: string, filters: POFilters = {}) {
  return useQuery({
    queryKey: purchaseOrderKeys.list({ ...filters, branchId } as POFilters & { branchId: string }),
    queryFn: () =>
      api.getPaginated<PurchaseOrder>(`/inventory/branches/${branchId}/purchase-orders`, {
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
        vendorId: filters.vendorId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
    enabled: !!branchId,
  });
}

/**
 * Get single purchase order by ID
 */
export function usePurchaseOrder(branchId: string, id: string) {
  return useQuery({
    queryKey: purchaseOrderKeys.detail(id),
    queryFn: () => api.get<PurchaseOrder>(`/inventory/branches/${branchId}/purchase-orders/${id}`),
    enabled: !!branchId && !!id,
  });
}

/**
 * Create a new purchase order
 */
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ branchId, data }: { branchId: string; data: Omit<CreatePOInput, 'branchId'> }) =>
      api.post<PurchaseOrder>(`/inventory/branches/${branchId}/purchase-orders`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
    },
  });
}

/**
 * Update a purchase order
 */
export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ branchId, id, data }: { branchId: string; id: string; data: UpdatePOInput }) =>
      api.patch<PurchaseOrder>(`/inventory/branches/${branchId}/purchase-orders/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.detail(id) });
    },
  });
}

/**
 * Send a purchase order (draft → sent)
 */
export function useSendPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ branchId, id }: { branchId: string; id: string }) =>
      api.post<PurchaseOrder>(`/inventory/branches/${branchId}/purchase-orders/${id}/send`),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.detail(id) });
    },
  });
}

/**
 * Cancel a purchase order
 */
export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ branchId, id, reason }: { branchId: string; id: string; reason: string }) =>
      api.post<PurchaseOrder>(`/inventory/branches/${branchId}/purchase-orders/${id}/cancel`, {
        reason,
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.detail(id) });
    },
  });
}

/**
 * Get reorder suggestions for a branch
 */
export function useReorderSuggestions(branchId: string) {
  return useQuery({
    queryKey: purchaseOrderKeys.reorderSuggestions(branchId),
    queryFn: () =>
      api.get<ReorderSuggestion[]>(`/inventory/branches/${branchId}/reorder-suggestions`),
    enabled: !!branchId,
  });
}

// ============================================
// Goods Receipt Types Import
// ============================================

import type {
  GoodsReceiptNote,
  GRNFilters,
  CreateGRNInput,
  UpdateGRNInput,
} from '@/types/inventory';

// GRN Query Keys
export const goodsReceiptKeys = {
  all: ['goodsReceipts'] as const,
  lists: () => [...goodsReceiptKeys.all, 'list'] as const,
  list: (filters: GRNFilters & { branchId: string }) =>
    [...goodsReceiptKeys.lists(), filters] as const,
  details: () => [...goodsReceiptKeys.all, 'detail'] as const,
  detail: (id: string) => [...goodsReceiptKeys.details(), id] as const,
};

// ============================================
// Goods Receipt Hooks
// ============================================

/**
 * Get goods receipts with pagination
 */
export function useGoodsReceipts(branchId: string, filters: GRNFilters = {}) {
  return useQuery({
    queryKey: goodsReceiptKeys.list({ ...filters, branchId }),
    queryFn: () =>
      api.getPaginated<GoodsReceiptNote>(`/inventory/branches/${branchId}/goods-receipts`, {
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
        vendorId: filters.vendorId,
        purchaseOrderId: filters.purchaseOrderId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
    enabled: !!branchId,
  });
}

/**
 * Get single goods receipt by ID
 */
export function useGoodsReceipt(branchId: string, id: string) {
  return useQuery({
    queryKey: goodsReceiptKeys.detail(id),
    queryFn: () =>
      api.get<GoodsReceiptNote>(`/inventory/branches/${branchId}/goods-receipts/${id}`),
    enabled: !!branchId && !!id,
  });
}

/**
 * Create a new goods receipt
 */
export function useCreateGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      branchId,
      data,
    }: {
      branchId: string;
      data: Omit<CreateGRNInput, 'branchId'>;
    }) => api.post<GoodsReceiptNote>(`/inventory/branches/${branchId}/goods-receipts`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
    },
  });
}

/**
 * Update a goods receipt
 */
export function useUpdateGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ branchId, id, data }: { branchId: string; id: string; data: UpdateGRNInput }) =>
      api.patch<GoodsReceiptNote>(`/inventory/branches/${branchId}/goods-receipts/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.detail(id) });
    },
  });
}

/**
 * Confirm a goods receipt (creates stock batches)
 */
export function useConfirmGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ branchId, id }: { branchId: string; id: string }) =>
      api.post<GoodsReceiptNote>(`/inventory/branches/${branchId}/goods-receipts/${id}/confirm`),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
    },
  });
}

// ============================================
// Stock Types Import
// ============================================

import type {
  StockSummary,
  StockBatch,
  StockMovement,
  StockAlert,
  StockFilters,
  MovementFilters,
  ConsumeStockInput,
  AdjustStockInput,
} from '@/types/inventory';

// Stock Query Keys
export const stockKeys = {
  all: ['stock'] as const,
  summary: (branchId: string, filters?: StockFilters) =>
    [...stockKeys.all, 'summary', branchId, filters] as const,
  batches: (branchId: string, productId: string) =>
    [...stockKeys.all, 'batches', branchId, productId] as const,
  movements: (branchId: string, filters?: MovementFilters) =>
    [...stockKeys.all, 'movements', branchId, filters] as const,
  alerts: (branchId: string) => [...stockKeys.all, 'alerts', branchId] as const,
};

// ============================================
// Stock Hooks
// ============================================

/**
 * Get stock summary with pagination
 */
export function useStockSummary(branchId: string, filters: StockFilters = {}) {
  return useQuery({
    queryKey: stockKeys.summary(branchId, filters),
    queryFn: () =>
      api.getPaginated<StockSummary>(`/inventory/branches/${branchId}/stock`, {
        page: filters.page,
        limit: filters.limit,
        categoryId: filters.categoryId,
        productType: filters.productType,
        alertType: filters.alertType,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
    enabled: !!branchId,
  });
}

/**
 * Get stock batches for a product
 */
export function useStockBatches(branchId: string, productId: string) {
  return useQuery({
    queryKey: stockKeys.batches(branchId, productId),
    queryFn: () =>
      api.get<StockBatch[]>(`/inventory/branches/${branchId}/stock/${productId}/batches`),
    enabled: !!branchId && !!productId,
  });
}

/**
 * Get stock movements with pagination
 */
export function useStockMovements(branchId: string, filters: MovementFilters = {}) {
  return useQuery({
    queryKey: stockKeys.movements(branchId, filters),
    queryFn: () =>
      api.getPaginated<StockMovement>(`/inventory/branches/${branchId}/stock/movements`, {
        page: filters.page,
        limit: filters.limit,
        productId: filters.productId,
        movementType: filters.movementType,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
    enabled: !!branchId,
  });
}

/**
 * Get stock alerts
 */
export function useStockAlerts(branchId: string) {
  return useQuery({
    queryKey: stockKeys.alerts(branchId),
    queryFn: () => api.get<StockAlert[]>(`/inventory/branches/${branchId}/stock/alerts`),
    enabled: !!branchId,
  });
}

/**
 * Consume stock manually
 */
export function useConsumeStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ branchId, data }: { branchId: string; data: ConsumeStockInput }) =>
      api.post<{ message: string }>(`/inventory/branches/${branchId}/stock/consume`, data),
    onSuccess: (_, { branchId }) => {
      queryClient.invalidateQueries({ queryKey: stockKeys.summary(branchId) });
      queryClient.invalidateQueries({ queryKey: stockKeys.movements(branchId) });
      queryClient.invalidateQueries({ queryKey: stockKeys.alerts(branchId) });
    },
  });
}

/**
 * Adjust stock
 */
export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ branchId, data }: { branchId: string; data: AdjustStockInput }) =>
      api.post<{ message: string }>(`/inventory/branches/${branchId}/stock/adjust`, data),
    onSuccess: (_, { branchId }) => {
      queryClient.invalidateQueries({ queryKey: stockKeys.summary(branchId) });
      queryClient.invalidateQueries({ queryKey: stockKeys.movements(branchId) });
      queryClient.invalidateQueries({ queryKey: stockKeys.alerts(branchId) });
    },
  });
}

// ============================================
// Transfer Types Import
// ============================================

import type {
  StockTransfer,
  TransferFilters,
  CreateTransferInput,
  DispatchItemInput,
  ReceiveItemInput,
} from '@/types/inventory';

// Transfer Query Keys
export const transferKeys = {
  all: ['transfers'] as const,
  lists: () => [...transferKeys.all, 'list'] as const,
  list: (branchId: string, filters: TransferFilters) =>
    [...transferKeys.lists(), branchId, filters] as const,
  details: () => [...transferKeys.all, 'detail'] as const,
  detail: (id: string) => [...transferKeys.details(), id] as const,
};

// ============================================
// Transfer Hooks
// ============================================

/**
 * Get transfers with pagination (incoming and outgoing)
 */
export function useTransfers(branchId: string, filters: TransferFilters = {}) {
  return useQuery({
    queryKey: transferKeys.list(branchId, filters),
    queryFn: () =>
      api.getPaginated<StockTransfer>(`/inventory/branches/${branchId}/transfers`, {
        page: filters.page,
        limit: filters.limit,
        type: filters.type,
        status: filters.status,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
    enabled: !!branchId,
  });
}

/**
 * Get single transfer by ID
 */
export function useTransfer(branchId: string, id: string) {
  return useQuery({
    queryKey: transferKeys.detail(id),
    queryFn: () => api.get<StockTransfer>(`/inventory/branches/${branchId}/transfers/${id}`),
    enabled: !!branchId && !!id,
  });
}

/**
 * Create a new transfer request
 */
export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      branchId,
      data,
    }: {
      branchId: string;
      data: Omit<CreateTransferInput, 'sourceBranchId'>;
    }) => api.post<StockTransfer>(`/inventory/branches/${branchId}/transfers`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
    },
  });
}

/**
 * Approve a transfer request
 */
export function useApproveTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ branchId, id }: { branchId: string; id: string }) =>
      api.post<StockTransfer>(`/inventory/branches/${branchId}/transfers/${id}/approve`),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transferKeys.detail(id) });
    },
  });
}

/**
 * Reject a transfer request
 */
export function useRejectTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ branchId, id, reason }: { branchId: string; id: string; reason: string }) =>
      api.post<StockTransfer>(`/inventory/branches/${branchId}/transfers/${id}/reject`, { reason }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transferKeys.detail(id) });
    },
  });
}

/**
 * Dispatch a transfer (deduct stock from source)
 */
export function useDispatchTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      branchId,
      id,
      items,
    }: {
      branchId: string;
      id: string;
      items: DispatchItemInput[];
    }) =>
      api.post<StockTransfer>(`/inventory/branches/${branchId}/transfers/${id}/dispatch`, {
        items,
      }),
    onSuccess: (_, { branchId, id }) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transferKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: stockKeys.summary(branchId) });
      queryClient.invalidateQueries({ queryKey: stockKeys.movements(branchId) });
    },
  });
}

/**
 * Receive a transfer (add stock to destination)
 */
export function useReceiveTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      branchId,
      id,
      items,
    }: {
      branchId: string;
      id: string;
      items: ReceiveItemInput[];
    }) =>
      api.post<StockTransfer>(`/inventory/branches/${branchId}/transfers/${id}/receive`, {
        items,
      }),
    onSuccess: (_, { branchId, id }) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transferKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: stockKeys.summary(branchId) });
      queryClient.invalidateQueries({ queryKey: stockKeys.movements(branchId) });
    },
  });
}

// ============================================
// Audit Types Import
// ============================================

import type {
  StockAudit,
  AuditFilters,
  CreateAuditInput,
  UpdateCountInput,
} from '@/types/inventory';

// Audit Query Keys
export const auditKeys = {
  all: ['audits'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (branchId: string, filters: AuditFilters) =>
    [...auditKeys.lists(), branchId, filters] as const,
  details: () => [...auditKeys.all, 'detail'] as const,
  detail: (id: string) => [...auditKeys.details(), id] as const,
};

// ============================================
// Audit Hooks
// ============================================

/**
 * Get audits with pagination
 */
export function useAudits(branchId: string, filters: AuditFilters = {}) {
  return useQuery({
    queryKey: auditKeys.list(branchId, filters),
    queryFn: () =>
      api.getPaginated<StockAudit>(`/inventory/branches/${branchId}/audits`, {
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
        auditType: filters.auditType,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
    enabled: !!branchId,
  });
}

/**
 * Get single audit by ID
 */
export function useAudit(branchId: string, id: string) {
  return useQuery({
    queryKey: auditKeys.detail(id),
    queryFn: () => api.get<StockAudit>(`/inventory/branches/${branchId}/audits/${id}`),
    enabled: !!branchId && !!id,
  });
}

/**
 * Create a new audit
 */
export function useCreateAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      branchId,
      data,
    }: {
      branchId: string;
      data: Omit<CreateAuditInput, 'branchId'>;
    }) => api.post<StockAudit>(`/inventory/branches/${branchId}/audits`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auditKeys.lists() });
    },
  });
}

/**
 * Update audit item count
 */
export function useUpdateAuditCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      branchId,
      auditId,
      itemId,
      data,
    }: {
      branchId: string;
      auditId: string;
      itemId: string;
      data: UpdateCountInput;
    }) =>
      api.patch<StockAudit>(
        `/inventory/branches/${branchId}/audits/${auditId}/items/${itemId}`,
        data
      ),
    onSuccess: (_, { auditId }) => {
      queryClient.invalidateQueries({ queryKey: auditKeys.detail(auditId) });
    },
  });
}

/**
 * Complete an audit
 */
export function useCompleteAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ branchId, id }: { branchId: string; id: string }) =>
      api.post<StockAudit>(`/inventory/branches/${branchId}/audits/${id}/complete`),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: auditKeys.lists() });
      queryClient.invalidateQueries({ queryKey: auditKeys.detail(id) });
    },
  });
}

/**
 * Post audit adjustments
 */
export function usePostAuditAdjustments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ branchId, id }: { branchId: string; id: string }) =>
      api.post<StockAudit>(`/inventory/branches/${branchId}/audits/${id}/post`),
    onSuccess: (_, { branchId, id }) => {
      queryClient.invalidateQueries({ queryKey: auditKeys.lists() });
      queryClient.invalidateQueries({ queryKey: auditKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: stockKeys.summary(branchId) });
      queryClient.invalidateQueries({ queryKey: stockKeys.movements(branchId) });
    },
  });
}

// ============================================
// Service Consumable Types Import
// ============================================

import type {
  ServiceConsumableMapping,
  CreateMappingInput,
  UpdateMappingInput,
} from '@/types/inventory';

// Service Consumable Query Keys
export const serviceConsumableKeys = {
  all: ['serviceConsumables'] as const,
  forService: (serviceId: string) => [...serviceConsumableKeys.all, 'service', serviceId] as const,
  forProduct: (productId: string) => [...serviceConsumableKeys.all, 'product', productId] as const,
};

// ============================================
// Service Consumable Hooks
// ============================================

/**
 * Get consumables for a service
 */
export function useServiceConsumables(serviceId: string) {
  return useQuery({
    queryKey: serviceConsumableKeys.forService(serviceId),
    queryFn: () =>
      api.get<ServiceConsumableMapping[]>(`/inventory/services/${serviceId}/consumables`),
    enabled: !!serviceId,
  });
}

/**
 * Get services using a product
 */
export function useProductServices(productId: string) {
  return useQuery({
    queryKey: serviceConsumableKeys.forProduct(productId),
    queryFn: () => api.get<ServiceConsumableMapping[]>(`/inventory/products/${productId}/services`),
    enabled: !!productId,
  });
}

/**
 * Create a service consumable mapping
 */
export function useCreateServiceConsumable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMappingInput) =>
      api.post<ServiceConsumableMapping>(`/inventory/services/${data.serviceId}/consumables`, data),
    onSuccess: (_, { serviceId, productId }) => {
      queryClient.invalidateQueries({
        queryKey: serviceConsumableKeys.forService(serviceId),
      });
      queryClient.invalidateQueries({
        queryKey: serviceConsumableKeys.forProduct(productId),
      });
    },
  });
}

/**
 * Update a service consumable mapping
 */
export function useUpdateServiceConsumable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceId,
      productId,
      data,
    }: {
      serviceId: string;
      productId: string;
      data: UpdateMappingInput;
    }) =>
      api.patch<ServiceConsumableMapping>(
        `/inventory/services/${serviceId}/consumables/${productId}`,
        data
      ),
    onSuccess: (_, { serviceId, productId }) => {
      queryClient.invalidateQueries({
        queryKey: serviceConsumableKeys.forService(serviceId),
      });
      queryClient.invalidateQueries({
        queryKey: serviceConsumableKeys.forProduct(productId),
      });
    },
  });
}

/**
 * Delete a service consumable mapping
 */
export function useDeleteServiceConsumable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serviceId, productId }: { serviceId: string; productId: string }) =>
      api.delete<{ message: string }>(`/inventory/services/${serviceId}/consumables/${productId}`),
    onSuccess: (_, { serviceId, productId }) => {
      queryClient.invalidateQueries({
        queryKey: serviceConsumableKeys.forService(serviceId),
      });
      queryClient.invalidateQueries({
        queryKey: serviceConsumableKeys.forProduct(productId),
      });
    },
  });
}

// ============================================
// Products for Billing Hook
// Requirements: 4.2, 4.3, 5.1
// ============================================

/**
 * Product with stock information for billing context
 */
export interface ProductForBilling {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  sellingPrice: number;
  taxRate: number;
  hsnCode: string | null;
  availableStock: number;
  isLowStock: boolean;
  reorderLevel: number | null;
}

// Query key for products for billing
export const productsForBillingKeys = {
  all: ['productsForBilling'] as const,
  list: (branchId: string, search?: string) =>
    [...productsForBillingKeys.all, branchId, search] as const,
};

/**
 * Get products with stock availability for billing
 * Combines product data with stock summary for the billing context
 * Requirements: 4.2, 4.3, 5.1
 */
export function useProductsForBilling(branchId: string, search?: string) {
  return useQuery({
    queryKey: productsForBillingKeys.list(branchId, search),
    queryFn: async () => {
      // Fetch products (retail or both types only)
      const productsResponse = await api.getPaginated<Product>('/inventory/products', {
        productType: 'retail',
        isActive: true,
        search,
        limit: 50,
      });

      // Also fetch 'both' type products
      const bothProductsResponse = await api.getPaginated<Product>('/inventory/products', {
        productType: 'both',
        isActive: true,
        search,
        limit: 50,
      });

      // Combine products
      const allProducts = [...productsResponse.data, ...bothProductsResponse.data];

      if (allProducts.length === 0) {
        return [] as ProductForBilling[];
      }

      // Fetch stock summary for the branch
      const stockResponse = await api.getPaginated<StockSummary>(
        `/inventory/branches/${branchId}/stock`,
        {
          limit: 100,
        }
      );

      // Create a map of product stock
      const stockMap = new Map<
        string,
        { availableQuantity: number; isLowStock: boolean; reorderLevel: number | null }
      >();
      for (const stock of stockResponse.data) {
        stockMap.set(stock.productId, {
          availableQuantity: stock.availableQuantity,
          isLowStock: stock.isLowStock,
          reorderLevel: stock.reorderLevel ?? null,
        });
      }

      // Merge products with stock data
      const productsForBilling: ProductForBilling[] = allProducts.map((product) => {
        const stockInfo = stockMap.get(product.id);
        return {
          id: product.id,
          name: product.name,
          sku: product.sku || null,
          barcode: product.barcode || null,
          sellingPrice: product.defaultSellingPrice,
          taxRate: product.taxRate,
          hsnCode: product.hsnCode || null,
          availableStock: stockInfo?.availableQuantity ?? 0,
          isLowStock: stockInfo?.isLowStock ?? false,
          reorderLevel: stockInfo?.reorderLevel !== undefined ? stockInfo.reorderLevel : null,
        };
      });

      return productsForBilling;
    },
    enabled: !!branchId,
    staleTime: 30000, // 30 seconds - stock data can change frequently
  });
}
