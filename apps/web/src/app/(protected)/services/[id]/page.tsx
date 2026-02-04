'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  IndianRupee,
  Layers,
  Percent,
  Settings2,
} from 'lucide-react';

import { useService } from '@/hooks/queries/use-services';
import { useVariants } from '@/hooks/queries/use-variants';
import { formatCurrency } from '@/lib/format';

import { EmptyState, PageContainer, PageContent, PageHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ServiceForm } from '../components/service-form';

interface ServiceDetailPageProps {
  params: { id: string };
}

export default function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const id = params.id;
  const searchParams = useSearchParams();
  const isEditing = searchParams.get('edit') === 'true';

  const { data: service, isLoading, error } = useService(id);
  const { data: variants } = useVariants(id);

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
    </PageContainer>
  );
}
