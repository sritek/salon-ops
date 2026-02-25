/**
 * Inventory Module Types
 * Backend type definitions for the inventory management module
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
  | 'sale'
  | 'return_stock'
  | 'return'
  | 'audit';

export type ConsumptionReason = 'sample' | 'demo' | 'wastage' | 'damaged' | 'expired' | 'other';

export type AdjustmentType = 'increase' | 'decrease';

// ============================================
// Product Catalog Types
// ============================================

export interface ProductCategory {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  parentId?: string | null;
  description?: string | null;
  expiryTrackingEnabled: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  deletedAt?: Date | null;
}

export interface Product {
  id: string;
  tenantId: string;
  categoryId: string;
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
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  deletedAt?: Date | null;
}

export interface BranchProductSettings {
  id: string;
  tenantId: string;
  branchId: string;
  productId: string;
  isEnabled: boolean;
  reorderLevel?: number | null;
  sellingPriceOverride?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Vendor Types
// ============================================

export interface Vendor {
  id: string;
  tenantId: string;
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
  lastPurchaseDate?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  deletedAt?: Date | null;
}

export interface VendorProductMapping {
  id: string;
  tenantId: string;
  vendorId: string;
  productId: string;
  vendorSku?: string | null;
  lastPurchasePrice?: number | null;
  isPreferred: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Purchase Order Types
// ============================================

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  branchId: string;
  poNumber: string;
  vendorId: string;
  status: POStatus;
  orderDate: Date;
  expectedDeliveryDate?: Date | null;
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
  notes?: string | null;
  cancelledAt?: Date | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
}

export interface PurchaseOrderItem {
  id: string;
  tenantId: string;
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
  createdAt: Date;
}

// ============================================
// Goods Receipt Types
// ============================================

export interface GoodsReceiptNote {
  id: string;
  tenantId: string;
  branchId: string;
  grnNumber: string;
  purchaseOrderId?: string | null;
  vendorId: string;
  status: GRNStatus;
  receiptDate: Date;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  notes?: string | null;
  confirmedAt?: Date | null;
  confirmedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
}

export interface GoodsReceiptItem {
  id: string;
  tenantId: string;
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
  expiryDate?: Date | null;
  qualityCheckStatus: QualityCheckStatus;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason?: string | null;
  createdAt: Date;
}

// ============================================
// Stock Types
// ============================================

export interface StockBatch {
  id: string;
  tenantId: string;
  branchId: string;
  productId: string;
  batchNumber?: string | null;
  quantity: number;
  availableQuantity: number;
  unitCost: number;
  totalValue: number;
  receiptDate: Date;
  expiryDate?: Date | null;
  isExpired: boolean;
  isDepleted: boolean;
  goodsReceiptItemId?: string | null;
  transferItemId?: string | null;
  adjustmentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovement {
  id: string;
  tenantId: string;
  branchId: string;
  productId: string;
  batchId?: string | null;
  movementType: MovementType;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  reason?: string | null;
  notes?: string | null;
  createdAt: Date;
  createdBy?: string | null;
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
  tenantId: string;
  transferNumber: string;
  sourceBranchId: string;
  destinationBranchId: string;
  status: TransferStatus;
  requestDate: Date;
  approvedAt?: Date | null;
  approvedBy?: string | null;
  rejectedAt?: Date | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  dispatchedAt?: Date | null;
  dispatchedBy?: string | null;
  receivedAt?: Date | null;
  receivedBy?: string | null;
  totalValue: number;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
}

export interface StockTransferItem {
  id: string;
  tenantId: string;
  transferId: string;
  productId: string;
  productName: string;
  requestedQuantity: number;
  dispatchedQuantity: number;
  receivedQuantity: number;
  discrepancy: number;
  unitCost: number;
  totalValue: number;
  createdAt: Date;
}

// ============================================
// Audit Types
// ============================================

export interface StockAudit {
  id: string;
  tenantId: string;
  branchId: string;
  auditNumber: string;
  auditType: AuditType;
  categoryId?: string | null;
  status: AuditStatus;
  startedAt: Date;
  completedAt?: Date | null;
  completedBy?: string | null;
  postedAt?: Date | null;
  postedBy?: string | null;
  totalVarianceValue: number;
  totalShrinkageValue: number;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
}

export interface StockAuditItem {
  id: string;
  tenantId: string;
  auditId: string;
  productId: string;
  productName: string;
  systemQuantity: number;
  physicalCount?: number | null;
  variance: number;
  averageCost: number;
  varianceValue: number;
  notes?: string | null;
  countedAt?: Date | null;
  countedBy?: string | null;
  createdAt: Date;
}

// ============================================
// Service Consumable Types
// ============================================

export interface ServiceConsumableMapping {
  id: string;
  tenantId: string;
  serviceId: string;
  productId: string;
  quantityPerService: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  sortBy?: 'productName' | 'quantityOnHand' | 'totalValue' | 'availableQuantity' | 'averageCost';
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

export interface FIFOConsumptionResult {
  success: boolean;
  consumedBatches: Array<{
    batchId: string;
    quantity: number;
    unitCost: number;
  }>;
  totalConsumed: number;
  shortfall: number;
  movements: StockMovement[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    productId: string;
    productName: string;
    requestedQuantity: number;
    availableQuantity: number;
  }>;
}

// ============================================
// Extended Types with Relations
// ============================================

export interface ProductCategoryWithChildren extends ProductCategory {
  parent?: ProductCategory | null;
  children?: ProductCategory[];
}

export interface ProductWithCategory extends Product {
  category?: ProductCategory;
}

export interface ProductWithSettings extends Product {
  category?: ProductCategory;
  branchSettings?: BranchProductSettings | null;
  effectiveSellingPrice?: number;
}

export interface VendorWithProducts extends Vendor {
  productMappings?: VendorProductMapping[];
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
  vendor?: Vendor;
  items: PurchaseOrderItem[];
}

export interface GoodsReceiptNoteWithItems extends GoodsReceiptNote {
  vendor?: Vendor;
  purchaseOrder?: PurchaseOrder | null;
  items: GoodsReceiptItem[];
}

export interface StockTransferWithItems extends StockTransfer {
  items: StockTransferItem[];
  sourceBranch?: { id: string; name: string };
  destinationBranch?: { id: string; name: string };
}

export interface StockAuditWithItems extends StockAudit {
  items: StockAuditItem[];
  category?: ProductCategory | null;
}

export interface StockMovementWithDetails extends StockMovement {
  product?: { id: string; name: string; sku?: string | null };
  batch?: StockBatch | null;
  createdByUser?: { id: string; name: string } | null;
}

export interface ServiceConsumableMappingWithProduct extends ServiceConsumableMapping {
  product?: Product;
}
