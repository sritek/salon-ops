'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

import {
  useVendors,
  useProducts,
  usePurchaseOrder,
  useCreateGoodsReceipt,
} from '@/hooks/queries/use-inventory';
import { useAuthStore } from '@/stores/auth-store';
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

import type { CreateGRNItemInput, QualityCheckStatus } from '@/types/inventory';

interface GRNLineItem extends CreateGRNItemInput {
  productName: string;
  lineTotal: number;
  taxAmount: number;
}

export default function NewGoodsReceiptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const poId = searchParams.get('poId');

  const { user } = useAuthStore();
  const branchId = user?.branchIds?.[0] || '';

  const [vendorId, setVendorId] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<GRNLineItem[]>([]);

  // For adding new items
  const [selectedProductId, setSelectedProductId] = useState('');
  const [receivedQuantity, setReceivedQuantity] = useState('');
  const [focQuantity, setFocQuantity] = useState('0');
  const [unitCost, setUnitCost] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const { data: vendorsData } = useVendors({ limit: 100, isActive: true });
  const { data: productsData } = useProducts({ limit: 200, isActive: true });
  const { data: purchaseOrder } = usePurchaseOrder(branchId, poId || '');
  const createGRN = useCreateGoodsReceipt();

  const products = productsData?.data || [];
  const vendors = vendorsData?.data || [];

  // Pre-fill from PO if provided
  useEffect(() => {
    if (purchaseOrder && poId) {
      setVendorId(purchaseOrder.vendorId);
      // Pre-fill items from PO
      if (purchaseOrder.items) {
        const poItems: GRNLineItem[] = purchaseOrder.items
          .filter((item) => item.pendingQuantity > 0)
          .map((item) => {
            const taxAmount = (item.unitPrice * item.pendingQuantity * item.taxRate) / 100;
            return {
              productId: item.productId,
              productName: item.productName,
              purchaseOrderItemId: item.id,
              receivedQuantity: item.pendingQuantity,
              focQuantity: 0,
              unitCost: item.unitPrice,
              taxRate: item.taxRate,
              qualityCheckStatus: 'accepted' as QualityCheckStatus,
              acceptedQuantity: item.pendingQuantity,
              rejectedQuantity: 0,
              lineTotal: item.unitPrice * item.pendingQuantity,
              taxAmount,
            };
          });
        setItems(poItems);
      }
    }
  }, [purchaseOrder, poId]);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = subtotal + totalTax;

  const handleAddItem = () => {
    if (!selectedProductId || !receivedQuantity || !unitCost) return;

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    const qty = parseFloat(receivedQuantity);
    const foc = parseFloat(focQuantity) || 0;
    const cost = parseFloat(unitCost);
    const taxRate = product.taxRate || 18;
    const lineTotal = qty * cost;
    const taxAmount = (lineTotal * taxRate) / 100;

    const newItem: GRNLineItem = {
      productId: selectedProductId,
      productName: product.name,
      receivedQuantity: qty,
      focQuantity: foc,
      unitCost: cost,
      taxRate,
      batchNumber: batchNumber || null,
      expiryDate: expiryDate || null,
      qualityCheckStatus: 'accepted',
      acceptedQuantity: qty + foc,
      rejectedQuantity: 0,
      lineTotal,
      taxAmount,
    };

    setItems([...items, newItem]);
    resetItemForm();
  };

  const resetItemForm = () => {
    setSelectedProductId('');
    setReceivedQuantity('');
    setFocQuantity('0');
    setUnitCost('');
    setBatchNumber('');
    setExpiryDate('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    const product = products.find((p) => p.id === productId);
    if (product) {
      setUnitCost(product.defaultPurchasePrice.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorId || items.length === 0) {
      alert('Please select a vendor and add at least one item.');
      return;
    }

    try {
      await createGRN.mutateAsync({
        branchId,
        data: {
          purchaseOrderId: poId || null,
          vendorId,
          receiptDate,
          notes: notes || null,
          items: items.map((item) => ({
            productId: item.productId,
            purchaseOrderItemId: item.purchaseOrderItemId || null,
            receivedQuantity: item.receivedQuantity,
            focQuantity: item.focQuantity,
            unitCost: item.unitCost,
            taxRate: item.taxRate,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            qualityCheckStatus: item.qualityCheckStatus,
            acceptedQuantity: item.acceptedQuantity,
            rejectedQuantity: item.rejectedQuantity,
            rejectionReason: null,
          })),
        },
      });
      router.push('/inventory/goods-receipts');
    } catch (error) {
      console.error('Failed to create goods receipt:', error);
    }
  };

  // Get products not already in the receipt
  const addedProductIds = new Set(items.map((i) => i.productId));
  const availableProducts = products.filter((p) => !addedProductIds.has(p.id));

  return (
    <PageContainer>
      <PageHeader
        title="New Goods Receipt"
        description={
          poId
            ? `Creating GRN for PO: ${purchaseOrder?.poNumber || '...'}`
            : 'Record new inventory intake'
        }
        actions={
          <Button variant="outline" asChild>
            <Link href="/inventory/goods-receipts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Goods Receipts
            </Link>
          </Button>
        }
      />

      <PageContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Info */}
          <Card>
            <CardHeader>
              <CardTitle>Receipt Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="vendor">Vendor *</Label>
                <Select value={vendorId} onValueChange={setVendorId} disabled={!!poId}>
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
                <Label htmlFor="receiptDate">Receipt Date *</Label>
                <Input
                  id="receiptDate"
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  required
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

          {/* Add Item (only for standalone GRN) */}
          {!poId && (
            <Card>
              <CardHeader>
                <CardTitle>Add Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-6 items-end">
                  <div className="md:col-span-2 grid gap-2">
                    <Label>Product</Label>
                    <Select value={selectedProductId} onValueChange={handleProductSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={receivedQuantity}
                      onChange={(e) => setReceivedQuantity(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>FOC Qty</Label>
                    <Input
                      type="number"
                      min="0"
                      value={focQuantity}
                      onChange={(e) => setFocQuantity(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Unit Cost</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={unitCost}
                      onChange={(e) => setUnitCost(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!selectedProductId || !receivedQuantity || !unitCost}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3 mt-4">
                  <div className="grid gap-2">
                    <Label>Batch Number</Label>
                    <Input
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Line Items */}
          {items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Receipt Items ({items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Product</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">FOC</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Line Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="text-right">{item.receivedQuantity}</TableCell>
                          <TableCell className="text-right">{item.focQuantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unitCost)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.taxAmount)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.lineTotal + item.taxAmount)}
                          </TableCell>
                          <TableCell>
                            {!poId && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
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
              <Link href="/inventory/goods-receipts">Cancel</Link>
            </Button>
            <Button type="submit" disabled={createGRN.isPending || items.length === 0}>
              {createGRN.isPending ? 'Creating...' : 'Create Goods Receipt'}
            </Button>
          </div>
        </form>
      </PageContent>
    </PageContainer>
  );
}
