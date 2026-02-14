/**
 * Membership Plans List Page
 * Displays all membership plans with CRUD operations
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Crown, Pencil, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  ActionMenu,
} from '@/components/common';
import { useMembershipPlans, useDeleteMembershipPlan } from '@/hooks/queries/use-memberships';
import { formatCurrency } from '@/lib/format';
import type { MembershipTier, MembershipPlanFilters } from '@/types/memberships';
import { MEMBERSHIP_TIER_LABELS, VALIDITY_UNIT_LABELS } from '@/types/memberships';

const tierColors: Record<MembershipTier, string> = {
  silver: 'bg-gray-100 text-gray-800',
  gold: 'bg-amber-100 text-amber-800',
  platinum: 'bg-purple-100 text-purple-800',
};

export default function MembershipPlansPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState<MembershipTier | 'all'>('all');
  const [isActive, setIsActive] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeleteMembershipPlan();

  const filters: MembershipPlanFilters = {
    page,
    limit: 20,
    search: search || undefined,
    tier: tier !== 'all' ? tier : undefined,
    isActive: isActive !== 'all' ? isActive === 'true' : undefined,
    sortBy: 'displayOrder',
    sortOrder: 'asc',
  };

  const { data, isLoading, error } = useMembershipPlans(filters);

  const plans = data?.data ?? [];
  const meta = data?.meta;

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Membership plan deleted');
      setDeleteId(null);
    } catch {
      toast.error('Failed to delete membership plan');
    }
  };

  if (error) {
    return (
      <PageContent>
        <EmptyState
          icon={Crown}
          title="Error loading plans"
          description="There was a problem loading membership plans. Please try again."
        />
      </PageContent>
    );
  }

  return (
    <>
      <PageHeader
        title="Membership Plans"
        description="Configure membership plans and benefits"
        actions={
          <Button onClick={() => router.push('/memberships/plans/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Plan
          </Button>
        }
      />

      <PageContent>
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search plans..."
            className="flex-1"
          />
          <Select value={tier} onValueChange={(v) => setTier(v as MembershipTier | 'all')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              {Object.entries(MEMBERSHIP_TIER_LABELS).map(([value, label]) => (
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
        ) : plans.length === 0 ? (
          <EmptyState
            icon={Crown}
            title="No membership plans found"
            description={
              search || tier !== 'all' || isActive !== 'all'
                ? 'Try adjusting your filters.'
                : 'Create your first membership plan to get started.'
            }
            action={
              !search && tier === 'all' && isActive === 'all' ? (
                <Button onClick={() => router.push('/memberships/plans/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Plan
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
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Benefits</TableHead>
                    <TableHead>Sold</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-amber-500" />
                          <div>
                            <div className="font-medium">{plan.name}</div>
                            {plan.code && (
                              <div className="text-sm text-muted-foreground">{plan.code}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {plan.tier ? (
                          <Badge className={tierColors[plan.tier]}>
                            {MEMBERSHIP_TIER_LABELS[plan.tier]}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(plan.price)}</TableCell>
                      <TableCell>
                        {plan.validityValue} {VALIDITY_UNIT_LABELS[plan.validityUnit]}
                      </TableCell>
                      <TableCell>{plan.benefits?.length ?? 0} benefits</TableCell>
                      <TableCell>{plan._count?.customerMemberships ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                          {plan.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ActionMenu
                          items={[
                            {
                              label: 'View Details',
                              icon: Eye,
                              onClick: () => router.push(`/memberships/plans/${plan.id}`),
                            },
                            {
                              label: 'Edit',
                              icon: Pencil,
                              onClick: () => router.push(`/memberships/plans/${plan.id}/edit`),
                            },
                            {
                              label: 'Delete',
                              icon: Trash2,
                              onClick: () => setDeleteId(plan.id),
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
            <AlertDialogTitle>Delete Membership Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this membership plan? This action cannot be undone.
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
