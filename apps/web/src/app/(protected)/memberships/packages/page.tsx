/**
 * Packages List Page
 * Displays all packages with CRUD operations
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Gift, Pencil, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  PageHeader,
  PageContent,
  EmptyState,
  LoadingSpinner,
  SearchInput,
  StatusBadge,
  ActionMenu,
} from '@/components/common';
import { usePackages, useDeletePackage } from '@/hooks/queries/use-memberships';
import { formatCurrency } from '@/lib/format';
import type { PackageType, PackageFilters } from '@/types/memberships';
import { PACKAGE_TYPE_LABELS, VALIDITY_UNIT_LABELS } from '@/types/memberships';

export default function PackagesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [packageType, setPackageType] = useState<PackageType | 'all'>('all');
  const [isActive, setIsActive] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeletePackage();

  const filters: PackageFilters = {
    page,
    limit: 20,
    search: search || undefined,
    packageType: packageType !== 'all' ? packageType : undefined,
    isActive: isActive !== 'all' ? isActive === 'true' : undefined,
    sortBy: 'displayOrder',
    sortOrder: 'asc',
  };

  const { data, isLoading, error } = usePackages(filters);

  const packages = data?.data ?? [];
  const meta = data?.meta;

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Package deleted');
      setDeleteId(null);
    } catch {
      toast.error('Failed to delete package');
    }
  };

  if (error) {
    return (
      <PageContent>
        <EmptyState
          icon={Gift}
          title="Error loading packages"
          description="There was a problem loading packages. Please try again."
        />
      </PageContent>
    );
  }

  return (
    <>
      <PageHeader
        title="Packages"
        description="Configure service packages and bundles"
        actions={
          <Button onClick={() => router.push('/memberships/packages/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Package
          </Button>
        }
      />

      <PageContent>
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search packages..."
            className="flex-1"
          />
          <Select
            value={packageType}
            onValueChange={(v) => setPackageType(v as PackageType | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(PACKAGE_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={isActive}
            onValueChange={(v) => setIsActive(v as 'all' | 'true' | 'false')}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : packages.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No packages found"
            description={
              search || packageType !== 'all' || isActive !== 'all'
                ? 'Try adjusting your filters.'
                : 'Create your first package to get started.'
            }
            action={
              !search && packageType === 'all' && isActive === 'all' ? (
                <Button onClick={() => router.push('/memberships/packages/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Package
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
                    <TableHead>Package Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Value/Services</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Sold</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-purple-500" />
                          <div>
                            <div className="font-medium">{pkg.name}</div>
                            {pkg.code && (
                              <div className="text-sm text-muted-foreground">{pkg.code}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={pkg.packageType}
                          label={PACKAGE_TYPE_LABELS[pkg.packageType]}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{formatCurrency(pkg.price)}</div>
                          {pkg.mrp && pkg.mrp > pkg.price && (
                            <div className="text-sm text-muted-foreground line-through">
                              {formatCurrency(pkg.mrp)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {pkg.packageType === 'value_package' ? (
                          <span>{formatCurrency(pkg.creditValue ?? 0)} credit</span>
                        ) : (
                          <span>{pkg.services?.length ?? 0} services</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {pkg.validityValue} {VALIDITY_UNIT_LABELS[pkg.validityUnit]}
                      </TableCell>
                      <TableCell>{pkg._count?.customerPackages ?? 0}</TableCell>
                      <TableCell>
                        <StatusBadge status={pkg.isActive ? 'active' : 'inactive'} />
                      </TableCell>
                      <TableCell>
                        <ActionMenu
                          items={[
                            {
                              label: 'View Details',
                              icon: Eye,
                              onClick: () => router.push(`/memberships/packages/${pkg.id}`),
                            },
                            {
                              label: 'Edit',
                              icon: Pencil,
                              onClick: () => router.push(`/memberships/packages/${pkg.id}/edit`),
                            },
                            {
                              label: 'Delete',
                              icon: Trash2,
                              onClick: () => setDeleteId(pkg.id),
                              variant: 'destructive',
                              separator: true,
                            },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, meta.total)} of {meta.total}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    disabled={page === meta.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </PageContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this package? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
