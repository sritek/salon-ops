'use client';

/**
 * Branches Settings Page
 * List and edit branches
 */

import { useState, useCallback, useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, EmptyState } from '@/components/common';
import { useBranches, type Branch } from '@/hooks/queries/use-branches';
import { useAuthStore } from '@/stores/auth-store';
import { getBranchColumns } from './components/branch-columns';
import { BranchEditPanel } from './components/branch-edit-panel';

export default function BranchesPage() {
  const user = useAuthStore((state) => state.user);
  const branchIds = user?.branchIds || [];
  const role = user?.role;
  const { data: branches, isLoading } = useBranches(branchIds);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const canEdit = role === 'super_owner' || role === 'regional_manager';

  const handleEdit = useCallback((branch: Branch) => {
    setEditingBranch(branch);
  }, []);

  const columns = useMemo(
    () => getBranchColumns({ canEdit, onEdit: handleEdit }),
    [canEdit, handleEdit]
  );

  const emptyState = (
    <EmptyState
      icon={Building2}
      title="No branches"
      description="No branches found for your account."
    />
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Branches
          </CardTitle>
          <CardDescription>View and manage your business locations</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={branches || []}
            isLoading={isLoading}
            loadingRows={3}
            emptyState={emptyState}
          />
        </CardContent>
      </Card>

      {/* Edit Panel */}
      <BranchEditPanel
        branch={editingBranch}
        open={!!editingBranch}
        onClose={() => setEditingBranch(null)}
      />
    </div>
  );
}
