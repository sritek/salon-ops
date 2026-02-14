/**
 * Inventory Module Types
 * Frontend type definitions for the inventory management module
 */

// ============================================
// Enums
// ============================================

export type ProductType = 'consumable' | 'retail' | 'both';

export type UnitOfMeasure = 'ml' | 'gm' | 'pieces' | 'bottles' | 'sachets' | 'tubes' | 'boxes';

export type POStatus = 'draft' | 'sent' | 'partially_received' | 'fully_received' | 'cancelled';

export type GRNStatus = 'draft' | 'confirmed';

export type QualityCheckStatus = 'accepted' | 'rejected' | 'partial';

export type TransferStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'in_transit'
  | 'received'
  | 'cancelled';

export type AuditStatus = 'in_progress' | 'completed' | 'posted';

export type AuditType = 'full' | 'partial' | 'category';

export type MovementType =
  | 'receipt'
  | 'consumption'
  | 'transfer_out'
  | 'transfer_in'
  | 'adjustment'
  | 'wastage'
  | 'sale';

export type ConsumptionReason = 'sample' | 'demo' | 'wastage' | 'damaged' | 'expired' | 'other';

export type AdjustmentType = 'increase' | 'decrease';

// ============================================
// Product Catalog Types
// ============================================

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  description?: string | null;
  expiryTrackingEnabled: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations
  parent?: ProductCategory | null;
  children?: ProductCategory[];
}

export interface Product {
  id: string;
  categoryId: string;
  categoryName?: string;
  sku?: string | null;
  barcode?: string | null;
  name: string;
  description?: string | null;
  productType: ProductType;
  unitOfMeasure: UnitOfMeasure;
  defaultPurchasePrice: number;
  defaultSellingPrice: number;
  taxRate: number;
  hsnCode?: string | null;
  expiryTrackingEnabled: boolean;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations
  category?: ProductCategory;
}

export interface BranchProductSettings {
  id: string;
  branchId: string;
  productId: string;
  isEnabled: boolean;
  reorderLevel?: number | null;
  sellingPriceOverride?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductWithSettings extends Product {
  branchSettings?: BranchProductSettings | null;
  effectiveSellingPrice?: number;
}

// ============================================
// Vendor Types
// ============================================

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  paymentTermsDays?: number | null;
  leadTimeDays?: number | null;
  lastPurchaseDate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorProductMapping {
  id: string;
  vendorId: string;
  productId: string;
  vendorSku?: string | null;
  lastPurchasePrice?: number | null;
  isPreferred: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations
  vendor?: Vendor;
  product?: Product;
}

// ============================================
// Purchase Order Types
// ============================================

export interface PurchaseOrder {
  id: string;
  branchId: string;
  poNumber: string;
  vendorId: string;
  status: POStatus;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
  notes?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  vendor?: Vendor;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  productName: string;
  productSku?: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  receivedQuantity: number;
  pendingQuantity: number;
  createdAt: string;
}

// ============================================
// Goods Receipt Types
// ============================================

export interface GoodsReceiptNote {
  id: string;
  branchId: string;
  grnNumber: string;
  purchaseOrderId?: string | null;
  vendorId: string;
  status: GRNStatus;
  receiptDate: string;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  notes?: string | null;
  confirmedAt?: string | null;
  confirmedBy?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  vendor?: Vendor;
  purchaseOrder?: PurchaseOrder | null;
  items?: GoodsReceiptItem[];
}

export interface GoodsReceiptItem {
  id: string;
  goodsReceiptId: string;
  productId: string;
  productName: string;
  purchaseOrderItemId?: string | null;
  receivedQuantity: number;
  focQuantity: number;
  unitCost: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  qualityCheckStatus: QualityCheckStatus;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason?: string | null;
  createdAt: string;
}

// ============================================
// Stock Types
// ============================================

export interface StockBatch {
  id: string;
  productId: string;
  batchNumber?: string | null;
  quantity: number;
  availableQuantity: number;
  unitCost: number;
  totalValue: number;
  receiptDate: string;
  expiryDate?: string | null;
  isExpired: boolean;
  isDepleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName?: string;
  batchId?: string | null;
  movementType: MovementType;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  reason?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdByName?: string;
  createdAt: string;
}

export interface StockSummary {
  productId: string;
  productName: string;
  productSku?: string | null;
  categoryName: string;
  unitOfMeasure: string;
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  averageCost: number;
  totalValue: number;
  reorderLevel?: number | null;
  isLowStock: boolean;
  hasNearExpiry: boolean;
  hasExpired: boolean;
}

// ============================================
// Transfer Types
// ============================================

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceBranchId: string;
  destinationBranchId: string;
  status: TransferStatus;
  requestDate: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  dispatchedAt?: string | null;
  dispatchedBy?: string | null;
  receivedAt?: string | null;
  receivedBy?: string | null;
  totalValue: number;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  sourceBranch?: { id: string; name: string };
  destinationBranch?: { id: string; name: string };
  items?: StockTransferItem[];
}

export interface StockTransferItem {
  id: string;
  transferId: string;
  productId: string;
  productName: string;
  requestedQuantity: number;
  dispatchedQuantity: number;
  receivedQuantity: number;
  discrepancy: number;
  unitCost: number;
  totalValue: number;
  createdAt: string;
}

// ============================================
// Audit Types
// ============================================

export interface StockAudit {
  id: string;
  branchId: string;
  auditNumber: string;
  auditType: AuditType;
  categoryId?: string | null;
  status: AuditStatus;
  startedAt: string;
  completedAt?: string | null;
  completedBy?: string | null;
  postedAt?: string | null;
  postedBy?: string | null;
  totalVarianceValue: number;
  totalShrinkageValue: number;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  category?: ProductCategory | null;
  items?: StockAuditItem[];
}

export interface StockAuditItem {
  id: string;
  auditId: string;
  productId: string;
  productName: string;
  systemQuantity: number;
  physicalCount?: number | null;
  variance: number;
  averageCost: number;
  varianceValue: number;
  notes?: string | null;
  countedAt?: string | null;
  countedBy?: string | null;
  createdAt: string;
}

// ============================================
// Service Consumable Types
// ============================================

export interface ServiceConsumableMapping {
  id: string;
  serviceId: string;
  productId: string;
  quantityPerService: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations
  product?: Product;
}

// ============================================
// Input Types - Product Catalog
// ============================================

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  parentId?: string | null;
  description?: string | null;
  expiryTrackingEnabled?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string | null;
  expiryTrackingEnabled?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CategoryFilters {
  parentId?: string | null;
  isActive?: boolean;
  search?: string;
}

export interface CreateProductInput {
  categoryId: string;
  sku?: string | null;
  barcode?: string | null;
  name: string;
  description?: string | null;
  productType: ProductType;
  unitOfMeasure: UnitOfMeasure;
  defaultPurchasePrice: number;
  defaultSellingPrice: number;
  taxRate?: number;
  hsnCode?: string | null;
  expiryTrackingEnabled?: boolean;
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface UpdateProductInput {
  categoryId?: string;
  sku?: string | null;
  barcode?: string | null;
  name?: string;
  description?: string | null;
  productType?: ProductType;
  unitOfMeasure?: UnitOfMeasure;
  defaultPurchasePrice?: number;
  defaultSellingPrice?: number;
  taxRate?: number;
  hsnCode?: string | null;
  expiryTrackingEnabled?: boolean;
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  categoryId?: string;
  productType?: ProductType;
  isActive?: boolean;
  search?: string;
  sortBy?: 'name' | 'sku' | 'createdAt' | 'defaultSellingPrice';
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateBranchSettingsInput {
  isEnabled?: boolean;
  reorderLevel?: number | null;
  sellingPriceOverride?: number | null;
}

// ============================================
// Input Types - Vendor
// ============================================

export interface CreateVendorInput {
  name: string;
  contactPerson: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  paymentTermsDays?: number | null;
  leadTimeDays?: number | null;
  isActive?: boolean;
}

export interface UpdateVendorInput {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  paymentTermsDays?: number | null;
  leadTimeDays?: number | null;
  isActive?: boolean;
}

export interface VendorFilters {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'lastPurchaseDate';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateVendorProductInput {
  vendorId: string;
  productId: string;
  vendorSku?: string | null;
  lastPurchasePrice?: number | null;
  isPreferred?: boolean;
}

export interface UpdateVendorProductInput {
  vendorSku?: string | null;
  lastPurchasePrice?: number | null;
  isPreferred?: boolean;
}

// ============================================
// Input Types - Purchase Order
// ============================================

export interface CreatePOInput {
  branchId: string;
  vendorId: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  items: CreatePOItemInput[];
}

export interface CreatePOItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface UpdatePOInput {
  vendorId?: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  items?: CreatePOItemInput[];
}

export interface POFilters {
  page?: number;
  limit?: number;
  status?: POStatus | POStatus[];
  vendorId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'poNumber' | 'orderDate' | 'grandTotal' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Input Types - Goods Receipt
// ============================================

export interface CreateGRNInput {
  branchId: string;
  purchaseOrderId?: string | null;
  vendorId: string;
  receiptDate?: string;
  notes?: string | null;
  items: CreateGRNItemInput[];
}

export interface CreateGRNItemInput {
  productId: string;
  purchaseOrderItemId?: string | null;
  receivedQuantity: number;
  focQuantity?: number;
  unitCost: number;
  taxRate?: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  qualityCheckStatus?: QualityCheckStatus;
  acceptedQuantity: number;
  rejectedQuantity?: number;
  rejectionReason?: string | null;
}

export interface UpdateGRNInput {
  receiptDate?: string;
  notes?: string | null;
  items?: CreateGRNItemInput[];
}

export interface GRNFilters {
  page?: number;
  limit?: number;
  status?: GRNStatus;
  vendorId?: string;
  purchaseOrderId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'grnNumber' | 'receiptDate' | 'grandTotal' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Input Types - Stock
// ============================================

export interface StockFilters {
  page?: number;
  limit?: number;
  categoryId?: string;
  productType?: ProductType;
  alertType?: 'low_stock' | 'near_expiry' | 'expired';
  search?: string;
  sortBy?: 'productName' | 'quantityOnHand' | 'totalValue';
  sortOrder?: 'asc' | 'desc';
}

export interface MovementFilters {
  page?: number;
  limit?: number;
  productId?: string;
  movementType?: MovementType | MovementType[];
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ConsumeStockInput {
  productId: string;
  quantity: number;
  reason: ConsumptionReason;
  description?: string | null;
}

export interface AdjustStockInput {
  productId: string;
  adjustmentType: AdjustmentType;
  quantity: number;
  reason: string;
}

// ============================================
// Input Types - Transfer
// ============================================

export interface CreateTransferInput {
  sourceBranchId: string;
  destinationBranchId: string;
  notes?: string | null;
  items: TransferItemInput[];
}

export interface TransferItemInput {
  productId: string;
  requestedQuantity: number;
}

export interface DispatchItemInput {
  productId: string;
  dispatchedQuantity: number;
}

export interface ReceiveItemInput {
  productId: string;
  receivedQuantity: number;
}

export interface TransferFilters {
  page?: number;
  limit?: number;
  type?: 'incoming' | 'outgoing';
  status?: TransferStatus | TransferStatus[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'transferNumber' | 'requestDate' | 'totalValue' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Input Types - Audit
// ============================================

export interface CreateAuditInput {
  branchId: string;
  auditType: AuditType;
  categoryId?: string | null;
  productIds?: string[];
  notes?: string | null;
}

export interface UpdateCountInput {
  physicalCount: number;
  notes?: string | null;
}

export interface AuditFilters {
  page?: number;
  limit?: number;
  status?: AuditStatus | AuditStatus[];
  auditType?: AuditType;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'auditNumber' | 'startedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Input Types - Service Consumable
// ============================================

export interface CreateMappingInput {
  serviceId: string;
  productId: string;
  quantityPerService: number;
  isActive?: boolean;
}

export interface UpdateMappingInput {
  quantityPerService?: number;
  isActive?: boolean;
}

// ============================================
// Response Types
// ============================================

export interface ReorderSuggestion {
  productId: string;
  productName: string;
  productSku?: string | null;
  currentStock: number;
  reorderLevel: number;
  suggestedQuantity: number;
  preferredVendorId?: string | null;
  preferredVendorName?: string | null;
  lastPurchasePrice?: number | null;
  hasPendingPO: boolean;
}

export interface StockAlert {
  type: 'low_stock' | 'near_expiry' | 'expired';
  productId: string;
  productName: string;
  productSku?: string | null;
  branchId: string;
  branchName?: string;
  currentQuantity?: number;
  reorderLevel?: number;
  batchId?: string;
  batchNumber?: string | null;
  expiryDate?: string | null;
  daysUntilExpiry?: number;
}

// ============================================
// Report Types
// ============================================

export interface StockValuationReport {
  productId: string;
  productName: string;
  productSku?: string | null;
  categoryName: string;
  unitOfMeasure: string;
  quantity: number;
  averageCost: number;
  totalValue: number;
}

export interface StockMovementReport {
  id: string;
  productId: string;
  productName: string;
  productSku?: string | null;
  movementType: MovementType;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  reason?: string | null;
  createdByName?: string;
  createdAt: string;
}

export interface PurchaseAnalysisReport {
  vendorId: string;
  vendorName: string;
  productId: string;
  productName: string;
  productSku?: string | null;
  totalQuantity: number;
  totalValue: number;
  averageUnitPrice: number;
  purchaseCount: number;
}

export interface ExpiryReport {
  batchId: string;
  productId: string;
  productName: string;
  productSku?: string | null;
  batchNumber?: string | null;
  quantity: number;
  availableQuantity: number;
  expiryDate: string;
  daysUntilExpiry: number;
  isExpired: boolean;
}

// ============================================
// UI Helper Types
// ============================================

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  consumable: 'Consumable',
  retail: 'Retail',
  both: 'Both',
};

export const UNIT_OF_MEASURE_LABELS: Record<UnitOfMeasure, string> = {
  ml: 'Milliliters (ml)',
  gm: 'Grams (gm)',
  pieces: 'Pieces',
  bottles: 'Bottles',
  sachets: 'Sachets',
  tubes: 'Tubes',
  boxes: 'Boxes',
};

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partially_received: 'Partially Received',
  fully_received: 'Fully Received',
  cancelled: 'Cancelled',
};

export const GRN_STATUS_LABELS: Record<GRNStatus, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
};

export const QUALITY_CHECK_STATUS_LABELS: Record<QualityCheckStatus, string> = {
  accepted: 'Accepted',
  rejected: 'Rejected',
  partial: 'Partial',
};

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  requested: 'Requested',
  approved: 'Approved',
  rejected: 'Rejected',
  in_transit: 'In Transit',
  received: 'Received',
  cancelled: 'Cancelled',
};

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  in_progress: 'In Progress',
  completed: 'Completed',
  posted: 'Posted',
};

export const AUDIT_TYPE_LABELS: Record<AuditType, string> = {
  full: 'Full Audit',
  partial: 'Partial Audit',
  category: 'Category Audit',
};

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  receipt: 'Receipt',
  consumption: 'Consumption',
  transfer_out: 'Transfer Out',
  transfer_in: 'Transfer In',
  adjustment: 'Adjustment',
  wastage: 'Wastage',
  sale: 'Sale',
};

export const CONSUMPTION_REASON_LABELS: Record<ConsumptionReason, string> = {
  sample: 'Sample',
  demo: 'Demo',
  wastage: 'Wastage',
  damaged: 'Damaged',
  expired: 'Expired',
  other: 'Other',
};

export const ADJUSTMENT_TYPE_LABELS: Record<AdjustmentType, string> = {
  increase: 'Increase',
  decrease: 'Decrease',
};
