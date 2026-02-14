'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

import { useCreateAudit, useProducts, useProductCategories } from '@/hooks/queries/use-inventory';
import { useAuthStore } from '@/stores/auth-store';

import { PageContainer, PageContent, PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

import type { AuditType } from '@/types/inventory';
import { AUDIT_TYPE_LABELS } from '@/types/inventory';

export default function NewAuditPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const branchId = user?.branchIds?.[0] || '';

  const [auditType, setAuditType] = useState<AuditType>('full');
  const [categoryId, setCategoryId] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const { data: productsData } = useProducts({ limit: 100, isActive: true });
  const { data: categoriesData } = useProductCategories({ isActive: true });

  const createMutation = useCreateAudit();

  const handleProductToggle = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (productsData?.data) {
      const allIds = productsData.data.map((p) => p.id);
      setSelectedProductIds(selectedProductIds.length === allIds.length ? [] : allIds);
    }
  };

  const handleSubmit = async () => {
    try {
      await createMutation.mutateAsync({
        branchId,
        data: {
          auditType,
          categoryId: auditType === 'category' ? categoryId : undefined,
          productIds: auditType === 'partial' ? selectedProductIds : undefined,
          notes: notes || undefined,
        },
      });
      router.push('/inventory/audits');
    } catch (err) {
      console.error('Failed to create audit:', err);
    }
  };

  const isValid =
    auditType === 'full' ||
    (auditType === 'category' && categoryId) ||
    (auditType === 'partial' && selectedProductIds.length > 0);

  return (
    <PageContainer>
      <PageHeader
        title="New Stock Audit"
        description="Create a new physical stock count audit"
        actions={
          <Button variant="outline" asChild>
            <Link href="/inventory/audits">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Link>
          </Button>
        }
      />

      <PageContent>
        <div className="max-w-2xl space-y-6">
          {/* Audit Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Audit Type</CardTitle>
              <CardDescription>Select the scope of this stock audit</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={auditType}
                onValueChange={(v) => setAuditType(v as AuditType)}
                className="space-y-3"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="full" id="full" />
                  <div className="space-y-1">
                    <Label htmlFor="full" className="font-medium">
                      {AUDIT_TYPE_LABELS.full}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Count all products in the branch inventory
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="category" id="category" />
                  <div className="space-y-1">
                    <Label htmlFor="category" className="font-medium">
                      {AUDIT_TYPE_LABELS.category}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Count all products in a specific category
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="partial" id="partial" />
                  <div className="space-y-1">
                    <Label htmlFor="partial" className="font-medium">
                      {AUDIT_TYPE_LABELS.partial}
                    </Label>
                    <p className="text-sm text-muted-foreground">Count selected products only</p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Category Selection (for category audit) */}
          {auditType === 'category' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Category</CardTitle>
                <CardDescription>Choose the category to audit</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesData?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Product Selection (for partial audit) */}
          {auditType === 'partial' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Products</CardTitle>
                <CardDescription>
                  Choose the products to include in this audit ({selectedProductIds.length}{' '}
                  selected)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={
                              productsData?.data &&
                              selectedProductIds.length === productsData.data.length
                            }
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productsData?.data.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedProductIds.includes(product.id)}
                              onCheckedChange={() => handleProductToggle(product.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="font-mono text-sm">{product.sku || '-'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {product.categoryName || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for this audit..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link href="/inventory/audits">Cancel</Link>
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Start Audit'}
            </Button>
          </div>
        </div>
      </PageContent>
    </PageContainer>
  );
}
