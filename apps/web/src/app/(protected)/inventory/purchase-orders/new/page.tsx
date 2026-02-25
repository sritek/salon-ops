'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

import { useVendors, useProducts, useCreatePurchaseOrder } from '@/hooks/queries/use-inventory';
import { useBranchContext } from '@/hooks/use-branch-context';
import { formatCurrency } from '@/lib/format';

import { PageContainer, PageContent, PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

import type { CreatePOItemInput } from '@/types/inventory';

interface POLineItem extends CreatePOItemInput {
  productName: string;
  lineTotal: number;
  taxAmount: number;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { branchId } = useBranchContext();

  const [vendorId, setVendorId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<POLineItem[]>([]);

  // For adding new items
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  const { data: vendorsData } = useVendors({ limit: 100, isActive: true });
  const { data: productsData } = useProducts({ limit: 200, isActive: true });
  const createPO = useCreatePurchaseOrder();

  const products = productsData?.data || [];
  const vendors = vendorsData?.data || [];

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = subtotal + totalTax;

  const handleAddItem = () => {
    if (!selectedProductId || !quantity || !unitPrice) return;

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    const qty = parseFloat(quantity);
    const price = parseFloat(unitPrice);
    const taxRate = product.taxRate || 18;
    const lineTotal = qty * price;
    const taxAmount = (lineTotal * taxRate) / 100;

    const newItem: POLineItem = {
      productId: selectedProductId,
      productName: product.name,
      quantity: qty,
      unitPrice: price,
      taxRate,
      lineTotal,
      taxAmount,
    };

    setItems([...items, newItem]);
    setSelectedProductId('');
    setQuantity('');
    setUnitPrice('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    const product = products.find((p) => p.id === productId);
    if (product) {
      setUnitPrice(product.defaultPurchasePrice.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorId || items.length === 0) {
      alert('Please select a vendor and add at least one item.');
      return;
    }

    try {
      await createPO.mutateAsync({
        branchId: branchId || '',
        data: {
          vendorId,
          expectedDeliveryDate: expectedDeliveryDate || null,
          notes: notes || null,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
          })),
        },
      });
      router.push('/inventory/purchase-orders');
    } catch (error) {
      console.error('Failed to create purchase order:', error);
    }
  };

  // Get products not already in the order
  const addedProductIds = new Set(items.map((i) => i.productId));
  const availableProducts = products.filter((p) => !addedProductIds.has(p.id));

  return (
    <PageContainer>
      <PageHeader
        title="New Purchase Order"
        description="Create a new purchase order for inventory replenishment"
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Info */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="vendor">Vendor *</Label>
                <Select value={vendorId} onValueChange={setVendorId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
                <Input
                  id="expectedDeliveryDate"
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  className="resize-none h-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Add Item */}
          <Card>
            <CardHeader>
              <CardTitle>Add Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1 grid gap-2">
                  <Label>Product</Label>
                  <Select value={selectedProductId} onValueChange={handleProductSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
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

                <div className="w-32 grid gap-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="w-40 grid gap-2">
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!selectedProductId || !quantity || !unitPrice}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          {items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Order Items ({items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Product</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Tax Rate</TableHead>
                        <TableHead className="text-right">Tax Amount</TableHead>
                        <TableHead className="text-right">Line Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right">{item.taxRate}%</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.taxAmount)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.lineTotal + item.taxAmount)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="mt-4 flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Tax:</span>
                      <span>{formatCurrency(totalTax)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-lg border-t pt-2">
                      <span>Grand Total:</span>
                      <span>{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/inventory/purchase-orders">Cancel</Link>
            </Button>
            <Button type="submit" disabled={createPO.isPending || items.length === 0}>
              {createPO.isPending ? 'Creating...' : 'Create Purchase Order'}
            </Button>
          </div>
        </form>
      </PageContent>
    </PageContainer>
  );
}
