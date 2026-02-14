'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

import { useCreateTransfer, useProducts, useStockSummary } from '@/hooks/queries/use-inventory';
import { useAuthStore } from '@/stores/auth-store';

import { PageContainer, PageContent, PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

import type { TransferItemInput } from '@/types/inventory';

// Mock branches - in real app, this would come from an API
const mockBranches = [
  { id: 'branch-1', name: 'Main Branch' },
  { id: 'branch-2', name: 'Downtown Branch' },
  { id: 'branch-3', name: 'Mall Branch' },
];

interface TransferLineItem extends TransferItemInput {
  productName: string;
  availableStock: number;
}

export default function NewTransferPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const sourceBranchId = user?.branchIds?.[0] || '';

  const [destinationBranchId, setDestinationBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<TransferLineItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');

  const { data: productsData } = useProducts({ limit: 100, isActive: true });
  const { data: stockData } = useStockSummary(sourceBranchId, { limit: 100 });

  const createMutation = useCreateTransfer();

  // Get available branches (exclude source branch)
  const availableBranches = mockBranches.filter((b) => b.id !== sourceBranchId);

  // Get products with stock
  const productsWithStock =
    productsData?.data.map((product) => {
      const stock = stockData?.data.find((s) => s.productId === product.id);
      return {
        ...product,
        availableStock: stock?.availableQuantity || 0,
      };
    }) || [];

  // Filter out already added products
  const availableProducts = productsWithStock.filter(
    (p) => !items.some((item) => item.productId === p.id) && p.availableStock > 0
  );

  const handleAddProduct = () => {
    if (!selectedProductId) return;

    const product = productsWithStock.find((p) => p.id === selectedProductId);
    if (!product) return;

    setItems([
      ...items,
      {
        productId: product.id,
        productName: product.name,
        requestedQuantity: 1,
        availableStock: product.availableStock,
      },
    ]);
    setSelectedProductId('');
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setItems(
      items.map((item) =>
        item.productId === productId
          ? { ...item, requestedQuantity: Math.max(1, Math.min(quantity, item.availableStock)) }
          : item
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter((item) => item.productId !== productId));
  };

  const handleSubmit = async () => {
    if (!destinationBranchId || items.length === 0) return;

    try {
      await createMutation.mutateAsync({
        branchId: sourceBranchId,
        data: {
          destinationBranchId,
          notes: notes || undefined,
          items: items.map((item) => ({
            productId: item.productId,
            requestedQuantity: item.requestedQuantity,
          })),
        },
      });
      router.push('/inventory/transfers');
    } catch (err) {
      console.error('Failed to create transfer:', err);
    }
  };

  const isValid = destinationBranchId && items.length > 0;

  return (
    <PageContainer>
      <PageHeader
        title="New Transfer Request"
        description="Request stock transfer to another branch"
        actions={
          <Button variant="outline" asChild>
            <Link href="/inventory/transfers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Link>
          </Button>
        }
      />

      <PageContent>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Transfer Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transfer Details</CardTitle>
                <CardDescription>Select destination branch and add items</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Source Branch</Label>
                    <Input
                      value={
                        mockBranches.find((b) => b.id === sourceBranchId)?.name || 'Current Branch'
                      }
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination">Destination Branch</Label>
                    <Select value={destinationBranchId} onValueChange={setDestinationBranchId}>
                      <SelectTrigger id="destination">
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBranches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes for this transfer..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Add Products */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transfer Items</CardTitle>
                <CardDescription>Add products to transfer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a product to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} (Available: {product.availableStock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddProduct} disabled={!selectedProductId}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>

                {items.length > 0 && (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-center">Available</TableHead>
                          <TableHead className="text-center w-[150px]">Quantity</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.productId}>
                            <TableCell className="font-medium">{item.productName}</TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {item.availableStock}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                max={item.availableStock}
                                value={item.requestedQuantity}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    item.productId,
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="text-center"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(item.productId)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {items.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No items added yet. Select a product above to add it to the transfer.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Items</span>
                    <span className="font-medium">{items.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Quantity</span>
                    <span className="font-medium">
                      {items.reduce((sum, item) => sum + item.requestedQuantity, 0)}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!isValid || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Transfer Request'}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  The transfer will need to be approved by the source branch before dispatch.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </PageContainer>
  );
}
