'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  FileText,
  ShoppingCart,
  Truck,
} from 'lucide-react';

import { useStockMovements, useProducts } from '@/hooks/queries/use-inventory';
import { useBranchContext } from '@/hooks/use-branch-context';
import { formatDate } from '@/lib/format';

import {
  EmptyState,
  PageContainer,
  PageContent,
  PageHeader,
  SearchInput,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

import type { MovementFilters, MovementType } from '@/types/inventory';
import { MOVEMENT_TYPE_LABELS } from '@/types/inventory';

const movementIcons: Record<MovementType, React.ReactNode> = {
  receipt: <ArrowDownRight className="h-4 w-4 text-green-600" />,
  consumption: <ArrowUpRight className="h-4 w-4 text-orange-600" />,
  transfer_out: <Truck className="h-4 w-4 text-blue-600" />,
  transfer_in: <Truck className="h-4 w-4 text-green-600" />,
  adjustment: <ArrowRight className="h-4 w-4 text-purple-600" />,
  wastage: <AlertCircle className="h-4 w-4 text-red-600" />,
  sale: <ShoppingCart className="h-4 w-4 text-blue-600" />,
};

const movementVariants: Record<MovementType, 'default' | 'secondary' | 'destructive' | 'outline'> =
  {
    receipt: 'default',
    consumption: 'secondary',
    transfer_out: 'outline',
    transfer_in: 'default',
    adjustment: 'secondary',
    wastage: 'destructive',
    sale: 'outline',
  };

export default function StockMovementsPage() {
  const { branchId } = useBranchContext();

  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const filters: MovementFilters = {
    page,
    limit,
    productId: productFilter !== 'all' ? productFilter : undefined,
    movementType: typeFilter !== 'all' ? (typeFilter as MovementType) : undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };

  const { data: movementsData, isLoading, error } = useStockMovements(branchId || '', filters);
  const { data: productsData } = useProducts({ limit: 100, isActive: true });

  // Filter products by search
  const filteredProducts = productsData?.data.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageContainer>
      <PageHeader
        title="Stock Movements"
        description="View all stock movement history"
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
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search products..."
            className="flex-1 max-w-sm"
          />

          <div className="flex flex-wrap gap-2">
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {filteredProducts?.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Movements Table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title="Error loading movements"
            description="There was an error loading the stock movements. Please try again."
          />
        ) : !movementsData?.data || movementsData.data.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No movements found"
            description={
              productFilter !== 'all' || typeFilter !== 'all'
                ? 'No movements match your filters.'
                : 'No stock movements recorded yet.'
            }
          />
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-center">Before</TableHead>
                    <TableHead className="text-center">After</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementsData.data.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(new Date(movement.createdAt), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{movement.productName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={movementVariants[movement.movementType]} className="gap-1">
                          {movementIcons[movement.movementType]}
                          {MOVEMENT_TYPE_LABELS[movement.movementType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={
                            movement.movementType === 'receipt' ||
                            movement.movementType === 'transfer_in' ||
                            (movement.movementType === 'adjustment' && movement.quantity > 0)
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {movement.movementType === 'receipt' ||
                          movement.movementType === 'transfer_in'
                            ? '+'
                            : '-'}
                          {Math.abs(movement.quantity)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {movement.quantityBefore}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {movement.quantityAfter}
                      </TableCell>
                      <TableCell>
                        {movement.referenceType && movement.referenceId ? (
                          <span className="text-xs text-muted-foreground">
                            {movement.referenceType}: {movement.referenceId.slice(0, 8)}...
                          </span>
                        ) : movement.reason ? (
                          <span className="text-xs text-muted-foreground">{movement.reason}</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {movement.createdByName || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {movementsData.meta && movementsData.meta.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to{' '}
                  {Math.min(page * limit, movementsData.meta.total)} of {movementsData.meta.total}{' '}
                  movements
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= movementsData.meta.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </PageContent>
    </PageContainer>
  );
}
