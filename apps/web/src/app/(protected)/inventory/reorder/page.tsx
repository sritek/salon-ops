'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Package, ShoppingCart } from 'lucide-react';

import { useReorderSuggestions, useCreatePurchaseOrder } from '@/hooks/queries/use-inventory';
import { useBranchContext } from '@/hooks/use-branch-context';
import { formatCurrency } from '@/lib/format';

import { EmptyState, PageContainer, PageContent, PageHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { ReorderSuggestion } from '@/types/inventory';

interface SelectedItem extends ReorderSuggestion {
  orderQuantity: number;
}

export default function ReorderSuggestionsPage() {
  const router = useRouter();
  const { branchId } = useBranchContext();

  const { data: suggestions, isLoading } = useReorderSuggestions(branchId || '');
  const createPO = useCreatePurchaseOrder();

  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map());

  const handleToggleItem = (suggestion: ReorderSuggestion) => {
    const newSelected = new Map(selectedItems);
    if (newSelected.has(suggestion.productId)) {
      newSelected.delete(suggestion.productId);
    } else {
      newSelected.set(suggestion.productId, {
        ...suggestion,
        orderQuantity: suggestion.suggestedQuantity,
      });
    }
    setSelectedItems(newSelected);
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    const newSelected = new Map(selectedItems);
    const item = newSelected.get(productId);
    if (item) {
      newSelected.set(productId, { ...item, orderQuantity: quantity });
      setSelectedItems(newSelected);
    }
  };

  const handleSelectAll = () => {
    if (!suggestions) return;

    if (selectedItems.size === suggestions.length) {
      setSelectedItems(new Map());
    } else {
      const newSelected = new Map<string, SelectedItem>();
      suggestions.forEach((s) => {
        newSelected.set(s.productId, {
          ...s,
          orderQuantity: s.suggestedQuantity,
        });
      });
      setSelectedItems(newSelected);
    }
  };

  const handleCreatePO = async (vendorId: string) => {
    const itemsForVendor = Array.from(selectedItems.values()).filter(
      (item) => item.preferredVendorId === vendorId
    );

    if (itemsForVendor.length === 0) return;

    try {
      await createPO.mutateAsync({
        branchId: branchId || '',
        data: {
          vendorId,
          items: itemsForVendor.map((item) => ({
            productId: item.productId,
            quantity: item.orderQuantity,
            unitPrice: item.lastPurchasePrice || 0,
          })),
        },
      });

      // Remove created items from selection
      const newSelected = new Map(selectedItems);
      itemsForVendor.forEach((item) => newSelected.delete(item.productId));
      setSelectedItems(newSelected);

      router.push('/inventory/purchase-orders');
    } catch (error) {
      console.error('Failed to create purchase order:', error);
    }
  };

  // Group selected items by vendor
  const itemsByVendor = new Map<string, SelectedItem[]>();
  selectedItems.forEach((item) => {
    const vendorId = item.preferredVendorId || 'no-vendor';
    const existing = itemsByVendor.get(vendorId) || [];
    itemsByVendor.set(vendorId, [...existing, item]);
  });

  return (
    <PageContainer>
      <PageHeader
        title="Reorder Suggestions"
        description="Products below reorder level that need replenishment"
        actions={
          <Button variant="outline" asChild>
            <Link href="/inventory/purchase-orders">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Purchase Orders
            </Link>
          </Button>
        }
      />

      <PageContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !suggestions || suggestions.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No reorder suggestions"
            description="All products are above their reorder levels. Great job keeping stock!"
          />
        ) : (
          <div className="space-y-6">
            {/* Suggestions Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Low Stock Products ({suggestions.length})</CardTitle>
                    <CardDescription>Select products to create purchase orders</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedItems.size === suggestions.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        <TableHead className="text-right">Reorder Level</TableHead>
                        <TableHead className="text-right">Suggested Qty</TableHead>
                        <TableHead className="text-right">Order Qty</TableHead>
                        <TableHead>Preferred Vendor</TableHead>
                        <TableHead className="text-right">Last Price</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suggestions.map((suggestion) => {
                        const isSelected = selectedItems.has(suggestion.productId);
                        const selectedItem = selectedItems.get(suggestion.productId);

                        return (
                          <TableRow key={suggestion.productId}>
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleItem(suggestion)}
                                disabled={suggestion.hasPendingPO}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{suggestion.productName}</span>
                                {suggestion.productSku && (
                                  <span className="text-sm text-muted-foreground">
                                    {suggestion.productSku}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={
                                  suggestion.currentStock === 0
                                    ? 'text-destructive font-medium'
                                    : ''
                                }
                              >
                                {suggestion.currentStock}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{suggestion.reorderLevel}</TableCell>
                            <TableCell className="text-right">
                              {suggestion.suggestedQuantity}
                            </TableCell>
                            <TableCell className="text-right">
                              {isSelected ? (
                                <Input
                                  type="number"
                                  min="1"
                                  className="w-20 text-right"
                                  value={selectedItem?.orderQuantity || ''}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      suggestion.productId,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                />
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              {suggestion.preferredVendorName || (
                                <span className="text-muted-foreground">No vendor</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {suggestion.lastPurchasePrice
                                ? formatCurrency(suggestion.lastPurchasePrice)
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {suggestion.hasPendingPO ? (
                                <Badge variant="outline">PO Pending</Badge>
                              ) : suggestion.currentStock === 0 ? (
                                <Badge variant="destructive">Out of Stock</Badge>
                              ) : (
                                <Badge variant="secondary">Low Stock</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Create PO by Vendor */}
            {selectedItems.size > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Create Purchase Orders</CardTitle>
                  <CardDescription>Selected items grouped by preferred vendor</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Array.from(itemsByVendor.entries()).map(([vendorId, items]) => {
                    const vendorName =
                      vendorId === 'no-vendor'
                        ? 'No Preferred Vendor'
                        : items[0]?.preferredVendorName || 'Unknown Vendor';
                    const totalValue = items.reduce(
                      (sum, item) => sum + item.orderQuantity * (item.lastPurchasePrice || 0),
                      0
                    );

                    return (
                      <div
                        key={vendorId}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium">{vendorName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {items.length} items • Est. {formatCurrency(totalValue)}
                          </p>
                        </div>
                        {vendorId !== 'no-vendor' ? (
                          <Button
                            onClick={() => handleCreatePO(vendorId)}
                            disabled={createPO.isPending}
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Create PO
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm">Assign vendors first</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </PageContent>
    </PageContainer>
  );
}
