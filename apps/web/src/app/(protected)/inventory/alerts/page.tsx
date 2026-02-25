'use client';

import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  Calendar,
  Eye,
  Package,
} from 'lucide-react';

import { useStockAlerts } from '@/hooks/queries/use-inventory';
import { useBranchContext } from '@/hooks/use-branch-context';
import { formatDate } from '@/lib/format';

import { EmptyState, PageContainer, PageContent, PageHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

import type { StockAlert } from '@/types/inventory';

export default function StockAlertsPage() {
  const { branchId } = useBranchContext();

  const { data: alerts, isLoading, error } = useStockAlerts(branchId || '');

  // Group alerts by type
  const lowStockAlerts = alerts?.filter((a) => a.type === 'low_stock') || [];
  const nearExpiryAlerts = alerts?.filter((a) => a.type === 'near_expiry') || [];
  const expiredAlerts = alerts?.filter((a) => a.type === 'expired') || [];

  const totalAlerts = alerts?.length || 0;

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader
          title={<Skeleton className="h-8 w-48" />}
          description={<Skeleton className="h-4 w-64" />}
        />
        <PageContent>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </PageContent>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <PageHeader title="Stock Alerts" />
        <PageContent>
          <EmptyState
            icon={AlertCircle}
            title="Error loading alerts"
            description="There was an error loading the stock alerts. Please try again."
            action={
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            }
          />
        </PageContent>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Stock Alerts"
        description={`${totalAlerts} alert${totalAlerts !== 1 ? 's' : ''} requiring attention`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/inventory/stock">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Stock
            </Link>
          </Button>
        }
      />

      <PageContent>
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className={lowStockAlerts.length > 0 ? 'border-red-200 bg-red-50' : ''}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-red-600" />
                Low Stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{lowStockAlerts.length}</p>
              <p className="text-xs text-muted-foreground">Products below reorder level</p>
            </CardContent>
          </Card>

          <Card className={nearExpiryAlerts.length > 0 ? 'border-yellow-200 bg-yellow-50' : ''}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-yellow-600" />
                Near Expiry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{nearExpiryAlerts.length}</p>
              <p className="text-xs text-muted-foreground">Batches expiring within 30 days</p>
            </CardContent>
          </Card>

          <Card className={expiredAlerts.length > 0 ? 'border-red-200 bg-red-50' : ''}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Expired
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{expiredAlerts.length}</p>
              <p className="text-xs text-muted-foreground">Batches past expiry date</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Tabs */}
        {totalAlerts === 0 ? (
          <EmptyState
            icon={Package}
            title="No alerts"
            description="All stock levels are healthy and no items are near expiry."
          />
        ) : (
          <Tabs defaultValue="low_stock" className="space-y-4">
            <TabsList>
              <TabsTrigger value="low_stock" className="gap-2">
                <ArrowDownRight className="h-4 w-4" />
                Low Stock
                {lowStockAlerts.length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {lowStockAlerts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="near_expiry" className="gap-2">
                <Calendar className="h-4 w-4" />
                Near Expiry
                {nearExpiryAlerts.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {nearExpiryAlerts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="expired" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Expired
                {expiredAlerts.length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {expiredAlerts.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="low_stock">
              <LowStockTable alerts={lowStockAlerts} />
            </TabsContent>

            <TabsContent value="near_expiry">
              <ExpiryTable alerts={nearExpiryAlerts} isExpired={false} />
            </TabsContent>

            <TabsContent value="expired">
              <ExpiryTable alerts={expiredAlerts} isExpired={true} />
            </TabsContent>
          </Tabs>
        )}
      </PageContent>
    </PageContainer>
  );
}

function LowStockTable({ alerts }: { alerts: StockAlert[] }) {
  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No low stock alerts"
        description="All products are above their reorder levels."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Low Stock Products</CardTitle>
        <CardDescription>Products that have fallen below their reorder level</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Current Stock</TableHead>
                <TableHead className="text-center">Reorder Level</TableHead>
                <TableHead className="text-center">Shortage</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => {
                const shortage = (alert.reorderLevel || 0) - (alert.currentQuantity || 0);
                return (
                  <TableRow key={`${alert.productId}-low`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{alert.productName}</p>
                        {alert.productSku && (
                          <p className="text-xs text-muted-foreground font-mono">
                            {alert.productSku}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-red-600 font-medium">
                      {alert.currentQuantity}
                    </TableCell>
                    <TableCell className="text-center">{alert.reorderLevel}</TableCell>
                    <TableCell className="text-center text-red-600">-{shortage}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/inventory/stock/${alert.productId}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ExpiryTable({ alerts, isExpired }: { alerts: StockAlert[]; isExpired: boolean }) {
  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title={isExpired ? 'No expired batches' : 'No near-expiry batches'}
        description={
          isExpired
            ? 'No stock batches have expired.'
            : 'No stock batches are expiring within 30 days.'
        }
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {isExpired ? 'Expired Batches' : 'Near Expiry Batches'}
        </CardTitle>
        <CardDescription>
          {isExpired
            ? 'Stock batches that have passed their expiry date'
            : 'Stock batches expiring within 30 days'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead className="text-center">
                  {isExpired ? 'Days Expired' : 'Days Left'}
                </TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={`${alert.productId}-${alert.batchId}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{alert.productName}</p>
                      {alert.productSku && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {alert.productSku}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {alert.batchNumber || alert.batchId?.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    {alert.expiryDate ? (
                      <span className={isExpired ? 'text-red-600' : 'text-yellow-600'}>
                        {formatDate(new Date(alert.expiryDate))}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {alert.daysUntilExpiry !== undefined && (
                      <Badge variant={isExpired ? 'destructive' : 'secondary'}>
                        {isExpired
                          ? `${Math.abs(alert.daysUntilExpiry)} days ago`
                          : `${alert.daysUntilExpiry} days`}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/inventory/stock/${alert.productId}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
