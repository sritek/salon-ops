'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  IndianRupee,
  Layers,
  Package,
  Percent,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react';

import { useService } from '@/hooks/queries/use-services';
import { useVariants } from '@/hooks/queries/use-variants';
import {
  useServiceConsumables,
  useCreateServiceConsumable,
  useUpdateServiceConsumable,
  useDeleteServiceConsumable,
  useProducts,
} from '@/hooks/queries/use-inventory';
import { formatCurrency } from '@/lib/format';

import { EmptyState, PageContainer, PageContent, PageHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ServiceForm } from '../components/service-form';

import type { ServiceConsumableMapping } from '@/types/inventory';

interface ServiceDetailPageProps {
  params: { id: string };
}

export default function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const id = params.id;
  const searchParams = useSearchParams();
  const isEditing = searchParams.get('edit') === 'true';

  const [addConsumableOpen, setAddConsumableOpen] = useState(false);
  const [editingConsumable, setEditingConsumable] = useState<ServiceConsumableMapping | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');

  const { data: service, isLoading, error } = useService(id);
  const { data: variants } = useVariants(id);
  const { data: consumables } = useServiceConsumables(id);
  const { data: productsData } = useProducts({
    productType: 'consumable',
    isActive: true,
    limit: 100,
  });

  const createConsumableMutation = useCreateServiceConsumable();
  const updateConsumableMutation = useUpdateServiceConsumable();
  const deleteConsumableMutation = useDeleteServiceConsumable();

  const handleAddConsumable = async () => {
    if (!selectedProductId || !quantity) return;
    try {
      await createConsumableMutation.mutateAsync({
        serviceId: id,
        productId: selectedProductId,
        quantityPerService: parseFloat(quantity),
      });
      setAddConsumableOpen(false);
      setSelectedProductId('');
      setQuantity('1');
    } catch (err) {
      console.error('Failed to add consumable:', err);
    }
  };

  const handleUpdateConsumable = async () => {
    if (!editingConsumable || !quantity) return;
    try {
      await updateConsumableMutation.mutateAsync({
        serviceId: id,
        productId: editingConsumable.productId,
        data: { quantityPerService: parseFloat(quantity) },
      });
      setEditingConsumable(null);
      setQuantity('1');
    } catch (err) {
      console.error('Failed to update consumable:', err);
    }
  };

  const handleDeleteConsumable = async (productId: string) => {
    try {
      await deleteConsumableMutation.mutateAsync({ serviceId: id, productId });
    } catch (err) {
      console.error('Failed to delete consumable:', err);
    }
  };

  const openEditDialog = (consumable: ServiceConsumableMapping) => {
    setEditingConsumable(consumable);
    setQuantity(consumable.quantityPerService.toString());
  };

  // Filter out already mapped products
  const availableProducts =
    productsData?.data?.filter(
      (product) => !consumables?.some((c) => c.productId === product.id)
    ) || [];

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-6 w-96" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !service) {
    return (
      <PageContainer>
        <EmptyState
          icon={AlertCircle}
          title="Service not found"
          description="The service you're looking for doesn't exist or has been deleted."
          action={
            <Button asChild>
              <Link href="/services">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Services
              </Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  if (isEditing) {
    return (
      <PageContainer>
        <PageHeader
          title="Edit Service"
          description={`Editing ${service.name}`}
          actions={
            <Button variant="outline" asChild>
              <Link href={`/services/${id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Service
              </Link>
            </Button>
          }
        />
        <PageContent>
          <ServiceForm service={service} />
        </PageContent>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={service.name}
        description={service.sku}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/services">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Services
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/services/${id}/variants`}>
                <Settings2 className="mr-2 h-4 w-4" />
                Manage Variants
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/services/${id}?edit=true`}>Edit Service</Link>
            </Button>
          </div>
        }
      />

      <PageContent className="space-y-6">
        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={service.isActive ? 'default' : 'secondary'}>
            {service.isActive ? 'Active' : 'Inactive'}
          </Badge>
          {service.isPopular && <Badge variant="outline">Popular</Badge>}
          {service.isFeatured && <Badge variant="outline">Featured</Badge>}
          {service.isOnlineBookable && <Badge variant="outline">Online Bookable</Badge>}
          {service.category && (
            <Badge variant="outline" style={{ borderColor: service.category.color }}>
              {service.category.name}
            </Badge>
          )}
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="variants">
              Variants {variants && variants.length > 0 && `(${variants.length})`}
            </TabsTrigger>
            <TabsTrigger value="consumables">
              Consumables {consumables && consumables.length > 0 && `(${consumables.length})`}
            </TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            {/* Description */}
            {service.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{service.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Quick Info */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Base Price</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{formatCurrency(service.basePrice)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Duration</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{service.durationMinutes} min</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Tax Rate</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{service.taxRate}%</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Commission</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">
                    {service.commissionType === 'percentage'
                      ? `${service.commissionValue}%`
                      : formatCurrency(service.commissionValue)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Additional Details */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Active Time</dt>
                    <dd className="mt-1">{service.activeTimeMinutes} minutes</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Processing Time</dt>
                    <dd className="mt-1">{service.processingTimeMinutes} minutes</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Gender Applicable</dt>
                    <dd className="mt-1 capitalize">{service.genderApplicable}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      Skill Level Required
                    </dt>
                    <dd className="mt-1 capitalize">{service.skillLevelRequired}</dd>
                  </div>
                  {service.hsnSacCode && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">HSN/SAC Code</dt>
                      <dd className="mt-1">{service.hsnSacCode}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Tax Inclusive</dt>
                    <dd className="mt-1">{service.isTaxInclusive ? 'Yes' : 'No'}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="variants" className="space-y-4">
            {!variants || variants.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="No variants"
                description="This service doesn't have any variants yet."
                action={
                  <Button asChild>
                    <Link href={`/services/${id}/variants`}>Add Variants</Link>
                  </Button>
                }
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {variants.map((variant) => (
                      <div
                        key={variant.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div>
                          <p className="font-medium">{variant.name}</p>
                          <p className="text-sm text-muted-foreground">{variant.variantGroup}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {variant.priceAdjustmentType === 'percentage'
                              ? `${variant.priceAdjustment > 0 ? '+' : ''}${variant.priceAdjustment}%`
                              : `${variant.priceAdjustment > 0 ? '+' : ''}${formatCurrency(variant.priceAdjustment)}`}
                          </p>
                          {variant.durationAdjustment !== 0 && (
                            <p className="text-sm text-muted-foreground">
                              {variant.durationAdjustment > 0 ? '+' : ''}
                              {variant.durationAdjustment} min
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="consumables" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Consumable Products</CardTitle>
                  <CardDescription>
                    Products that are automatically consumed when this service is completed
                  </CardDescription>
                </div>
                <Button onClick={() => setAddConsumableOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Consumable
                </Button>
              </CardHeader>
              <CardContent>
                {!consumables || consumables.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No consumables"
                    description="No products are linked to this service yet."
                  />
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-center">Quantity per Service</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {consumables.map((consumable) => (
                          <TableRow key={consumable.id}>
                            <TableCell className="font-medium">
                              {consumable.product?.name || 'Unknown Product'}
                            </TableCell>
                            <TableCell className="text-center">
                              {consumable.quantityPerService}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={consumable.isActive ? 'default' : 'secondary'}>
                                {consumable.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(consumable)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteConsumable(consumable.productId)}
                                  disabled={deleteConsumableMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Price Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-4">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Base Price</dt>
                    <dd className="font-medium">{formatCurrency(service.basePrice)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Tax ({service.taxRate}%)</dt>
                    <dd className="font-medium">
                      {service.isTaxInclusive
                        ? 'Included'
                        : formatCurrency(service.basePrice * (service.taxRate / 100))}
                    </dd>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between">
                      <dt className="font-medium">
                        {service.isTaxInclusive ? 'Total' : 'Total with Tax'}
                      </dt>
                      <dd className="text-lg font-bold">
                        {formatCurrency(
                          service.isTaxInclusive
                            ? service.basePrice
                            : service.basePrice * (1 + service.taxRate / 100)
                        )}
                      </dd>
                    </div>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageContent>

      {/* Add Consumable Dialog */}
      <Dialog open={addConsumableOpen} onOpenChange={setAddConsumableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Consumable Product</DialogTitle>
            <DialogDescription>
              Select a product that will be consumed when this service is performed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.unitOfMeasure})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity per Service</Label>
              <Input
                id="quantity"
                type="number"
                min={0.01}
                step={0.01}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddConsumableOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddConsumable}
              disabled={!selectedProductId || !quantity || createConsumableMutation.isPending}
            >
              {createConsumableMutation.isPending ? 'Adding...' : 'Add Consumable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Consumable Dialog */}
      <Dialog
        open={!!editingConsumable}
        onOpenChange={(open) => !open && setEditingConsumable(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Consumable</DialogTitle>
            <DialogDescription>{editingConsumable?.product?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantity per Service</Label>
              <Input
                id="edit-quantity"
                type="number"
                min={0.01}
                step={0.01}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConsumable(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateConsumable}
              disabled={!quantity || updateConsumableMutation.isPending}
            >
              {updateConsumableMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
