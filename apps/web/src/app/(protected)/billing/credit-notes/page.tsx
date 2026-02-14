'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import Link from 'next/link';
import { FileText, Plus, Eye, ArrowLeft } from 'lucide-react';
import { PageContainer, PageHeader, PageContent, EmptyState } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreditNotes } from '@/hooks/queries/use-invoices';
import { formatCurrency } from '@/lib/format';
import type { CreditNote, CreditNoteStatus } from '@/types/billing';

function StatusBadge({ status }: { status: CreditNoteStatus }) {
  const variants: Record<CreditNoteStatus, 'default' | 'secondary' | 'destructive'> = {
    pending: 'secondary',
    issued: 'default',
    cancelled: 'destructive',
  };
  const labels: Record<CreditNoteStatus, string> = {
    pending: 'Pending',
    issued: 'Issued',
    cancelled: 'Cancelled',
  };
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}

function RefundMethodBadge({ method }: { method: string }) {
  const labels: Record<string, string> = {
    original_method: 'Original Method',
    wallet: 'Wallet',
    cash: 'Cash',
  };
  return <Badge variant="outline">{labels[method] || method}</Badge>;
}

export default function CreditNotesPage() {
  const t = useTranslations('billing');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: creditNotes, isLoading } = useCreditNotes({
    page,
    limit: 20,
  });

  const filteredNotes = creditNotes?.data?.filter((note: CreditNote) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      note.creditNoteNumber?.toLowerCase().includes(searchLower) ||
      note.customerName?.toLowerCase().includes(searchLower) ||
      note.originalInvoiceNumber?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <PageContainer>
      <PageHeader
        title={t('creditNotes')}
        description={t('creditNotesDescription')}
        actions={
          <Link href="/billing">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('detail.backToList')}
            </Button>
          </Link>
        }
      />

      <PageContent>
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Input
                placeholder="Search by credit note #, customer, or invoice..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !filteredNotes?.length ? (
              <div className="p-6">
                <EmptyState
                  icon={FileText}
                  title="No credit notes found"
                  description="Credit notes will appear here when you issue refunds."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Credit Note #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Original Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Refund Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotes.map((note: CreditNote) => (
                    <TableRow key={note.id}>
                      <TableCell className="font-medium">{note.creditNoteNumber}</TableCell>
                      <TableCell>{format(new Date(note.createdAt), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <Link
                          href={`/billing/${note.originalInvoiceId}`}
                          className="text-primary hover:underline"
                        >
                          {note.originalInvoiceNumber || '-'}
                        </Link>
                      </TableCell>
                      <TableCell>{note.customerName}</TableCell>
                      <TableCell>
                        <RefundMethodBadge method={note.refundMethod} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(note.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={note.status} />
                      </TableCell>
                      <TableCell>
                        <Link href={`/billing/credit-notes/${note.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {creditNotes?.meta && creditNotes.meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, creditNotes.meta.total)} of{' '}
              {creditNotes.meta.total}
            </p>
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
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= creditNotes.meta.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </PageContent>
    </PageContainer>
  );
}
