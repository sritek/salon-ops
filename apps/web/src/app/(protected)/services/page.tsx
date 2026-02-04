'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Scissors,
  Search,
  Trash2,
} from 'lucide-react';

import { PERMISSIONS } from '@salon-ops/shared';

import { useCategories } from '@/hooks/queries/use-categories';
import {
  useDeleteService,
  useDuplicateService,
  useServicesPaginated,
} from '@/hooks/queries/use-services';
import { useDebounce } from '@/hooks/use-debounce';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/format';

import {
  AccessDenied,
  EmptyState,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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

import type { ServiceFilters } from '@/types/services';

export default function ServicesPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [isActiveFilter, setIsActiveFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const debouncedSearch = useDebounce(search, 300);

  const filters: ServiceFilters = {
    page,
    limit,
    search: debouncedSearch || undefined,
    categoryId: categoryId !== 'all' ? categoryId : undefined,
    isActive: isActiveFilter === 'all' ? undefined : isActiveFilter === 'active',
    sortBy: 'displayOrder',
    sortOrder: 'asc',
  };

  const { data: servicesData, isLoading, error } = useServicesPaginated(filters);
  const { data: categories } = useCategories({ flat: true });
  const deleteService = useDeleteService();
  const duplicateService = useDuplicateService();

  const canWrite = hasPermission(PERMISSIONS.SERVICES_WRITE);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      await deleteService.mutateAsync(id);
    }
  };

  const handleDuplicate = async (id: string) => {
    await duplicateService.mutateAsync(id);
  };

  return (
    <PermissionGuard
      permission={PERMISSIONS.SERVICES_READ}
      fallback={<AccessDenied />}
    >
      <PageContainer>
        <PageHeader
          title="Services"
          description="Manage your salon services and pricing"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/services/categories">Categories</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/services/combos">Combos</Link>
              </Button>
              {canWrite && (
                <Button asChild>
                  <Link href="/services/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Service
                  </Link>
                </Button>
              )}
            </div>
          }
        />

      <PageContent>
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={isActiveFilter} onValueChange={setIsActiveFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Services Table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title="Error loading services"
            description="There was a problem loading your services. Please try again."
          />
        ) : !servicesData?.data || servicesData.data.length === 0 ? (
          <EmptyState
            icon={Scissors}
            title="No services found"
            description={
              search || categoryId !== 'all' || isActiveFilter !== 'all'
                ? 'Try adjusting your filters to find what you\'re looking for.'
                : 'Get started by creating your first service.'
            }
            action={
              !search && categoryId === 'all' && isActiveFilter === 'all' ? (
                <Button asChild>
                  <Link href="/services/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Service
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Service</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servicesData.data.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{service.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {service.sku}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {service.category && (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: service.category.color }}
                            />
                            <span className="text-sm">
                              {service.category.name}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(service.basePrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {service.durationMinutes} min
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge
                            variant={service.isActive ? 'default' : 'secondary'}
                          >
                            {service.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {service.isPopular && (
                            <Badge variant="outline">Popular</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/services/${service.id}`)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {canWrite && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(`/services/${service.id}?edit=true`)
                                  }
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDuplicate(service.id)}
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(service.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {servicesData.meta && servicesData.meta.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to{' '}
                  {Math.min(page * limit, servicesData.meta.total)} of{' '}
                  {servicesData.meta.total} services
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
                    disabled={page >= servicesData.meta.totalPages}
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
    </PermissionGuard>
  );
}
