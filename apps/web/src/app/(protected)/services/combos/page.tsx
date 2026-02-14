'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, Gift, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useCombos, useDeleteCombo } from '@/hooks/queries/use-combos';
import { formatCurrency } from '@/lib/format';

import {
  ActionMenu,
  ConfirmDialog,
  EmptyState,
  PageContainer,
  PageContent,
  PageHeader,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function CombosPage() {
  const router = useRouter();
  const t = useTranslations('common');
  const { data: combos, isLoading } = useCombos(true);
  const deleteCombo = useDeleteCombo();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteCombo.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Combo Services"
        description="Bundled service packages at discounted prices"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/services">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Services
              </Link>
            </Button>
            <Button asChild>
              <Link href="/services/combos/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Combo
              </Link>
            </Button>
          </div>
        }
      />

      <PageContent>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : !combos || combos.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No combos"
            description="Create combo packages to offer bundled services at discounted prices."
            action={
              <Button asChild>
                <Link href="/services/combos/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Combo
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {combos.map((combo) => {
              const savings = combo.originalPrice - combo.comboPrice;
              const savingsPercent = Math.round((savings / combo.originalPrice) * 100);

              return (
                <Card key={combo.id} className="group relative">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex-1">
                      <CardTitle className="line-clamp-1">{combo.name}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">{combo.sku}</p>
                    </div>

                    <ActionMenu
                      items={[
                        {
                          label: 'View Details',
                          icon: Eye,
                          onClick: () => router.push(`/services/combos/${combo.id}`),
                        },
                        {
                          label: 'Edit',
                          icon: Pencil,
                          onClick: () => router.push(`/services/combos/${combo.id}?edit=true`),
                        },
                        {
                          label: 'Delete',
                          icon: Trash2,
                          onClick: () => handleDelete(combo.id),
                          variant: 'destructive',
                          separator: true,
                        },
                      ]}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <span className="sr-only">Open menu</span>
                        </Button>
                      }
                    />
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Services */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Includes:</p>
                      <div className="space-y-1">
                        {combo.items.slice(0, 3).map((item) => (
                          <p key={item.id} className="text-sm line-clamp-1">
                            {item.quantity > 1 && `${item.quantity}x `}
                            {item.service.name}
                          </p>
                        ))}
                        {combo.items.length > 3 && (
                          <p className="text-sm text-muted-foreground">
                            +{combo.items.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground line-through">
                          {formatCurrency(combo.originalPrice)}
                        </p>
                        <p className="text-2xl font-bold">{formatCurrency(combo.comboPrice)}</p>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        Save {savingsPercent}%
                      </Badge>
                    </div>

                    {/* Status */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={combo.isActive ? 'default' : 'secondary'}>
                        {combo.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {combo.isFeatured && <Badge variant="outline">Featured</Badge>}
                      <Badge variant="outline">{combo.totalDurationMinutes} min</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </PageContent>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('confirmDelete.title')}
        description={t('confirmDelete.description')}
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteCombo.isPending}
      />
    </PageContainer>
  );
}
