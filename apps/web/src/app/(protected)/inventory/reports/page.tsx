'use client';

import { useState } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Package,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

import { useBranchContext } from '@/hooks/use-branch-context';
import {
  useStockSummary,
  useStockMovements,
  usePurchaseOrders,
} from '@/hooks/queries/use-inventory';
import { formatCurrency, formatDate } from '@/lib/format';

import { PageContainer, PageContent, PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

import { MOVEMENT_TYPE_LABELS } from '@/types/inventory';

type ReportType = 'valuation' | 'movements' | 'purchases' | 'expiry';

export default function InventoryReportsPage() {
  const { branchId } = useBranchContext();

  const [activeReport, setActiveReport] = useState<ReportType>('valuation');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fetch data based on active report
  const { data: stockData, isLoading: stockLoading } = useStockSummary(branchId || '', {
    limit: 100,
  });

  const { data: movementsData, isLoading: movementsLoading } = useStockMovements(branchId || '', {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: 100,
  });

  const { data: purchasesData, isLoading: purchasesLoading } = usePurchaseOrders(branchId || '', {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    status: ['fully_received', 'partially_received'],
    limit: 100,
  });

  // Calculate totals for valuation report
  const totalStockValue = stockData?.data?.reduce((sum, item) => sum + item.totalValue, 0) || 0;
  const totalQuantity = stockData?.data?.reduce((sum, item) => sum + item.quantityOnHand, 0) || 0;

  // Filter expired/near-expiry items
  const expiryItems =
    stockData?.data?.filter((item) => item.hasExpired || item.hasNearExpiry) || [];

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    // In a real implementation, this would call an API endpoint to generate the export
    console.log(`Exporting ${activeReport} report as ${format}`);
    alert(
      `Export to ${format.toUpperCase()} would be triggered here. This requires backend implementation.`
    );
  };

  const reportCards = [
    {
      id: 'valuation' as ReportType,
      title: 'Stock Valuation',
      description: 'Current stock levels and values',
      icon: Package,
    },
    {
      id: 'movements' as ReportType,
      title: 'Stock Movements',
      description: 'Track all stock transactions',
      icon: TrendingUp,
    },
    {
      id: 'purchases' as ReportType,
      title: 'Purchase Analysis',
      description: 'Analyze purchase patterns',
      icon: BarChart3,
    },
    {
      id: 'expiry' as ReportType,
      title: 'Expiry Report',
      description: 'Products nearing expiry',
      icon: AlertTriangle,
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Inventory Reports"
        description="Generate and export inventory reports"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleExport('csv')}>
              <FileText className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('excel')}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf')}>
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        }
      />

      <PageContent>
        {/* Report Type Selection */}
        <div className="grid gap-4 md:grid-cols-4">
          {reportCards.map((report) => (
            <Card
              key={report.id}
              className={`cursor-pointer transition-colors ${
                activeReport === report.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-muted-foreground/50'
              }`}
              onClick={() => setActiveReport(report.id)}
            >
              <CardHeader className="pb-2">
                <report.icon
                  className={`h-8 w-8 ${activeReport === report.id ? 'text-primary' : 'text-muted-foreground'}`}
                />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-base">{report.title}</CardTitle>
                <CardDescription className="text-sm">{report.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Date Filters */}
        {(activeReport === 'movements' || activeReport === 'purchases') && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date-from">From Date</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date-to">To Date</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Content */}
        <Card>
          <CardHeader>
            <CardTitle>{reportCards.find((r) => r.id === activeReport)?.title}</CardTitle>
            <CardDescription>
              {reportCards.find((r) => r.id === activeReport)?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeReport === 'valuation' && (
              <>
                {stockLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : (
                  <>
                    {/* Summary Cards */}
                    <div className="grid gap-4 md:grid-cols-3 mb-6">
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-muted-foreground">Total Products</p>
                          <p className="text-2xl font-bold">{stockData?.data?.length || 0}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-muted-foreground">Total Quantity</p>
                          <p className="text-2xl font-bold">{totalQuantity}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-muted-foreground">Total Value</p>
                          <p className="text-2xl font-bold">{formatCurrency(totalStockValue)}</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Valuation Table */}
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-center">Quantity</TableHead>
                            <TableHead className="text-right">Avg Cost</TableHead>
                            <TableHead className="text-right">Total Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stockData?.data?.map((item) => (
                            <TableRow key={item.productId}>
                              <TableCell className="font-medium">{item.productName}</TableCell>
                              <TableCell>{item.productSku || '-'}</TableCell>
                              <TableCell>{item.categoryName}</TableCell>
                              <TableCell className="text-center">
                                {item.quantityOnHand} {item.unitOfMeasure}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.averageCost)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(item.totalValue)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </>
            )}

            {activeReport === 'movements' && (
              <>
                {movementsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-center">Quantity</TableHead>
                          <TableHead className="text-center">Before</TableHead>
                          <TableHead className="text-center">After</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movementsData?.data?.map((movement) => (
                          <TableRow key={movement.id}>
                            <TableCell>{formatDate(movement.createdAt)}</TableCell>
                            <TableCell className="font-medium">{movement.productName}</TableCell>
                            <TableCell>{MOVEMENT_TYPE_LABELS[movement.movementType]}</TableCell>
                            <TableCell className="text-center">
                              <span
                                className={
                                  movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                                }
                              >
                                {movement.quantity > 0 ? '+' : ''}
                                {movement.quantity}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">{movement.quantityBefore}</TableCell>
                            <TableCell className="text-center">{movement.quantityAfter}</TableCell>
                            <TableCell>{movement.reason || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {activeReport === 'purchases' && (
              <>
                {purchasesLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PO Number</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="text-right">Tax</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchasesData?.data?.map((po) => (
                          <TableRow key={po.id}>
                            <TableCell className="font-mono">{po.poNumber}</TableCell>
                            <TableCell>{formatDate(po.orderDate)}</TableCell>
                            <TableCell className="font-medium">{po.vendor?.name || '-'}</TableCell>
                            <TableCell className="capitalize">
                              {po.status.replace('_', ' ')}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(po.subtotal)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(po.cgstAmount + po.sgstAmount + po.igstAmount)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(po.grandTotal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {activeReport === 'expiry' && (
              <>
                {stockLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : expiryItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No products with expiry concerns</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-center">Quantity</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-right">Value at Risk</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expiryItems.map((item) => (
                          <TableRow key={item.productId}>
                            <TableCell className="font-medium">{item.productName}</TableCell>
                            <TableCell>{item.productSku || '-'}</TableCell>
                            <TableCell>{item.categoryName}</TableCell>
                            <TableCell className="text-center">
                              {item.quantityOnHand} {item.unitOfMeasure}
                            </TableCell>
                            <TableCell className="text-center">
                              {item.hasExpired ? (
                                <span className="text-red-600 font-medium">Expired</span>
                              ) : (
                                <span className="text-yellow-600 font-medium">Near Expiry</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium text-red-600">
                              {formatCurrency(item.totalValue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </PageContent>
    </PageContainer>
  );
}
