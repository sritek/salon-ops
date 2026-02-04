'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Layers, Plus, Trash2 } from 'lucide-react';

import { useService } from '@/hooks/queries/use-services';
import {
  useCreateVariant,
  useDeleteVariant,
  useUpdateVariant,
  useVariants,
} from '@/hooks/queries/use-variants';
import { formatCurrency } from '@/lib/format';

import { EmptyState, PageContainer, PageContent, PageHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

import type { CreateVariantInput, ServiceVariant } from '@/types/services';

interface VariantsPageProps {
  params: { id: string };
}

export default function VariantsPage({ params }: VariantsPageProps) {
  const serviceId = params.id;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ServiceVariant | null>(null);

  const { data: service } = useService(serviceId);
  const { data: variants, isLoading } = useVariants(serviceId);
  const createVariant = useCreateVariant();
  const updateVariant = useUpdateVariant();
  const deleteVariant = useDeleteVariant();

  const handleOpenCreate = () => {
    setEditingVariant(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (variant: ServiceVariant) => {
    setEditingVariant(variant);
    setIsDialogOpen(true);
  };

  const handleDelete = async (variantId: string) => {
    if (confirm('Are you sure you want to delete this variant?')) {
      await deleteVariant.mutateAsync({ serviceId, variantId });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: CreateVariantInput = {
      name: formData.get('name') as string,
      variantGroup: formData.get('variantGroup') as string,
      priceAdjustmentType:
        (formData.get('priceAdjustmentType') as 'absolute' | 'percentage') || 'absolute',
      priceAdjustment: parseFloat(formData.get('priceAdjustment') as string),
      durationAdjustment: parseInt(formData.get('durationAdjustment') as string) || 0,
      isActive: formData.get('isActive') === 'on',
    };

    try {
      if (editingVariant) {
        await updateVariant.mutateAsync({
          serviceId,
          variantId: editingVariant.id,
          data,
        });
      } else {
        await createVariant.mutateAsync({ serviceId, data });
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save variant:', error);
    }
  };

  const isPending = createVariant.isPending || updateVariant.isPending;

  // Group variants by variantGroup
  const groupedVariants = variants?.reduce(
    (acc, variant) => {
      const group = variant.variantGroup;
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(variant);
      return acc;
    },
    {} as Record<string, ServiceVariant[]>
  );

  return (
    <PageContainer>
      <PageHeader
        title={`Variants: ${service?.name || 'Loading...'}`}
        description="Manage service variations like hair length, nail style, etc."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/services/${serviceId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Service
              </Link>
            </Button>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Variant
            </Button>
          </div>
        }
      />

      <PageContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : !variants || variants.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No variants"
            description="Add variants to offer different options for this service."
            action={
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Variant
              </Button>
            }
          />
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedVariants || {}).map(([group, vars]) => (
              <div key={group}>
                <h3 className="mb-3 text-lg font-medium">{group}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {vars.map((variant) => (
                    <div key={variant.id} className="group rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{variant.name}</p>
                          <div className="mt-1 flex gap-2">
                            <Badge variant="outline">
                              {variant.priceAdjustmentType === 'percentage'
                                ? `${variant.priceAdjustment > 0 ? '+' : ''}${variant.priceAdjustment}%`
                                : `${variant.priceAdjustment > 0 ? '+' : ''}${formatCurrency(variant.priceAdjustment)}`}
                            </Badge>
                            {variant.durationAdjustment !== 0 && (
                              <Badge variant="outline">
                                {variant.durationAdjustment > 0 ? '+' : ''}
                                {variant.durationAdjustment} min
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(variant)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(variant.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {!variant.isActive && (
                        <Badge variant="secondary" className="mt-2">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVariant ? 'Edit Variant' : 'Add Variant'}</DialogTitle>
            <DialogDescription>
              {editingVariant
                ? 'Update the variant details.'
                : 'Add a new variant option for this service.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="variantGroup">Variant Group *</Label>
                <Input
                  id="variantGroup"
                  name="variantGroup"
                  defaultValue={editingVariant?.variantGroup || ''}
                  placeholder="e.g., Hair Length, Style"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">Variant Name *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingVariant?.name || ''}
                  placeholder="e.g., Short, Medium, Long"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="priceAdjustmentType">Price Adjustment Type</Label>
                  <Select
                    name="priceAdjustmentType"
                    defaultValue={editingVariant?.priceAdjustmentType || 'absolute'}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="absolute">Absolute (₹)</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="priceAdjustment">Price Adjustment *</Label>
                  <Input
                    id="priceAdjustment"
                    name="priceAdjustment"
                    type="number"
                    step="0.01"
                    defaultValue={editingVariant?.priceAdjustment || 0}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="durationAdjustment">Duration Adjustment (min)</Label>
                <Input
                  id="durationAdjustment"
                  name="durationAdjustment"
                  type="number"
                  defaultValue={editingVariant?.durationAdjustment || 0}
                  placeholder="0"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  defaultChecked={editingVariant?.isActive ?? true}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isActive" className="font-normal">
                  Active
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : editingVariant ? 'Save Changes' : 'Add Variant'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
