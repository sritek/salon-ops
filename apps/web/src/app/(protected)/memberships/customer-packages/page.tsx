/**
 * Customer Packages List Page
 * Displays all customer packages with filtering and actions
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Plus, Gift, Calendar, User } from 'lucide-react';

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
import { Progress } from '@/components/ui/progress';
import {
  PageHeader,
  PageContent,
  EmptyState,
  LoadingSpinner,
  SearchInput,
  StatusBadge,
} from '@/components/common';
import { useCustomerPackages } from '@/hooks/queries/use-memberships';
import type { PackageStatus, PackageType, CustomerPackageFilters } from '@/types/memberships';
import { PACKAGE_STATUS_LABELS, PACKAGE_TYPE_LABELS } from '@/types/memberships';

export default function CustomerPackagesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PackageStatus | 'all'>('all');
  const [packageType, setPackageType] = useState<PackageType | 'all'>('all');
  const [page, setPage] = useState(1);

  const filters: CustomerPackageFilters = {
    page,
    limit: 20,
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    packageType: packageType !== 'all' ? packageType : undefined,
    sortBy: 'purchaseDate',
    sortOrder: 'desc',
  };

  const { data, isLoading, error } = useCustomerPackages(filters);

  const packages = data?.data ?? [];
  const meta = data?.meta;

  // Calculate usage percentage for value packages
  const getUsagePercentage = (pkg: (typeof packages)[0]) => {
    if (pkg.package?.packageType === 'value_package' && pkg.initialCreditValue) {
      const used = pkg.initialCreditValue - (pkg.remainingCreditValue ?? 0);
      return Math.round((used / pkg.initialCreditValue) * 100);
    }
    // For service packages, calculate from redemptions
    if (pkg.credits && pkg.credits.length > 0) {
      const totalInitial = pkg.credits.reduce((sum, c) => sum + c.initialCredits, 0);
      const totalRemaining = pkg.credits.reduce((sum, c) => sum + c.remainingCredits, 0);
      if (totalInitial > 0) {
        return Math.round(((totalInitial - totalRemaining) / totalInitial) * 100);
      }
    }
    return 0;
  };

  if (error) {
    return (
      <PageContent>
        <EmptyState
          icon={Gift}
          title="Error loading packages"
          description="There was a problem loading customer packages. Please try again."
        />
      </PageContent>
    );
  }

  return (
    <>
      <PageHeader
        title="Customer Packages"
        description="Manage customer packages and credits"
        actions={
          <Button onClick={() => router.push('/memberships/sell-package')}>
            <Plus className="mr-2 h-4 w-4" />
            Sell Package
          </Button>
        }
      />

      <PageContent>
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by package number, customer..."
            className="flex-1"
          />
          <Select value={status} onValueChange={(v) => setStatus(v as PackageStatus | 'all')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(PACKAGE_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : packages.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No customer packages found"
            description={
              search || status !== 'all' || packageType !== 'all'
                ? 'Try adjusting your filters.'
                : 'Sell your first package to get started.'
            }
            action={
              !search && status === 'all' && packageType === 'all' ? (
                <Button onClick={() => router.push('/memberships/sell-package')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Sell Package
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
                    <TableHead>Package #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => {
                    const usagePercent = getUsagePercentage(pkg);
                    return (
                      <TableRow
                        key={pkg.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/memberships/customer-packages/${pkg.id}`)}
                      >
                        <TableCell className="font-medium">{pkg.packageNumber}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{pkg.customer?.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {pkg.customer?.phone}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Gift className="h-4 w-4 text-purple-500" />
                            <div>
                              <div className="font-medium">{pkg.package?.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {pkg.package?.packageType &&
                                  PACKAGE_TYPE_LABELS[pkg.package.packageType]}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(pkg.purchaseDate), 'dd MMM yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>{format(new Date(pkg.expiryDate), 'dd MMM yyyy')}</TableCell>
                        <TableCell>
                          <div className="w-24">
                            <div className="mb-1 flex justify-between text-xs">
                              <span>{usagePercent}% used</span>
                            </div>
                            <Progress value={usagePercent} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={pkg.status}
                            label={PACKAGE_STATUS_LABELS[pkg.status]}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
    </>
  );
}
