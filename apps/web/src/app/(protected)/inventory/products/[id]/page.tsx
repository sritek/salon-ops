'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Package, Settings, Users } from 'lucide-react';

import {
  useProduct,
  useProductVendors,
  useBranchProductSettings,
  useUpdateBranchProductSettings,
} from '@/hooks/queries/use-inventory';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency } from '@/lib/format';

import { EmptyState, PageContainer, PageContent, PageHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { UpdateBranchSettingsInput } from '@/types/inventory';

const productTypeLabels = {
  consumable: 'Consumable',
  retail: 'Retail',
  both: 'Both',
};

const unitLabels = {
  ml: 'Milliliters (ml)',
  gm: 'Grams (gm)',
  pieces: 'Pieces',
  bottles: 'Bottles',
  sachets: 'Sachets',
  tubes: 'Tubes',
  boxes: 'Boxes',
};

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const { user } = useAuthStore();
  const branchId = user?.branchIds?.[0] || '';

  const { data: product, isLoading: productLoading } = useProduct(productId);
  const { data: vendors, isLoading: vendorsLoading } = useProductVendors(productId);
  const { data: branchSettings, isLoading: settingsLoading } = useBranchProductSettings(
    branchId,
    productId
  );
  const updateSettings = useUpdateBranchProductSettings();

  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  const handleUpdateSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: UpdateBranchSettingsInput = {
      isEnabled: formData.get('isEnabled') === 'on',
      reorderLevel: formData.get('reorderLevel')
        ? parseInt(formData.get('reorderLevel') as string)
        : null,
      sellingPriceOverride: formData.get('sellingPriceOverride')
        ? parseFloat(formData.get('sellingPriceOverride') as string)
        : null,
    };

    try {
      await updateSettings.mutateAsync({ branchId, productId, data });
      setIsSettingsDialogOpen(false);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  if (productLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!product) {
    return (
      <PageContainer>
        <EmptyState
          icon={Package}
          title="Product not found"
          description="The product you're looking for doesn't exist."
          action={
            <Button asChild>
              <Link href="/inventory/products">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Products
              </Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const effectivePrice = branchSettings?.sellingPriceOverride ?? product.defaultSellingPrice;

  return (
    <PageContainer>
      <PageHeader
        title={product.name}
        description={product.sku || product.barcode || 'No SKU/Barcode'}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/inventory/products">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Products
              </Link>
            </Button>
            <Button onClick={() => setIsSettingsDialogOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Branch Settings
            </Button>
          </div>
        }
      />

      <PageContent>
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="vendors">Vendors ({vendors?.length || 0})</TabsTrigger>
            <TabsTrigger value="branch">Branch Settings</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="font-medium">{product.categoryName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <Badge variant="outline">
                        {productTypeLabels[product.productType as keyof typeof productTypeLabels]}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Unit</p>
                      <p className="font-medium">
                        {unitLabels[product.unitOfMeasure as keyof typeof unitLabels]}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={product.isActive ? 'default' : 'secondary'}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  {product.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-sm">{product.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing & Tax</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Purchase Price</p>
                      <p className="font-medium">{formatCurrency(product.defaultPurchasePrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Default Selling Price</p>
                      <p className="font-medium">{formatCurrency(product.defaultSellingPrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Effective Price (This Branch)</p>
                      <p className="font-medium text-primary">{formatCurrency(effectivePrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tax Rate</p>
                      <p className="font-medium">{product.taxRate}%</p>
                    </div>
                    {product.hsnCode && (
                      <div>
                        <p className="text-sm text-muted-foreground">HSN Code</p>
                        <p className="font-medium">{product.hsnCode}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Identifiers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">SKU</p>
                      <p className="font-medium">{product.sku || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Barcode</p>
                      <p className="font-medium">{product.barcode || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={product.expiryTrackingEnabled} disabled />
                    <span className="text-sm">Expiry Tracking Enabled</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors">
            <Card>
              <CardHeader>
                <CardTitle>Linked Vendors</CardTitle>
                <CardDescription>Vendors that supply this product</CardDescription>
              </CardHeader>
              <CardContent>
                {vendorsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !vendors || vendors.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No vendors linked"
                    description="This product is not linked to any vendors yet."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Vendor SKU</TableHead>
                        <TableHead className="text-right">Last Purchase Price</TableHead>
                        <TableHead>Preferred</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendors.map((mapping) => (
                        <TableRow key={mapping.id}>
                          <TableCell className="font-medium">
                            {mapping.vendor?.name || '-'}
                          </TableCell>
                          <TableCell>{mapping.vendorSku || '-'}</TableCell>
                          <TableCell className="text-right">
                            {mapping.lastPurchasePrice
                              ? formatCurrency(mapping.lastPurchasePrice)
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {mapping.isPreferred && <Badge variant="default">Preferred</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branch Settings Tab */}
          <TabsContent value="branch">
            <Card>
              <CardHeader>
                <CardTitle>Branch-Specific Settings</CardTitle>
                <CardDescription>Override default settings for this branch</CardDescription>
              </CardHeader>
              <CardContent>
                {settingsLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Enabled for Branch</p>
                        <Badge
                          variant={branchSettings?.isEnabled !== false ? 'default' : 'secondary'}
                        >
                          {branchSettings?.isEnabled !== false ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Reorder Level</p>
                        <p className="font-medium">{branchSettings?.reorderLevel ?? 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Price Override</p>
                        <p className="font-medium">
                          {branchSettings?.sellingPriceOverride
                            ? formatCurrency(branchSettings.sellingPriceOverride)
                            : 'Using default'}
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => setIsSettingsDialogOpen(true)}>
                      <Settings className="mr-2 h-4 w-4" />
                      Edit Branch Settings
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageContent>

      {/* Branch Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Branch Product Settings</DialogTitle>
            <DialogDescription>
              Configure branch-specific settings for this product
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateSettings}>
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isEnabled"
                  name="isEnabled"
                  defaultChecked={branchSettings?.isEnabled !== false}
                />
                <Label htmlFor="isEnabled" className="font-normal">
                  Enable product for this branch
                </Label>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reorderLevel">Reorder Level</Label>
                <Input
                  id="reorderLevel"
                  name="reorderLevel"
                  type="number"
                  min="0"
                  defaultValue={branchSettings?.reorderLevel || ''}
                  placeholder="e.g., 10"
                />
                <p className="text-xs text-muted-foreground">
                  Alert when stock falls below this level
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sellingPriceOverride">Selling Price Override</Label>
                <Input
                  id="sellingPriceOverride"
                  name="sellingPriceOverride"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={branchSettings?.sellingPriceOverride || ''}
                  placeholder={`Default: ${formatCurrency(product.defaultSellingPrice)}`}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use the default price
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSettingsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
