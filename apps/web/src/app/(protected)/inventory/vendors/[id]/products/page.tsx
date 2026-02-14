'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Package, Pencil, Plus, Star, Trash2 } from 'lucide-react';

import {
  useVendor,
  useVendorProducts,
  useProducts,
  useCreateVendorProduct,
  useUpdateVendorProduct,
  useDeleteVendorProduct,
} from '@/hooks/queries/use-inventory';
import { formatCurrency } from '@/lib/format';

import {
  ActionMenu,
  ConfirmDialog,
  EmptyState,
  PageContainer,
  PageContent,
  PageHeader,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type {
  VendorProductMapping,
  CreateVendorProductInput,
  UpdateVendorProductInput,
} from '@/types/inventory';

export default function VendorProductsPage() {
  const params = useParams();
  const vendorId = params.id as string;

  const { data: vendor, isLoading: vendorLoading } = useVendor(vendorId);
  const { data: mappings, isLoading: mappingsLoading } = useVendorProducts(vendorId);
  const { data: productsData } = useProducts({ limit: 100, isActive: true });
  const createMapping = useCreateVendorProduct();
  const updateMapping = useUpdateVendorProduct();
  const deleteMapping = useDeleteVendorProduct();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<VendorProductMapping | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);

  // Get products not already mapped to this vendor
  const mappedProductIds = new Set(mappings?.map((m) => m.productId) || []);
  const availableProducts = productsData?.data.filter((p) => !mappedProductIds.has(p.id)) || [];

  const handleOpenCreate = () => {
    setEditingMapping(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (mapping: VendorProductMapping) => {
    setEditingMapping(mapping);
    setIsDialogOpen(true);
  };

  const handleDelete = (productId: string) => {
    setDeleteProductId(productId);
  };

  const confirmDelete = async () => {
    if (deleteProductId) {
      await deleteMapping.mutateAsync({ vendorId, productId: deleteProductId });
      setDeleteProductId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      if (editingMapping) {
        const data: UpdateVendorProductInput = {
          vendorSku: (formData.get('vendorSku') as string) || null,
          lastPurchasePrice: formData.get('lastPurchasePrice')
            ? parseFloat(formData.get('lastPurchasePrice') as string)
            : null,
          isPreferred: formData.get('isPreferred') === 'on',
        };
        await updateMapping.mutateAsync({
          vendorId,
          productId: editingMapping.productId,
          data,
        });
      } else {
        const data: CreateVendorProductInput = {
          vendorId,
          productId: formData.get('productId') as string,
          vendorSku: (formData.get('vendorSku') as string) || null,
          lastPurchasePrice: formData.get('lastPurchasePrice')
            ? parseFloat(formData.get('lastPurchasePrice') as string)
            : null,
          isPreferred: formData.get('isPreferred') === 'on',
        };
        await createMapping.mutateAsync(data);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save mapping:', error);
    }
  };

  const isPending = createMapping.isPending || updateMapping.isPending;

  if (vendorLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!vendor) {
    return (
      <PageContainer>
        <EmptyState
          icon={Package}
          title="Vendor not found"
          description="The vendor you're looking for doesn't exist."
          action={
            <Button asChild>
              <Link href="/inventory/vendors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Vendors
              </Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={`${vendor.name} - Products`}
        description="Manage products supplied by this vendor"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/inventory/vendors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Vendors
              </Link>
            </Button>
            <Button onClick={handleOpenCreate} disabled={availableProducts.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        }
      />

      <PageContent>
        {mappingsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !mappings || mappings.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products mapped"
            description="Add products that this vendor supplies."
            action={
              availableProducts.length > 0 ? (
                <Button onClick={handleOpenCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Product</TableHead>
                  <TableHead>Vendor SKU</TableHead>
                  <TableHead className="text-right">Last Purchase Price</TableHead>
                  <TableHead>Preferred</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{mapping.product?.name || '-'}</span>
                        <span className="text-sm text-muted-foreground">
                          {mapping.product?.sku || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">{mapping.vendorSku || '-'}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {mapping.lastPurchasePrice ? formatCurrency(mapping.lastPurchasePrice) : '-'}
                    </TableCell>
                    <TableCell>
                      {mapping.isPreferred && (
                        <Badge variant="default" className="gap-1">
                          <Star className="h-3 w-3" />
                          Preferred
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <ActionMenu
                        items={[
                          {
                            label: 'Edit',
                            icon: Pencil,
                            onClick: () => handleOpenEdit(mapping),
                          },
                          {
                            label: 'Remove',
                            icon: Trash2,
                            onClick: () => handleDelete(mapping.productId),
                            variant: 'destructive',
                            separator: true,
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageContent>

      {/* Add/Edit Product Mapping Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMapping ? 'Edit Product Mapping' : 'Add Product'}</DialogTitle>
            <DialogDescription>
              {editingMapping
                ? 'Update the product mapping details.'
                : 'Add a product that this vendor supplies.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {!editingMapping && (
                <div className="grid gap-2">
                  <Label htmlFor="productId">Product *</Label>
                  <Select name="productId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} {product.sku && `(${product.sku})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {editingMapping && (
                <div className="grid gap-2">
                  <Label>Product</Label>
                  <p className="text-sm font-medium">{editingMapping.product?.name}</p>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="vendorSku">Vendor SKU</Label>
                <Input
                  id="vendorSku"
                  name="vendorSku"
                  defaultValue={editingMapping?.vendorSku || ''}
                  placeholder="Vendor's product code"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="lastPurchasePrice">Last Purchase Price</Label>
                <Input
                  id="lastPurchasePrice"
                  name="lastPurchasePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editingMapping?.lastPurchasePrice || ''}
                  placeholder="0.00"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="isPreferred"
                  name="isPreferred"
                  defaultChecked={editingMapping?.isPreferred ?? false}
                />
                <Label htmlFor="isPreferred" className="font-normal">
                  Preferred vendor for this product
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : editingMapping ? 'Save Changes' : 'Add Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteProductId}
        onOpenChange={(open) => !open && setDeleteProductId(null)}
        title="Remove Product Mapping"
        description="Are you sure you want to remove this product mapping? This action cannot be undone."
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteMapping.isPending}
      />
    </PageContainer>
  );
}
