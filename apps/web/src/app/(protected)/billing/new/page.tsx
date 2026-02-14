'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Search,
  Trash2,
  User,
  Percent,
  Package,
  AlertTriangle,
} from 'lucide-react';

import { PERMISSIONS } from '@salon-ops/shared';

import { useCreateInvoice, useQuickBill } from '@/hooks/queries/use-invoices';
import { useServices } from '@/hooks/queries/use-services';
import { useCustomers } from '@/hooks/queries/use-customers';
import { useProductsForBilling, type ProductForBilling } from '@/hooks/queries/use-inventory';
import { usePermissions } from '@/hooks/use-permissions';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency } from '@/lib/format';

import {
  AccessDenied,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
  LoadingSpinner,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import type { PaymentInput, PaymentMethod, InvoiceItemInput, DiscountType } from '@/types/billing';
import type { Service } from '@/types/services';
import type { Customer } from '@/types/customers';

const PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'card',
  'upi',
  'wallet',
  'bank_transfer',
  'cheque',
];

interface SelectedItem {
  id: string;
  service: Service;
  quantity: number;
}

interface SelectedProduct {
  id: string;
  product: ProductForBilling;
  quantity: number;
}

interface PaymentEntry {
  id: string;
  method: PaymentMethod;
  amount: string;
}

interface DiscountEntry {
  id: string;
  type: DiscountType;
  calculationType: 'percentage' | 'flat';
  value: string;
  reason: string;
}

const DISCOUNT_TYPES: { value: DiscountType; label: string }[] = [
  { value: 'manual', label: 'Manual Discount' },
  { value: 'coupon', label: 'Coupon Code' },
  { value: 'loyalty', label: 'Loyalty Discount' },
  { value: 'referral', label: 'Referral Discount' },
];

export default function NewInvoicePage() {
  const router = useRouter();
  const t = useTranslations('billing');
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission(PERMISSIONS.BILLS_WRITE);
  const { user } = useAuthStore();
  const branchId = user?.branchIds?.[0] || '';

  // Customer state
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);

  // Items state
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceOpen, setServiceOpen] = useState(false);

  // Product state
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productOpen, setProductOpen] = useState(false);

  // Payment state
  const [payments, setPayments] = useState<PaymentEntry[]>([
    { id: '1', method: 'cash', amount: '' },
  ]);

  // Discount state
  const [discounts, setDiscounts] = useState<DiscountEntry[]>([]);

  // Notes
  const [notes, setNotes] = useState('');

  const debouncedCustomerSearch = useDebounce(customerSearch, 300);
  const debouncedServiceSearch = useDebounce(serviceSearch, 300);
  const debouncedProductSearch = useDebounce(productSearch, 300);

  // Queries
  const { data: customersData, isLoading: customersLoading } = useCustomers({
    search: debouncedCustomerSearch || undefined,
    limit: 10,
  });

  const { data: servicesData, isLoading: servicesLoading } = useServices({
    search: debouncedServiceSearch || undefined,
    isActive: true,
    limit: 20,
  });

  const { data: productsData, isLoading: productsLoading } = useProductsForBilling(
    branchId,
    debouncedProductSearch || undefined
  );

  const createInvoice = useCreateInvoice();
  const quickBill = useQuickBill();

  const customers = customersData?.data || [];
  const services = servicesData?.data || [];
  const products = productsData || [];

  // Calculate totals
  const serviceSubtotal = selectedItems.reduce(
    (sum, item) => sum + item.service.basePrice * item.quantity,
    0
  );

  const productSubtotal = selectedProducts.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );

  const subtotal = serviceSubtotal + productSubtotal;

  // Calculate discount amount
  const discountAmount = discounts.reduce((sum, discount) => {
    const value = parseFloat(discount.value) || 0;
    if (discount.calculationType === 'percentage') {
      return sum + (subtotal * value) / 100;
    }
    return sum + value;
  }, 0);

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const taxRate = 0.18; // 18% GST
  const taxAmount = discountedSubtotal * taxRate;
  const grandTotal = discountedSubtotal + taxAmount;

  const totalPayment = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const amountDue = grandTotal - totalPayment;

  // Discount handlers
  const addDiscount = () => {
    setDiscounts([
      ...discounts,
      {
        id: Date.now().toString(),
        type: 'manual',
        calculationType: 'percentage',
        value: '',
        reason: '',
      },
    ]);
  };

  const removeDiscount = (id: string) => {
    setDiscounts(discounts.filter((d) => d.id !== id));
  };

  const updateDiscount = (id: string, field: keyof DiscountEntry, value: string) => {
    setDiscounts(discounts.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setCustomerOpen(false);
    setCustomerSearch('');
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
  };

  const handleAddService = (service: Service) => {
    const existing = selectedItems.find((item) => item.service.id === service.id);
    if (existing) {
      setSelectedItems(
        selectedItems.map((item) =>
          item.service.id === service.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setSelectedItems([...selectedItems, { id: Date.now().toString(), service, quantity: 1 }]);
    }
    setServiceOpen(false);
    setServiceSearch('');
  };

  const handleRemoveItem = (id: string) => {
    setSelectedItems(selectedItems.filter((item) => item.id !== id));
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedItems(selectedItems.map((item) => (item.id === id ? { ...item, quantity } : item)));
  };

  // Product handlers
  const handleAddProduct = (product: ProductForBilling) => {
    // Check stock availability
    if (product.availableStock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    const existing = selectedProducts.find((item) => item.product.id === product.id);
    if (existing) {
      // Check if adding more would exceed stock
      if (existing.quantity + 1 > product.availableStock) {
        toast.warning(`Only ${product.availableStock} units available for ${product.name}`);
        return;
      }
      setSelectedProducts(
        selectedProducts.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setSelectedProducts([
        ...selectedProducts,
        { id: Date.now().toString(), product, quantity: 1 },
      ]);
    }
    setProductOpen(false);
    setProductSearch('');
  };

  const handleRemoveProduct = (id: string) => {
    setSelectedProducts(selectedProducts.filter((item) => item.id !== id));
  };

  const handleUpdateProductQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    const item = selectedProducts.find((p) => p.id === id);
    if (item && quantity > item.product.availableStock) {
      toast.warning(`Only ${item.product.availableStock} units available for ${item.product.name}`);
      return;
    }
    setSelectedProducts(
      selectedProducts.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const addPayment = () => {
    setPayments([...payments, { id: Date.now().toString(), method: 'cash', amount: '' }]);
  };

  const removePayment = (id: string) => {
    if (payments.length > 1) {
      setPayments(payments.filter((p) => p.id !== id));
    }
  };

  const updatePayment = (id: string, field: 'method' | 'amount', value: string) => {
    setPayments(payments.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleCreateDraft = async () => {
    if (selectedItems.length === 0 && selectedProducts.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    if (!customerName) {
      toast.error('Please enter customer name');
      return;
    }

    try {
      const items: InvoiceItemInput[] = [
        ...selectedItems.map((item) => ({
          itemType: 'service' as const,
          referenceId: item.service.id,
          quantity: item.quantity,
        })),
        ...selectedProducts.map((item) => ({
          itemType: 'product' as const,
          referenceId: item.product.id,
          quantity: item.quantity,
        })),
      ];

      const discountInputs = discounts
        .filter((d) => parseFloat(d.value) > 0)
        .map((d) => ({
          discountType: d.type,
          calculationType: d.calculationType,
          calculationValue: parseFloat(d.value),
          appliedTo: 'subtotal' as const,
          reason: d.reason || undefined,
        }));

      const result = await createInvoice.mutateAsync({
        branchId: '', // Will be set from auth context on backend
        customerId: selectedCustomer?.id,
        customerName,
        customerPhone: customerPhone || undefined,
        items,
        discounts: discountInputs.length > 0 ? discountInputs : undefined,
        notes: notes || undefined,
      });

      toast.success('Invoice created as draft');
      router.push(`/billing/${result.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create invoice');
    }
  };

  const handleQuickBill = async () => {
    if (selectedItems.length === 0 && selectedProducts.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    if (!customerName) {
      toast.error('Please enter customer name');
      return;
    }

    const validPayments = payments.filter((p) => parseFloat(p.amount) > 0);
    if (validPayments.length === 0 || totalPayment < grandTotal) {
      toast.error('Please add full payment to finalize');
      return;
    }

    try {
      const items: InvoiceItemInput[] = [
        ...selectedItems.map((item) => ({
          itemType: 'service' as const,
          referenceId: item.service.id,
          quantity: item.quantity,
        })),
        ...selectedProducts.map((item) => ({
          itemType: 'product' as const,
          referenceId: item.product.id,
          quantity: item.quantity,
        })),
      ];

      const paymentInputs: PaymentInput[] = validPayments.map((p) => ({
        paymentMethod: p.method,
        amount: parseFloat(p.amount),
      }));

      const discountInputs = discounts
        .filter((d) => parseFloat(d.value) > 0)
        .map((d) => ({
          discountType: d.type,
          calculationType: d.calculationType,
          calculationValue: parseFloat(d.value),
          appliedTo: 'subtotal' as const,
          reason: d.reason || undefined,
        }));

      const result = await quickBill.mutateAsync({
        branchId: '',
        customerId: selectedCustomer?.id,
        customerName,
        customerPhone: customerPhone || undefined,
        items,
        payments: paymentInputs,
        discounts: discountInputs.length > 0 ? discountInputs : undefined,
        notes: notes || undefined,
      });

      toast.success('Invoice created and finalized');
      router.push(`/billing/${result.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create invoice');
    }
  };

  if (!canWrite) {
    return <AccessDenied />;
  }

  return (
    <PermissionGuard permission={PERMISSIONS.BILLS_WRITE} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title={t('form.title')}
          description={t('form.description')}
          actions={
            <Button variant="outline" onClick={() => router.push('/billing')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          }
        />

        <PageContent>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {t('form.customer')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedCustomer ? (
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <div className="font-medium">{selectedCustomer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedCustomer.phone}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleClearCustomer}>
                        Change
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <Search className="mr-2 h-4 w-4" />
                            {t('form.searchCustomer')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder={t('form.searchCustomer')}
                              value={customerSearch}
                              onValueChange={setCustomerSearch}
                            />
                            <CommandList>
                              {customersLoading ? (
                                <div className="p-4 text-center">
                                  <LoadingSpinner />
                                </div>
                              ) : customers.length === 0 ? (
                                <CommandEmpty>No customers found</CommandEmpty>
                              ) : (
                                <CommandGroup>
                                  {customers.map((customer) => (
                                    <CommandItem
                                      key={customer.id}
                                      onSelect={() => handleSelectCustomer(customer)}
                                    >
                                      <div>
                                        <div className="font-medium">{customer.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                          {customer.phone}
                                        </div>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      <div className="text-sm text-muted-foreground text-center">
                        {t('form.orEnterDetails')}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>{t('form.customerName')}</Label>
                          <Input
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Customer name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('form.customerPhone')}</Label>
                          <Input
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="Phone number"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Services Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('form.services')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Plus className="mr-2 h-4 w-4" />
                        {t('form.addService')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder={t('form.selectService')}
                          value={serviceSearch}
                          onValueChange={setServiceSearch}
                        />
                        <CommandList>
                          {servicesLoading ? (
                            <div className="p-4 text-center">
                              <LoadingSpinner />
                            </div>
                          ) : services.length === 0 ? (
                            <CommandEmpty>No services found</CommandEmpty>
                          ) : (
                            <CommandGroup>
                              {services.map((service) => (
                                <CommandItem
                                  key={service.id}
                                  onSelect={() => handleAddService(service)}
                                >
                                  <div className="flex justify-between w-full">
                                    <div>
                                      <div className="font-medium">{service.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {service.durationMinutes} min
                                      </div>
                                    </div>
                                    <div className="font-medium">
                                      {formatCurrency(service.basePrice)}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {selectedItems.length > 0 && (
                    <div className="space-y-2">
                      {selectedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 border rounded-md"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{item.service.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(item.service.basePrice)} each
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)
                              }
                              className="w-16 text-center"
                            />
                            <div className="w-24 text-right font-medium">
                              {formatCurrency(item.service.basePrice * item.quantity)}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Products Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {t('form.products')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Popover open={productOpen} onOpenChange={setProductOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Plus className="mr-2 h-4 w-4" />
                        {t('form.addProduct')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder={t('form.searchProduct')}
                          value={productSearch}
                          onValueChange={setProductSearch}
                        />
                        <CommandList>
                          {productsLoading ? (
                            <div className="p-4 text-center">
                              <LoadingSpinner />
                            </div>
                          ) : products.length === 0 ? (
                            <CommandEmpty>No products found</CommandEmpty>
                          ) : (
                            <CommandGroup>
                              {products.map((product) => (
                                <CommandItem
                                  key={product.id}
                                  onSelect={() => handleAddProduct(product)}
                                  disabled={product.availableStock <= 0}
                                  className={product.availableStock <= 0 ? 'opacity-50' : ''}
                                >
                                  <div className="flex justify-between w-full">
                                    <div>
                                      <div className="font-medium flex items-center gap-2">
                                        {product.name}
                                        {product.isLowStock && product.availableStock > 0 && (
                                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                                        )}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {product.sku || 'No SKU'} • Stock: {product.availableStock}
                                        {product.availableStock <= 0 && ' (Out of stock)'}
                                      </div>
                                    </div>
                                    <div className="font-medium">
                                      {formatCurrency(product.sellingPrice)}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {selectedProducts.length > 0 && (
                    <div className="space-y-2">
                      {selectedProducts.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 border rounded-md"
                        >
                          <div className="flex-1">
                            <div className="font-medium flex items-center gap-2">
                              {item.product.name}
                              {item.quantity > item.product.availableStock && (
                                <span className="text-xs text-red-500">
                                  (Exceeds stock: {item.product.availableStock})
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(item.product.sellingPrice)} each • Stock:{' '}
                              {item.product.availableStock}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              max={item.product.availableStock}
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateProductQuantity(item.id, parseInt(e.target.value) || 1)
                              }
                              className="w-16 text-center"
                            />
                            <div className="w-24 text-right font-medium">
                              {formatCurrency(item.product.sellingPrice * item.quantity)}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveProduct(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Percent className="h-5 w-5" />
                      Discounts
                    </span>
                    {discounts.length === 0 && (
                      <Button variant="outline" size="sm" onClick={addDiscount}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Discount
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {discounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No discounts applied
                    </p>
                  ) : (
                    <>
                      {discounts.map((discount) => (
                        <div key={discount.id} className="space-y-3 p-3 border rounded-md">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 space-y-2">
                              <Label>Discount Type</Label>
                              <Select
                                value={discount.type}
                                onValueChange={(value) =>
                                  updateDiscount(discount.id, 'type', value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {DISCOUNT_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeDiscount(discount.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Calculation</Label>
                              <Select
                                value={discount.calculationType}
                                onValueChange={(value) =>
                                  updateDiscount(discount.id, 'calculationType', value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                                  <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>
                                {discount.calculationType === 'percentage'
                                  ? 'Percentage'
                                  : 'Amount'}
                              </Label>
                              <Input
                                type="number"
                                step={discount.calculationType === 'percentage' ? '1' : '0.01'}
                                min="0"
                                max={discount.calculationType === 'percentage' ? '100' : undefined}
                                value={discount.value}
                                onChange={(e) =>
                                  updateDiscount(discount.id, 'value', e.target.value)
                                }
                                placeholder={
                                  discount.calculationType === 'percentage' ? '10' : '100'
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Reason (optional)</Label>
                            <Input
                              value={discount.reason}
                              onChange={(e) =>
                                updateDiscount(discount.id, 'reason', e.target.value)
                              }
                              placeholder="e.g., First visit discount"
                            />
                          </div>
                          {discount.value && (
                            <div className="text-sm text-right text-green-600 font-medium">
                              Discount: -
                              {formatCurrency(
                                discount.calculationType === 'percentage'
                                  ? (subtotal * (parseFloat(discount.value) || 0)) / 100
                                  : parseFloat(discount.value) || 0
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      <Button variant="outline" className="w-full" onClick={addDiscount}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Another Discount
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Payment */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('form.payment')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-end gap-3">
                      <div className="flex-1 space-y-2">
                        <Label>{t('form.paymentMethod')}</Label>
                        <Select
                          value={payment.method}
                          onValueChange={(value) => updatePayment(payment.id, 'method', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((method) => (
                              <SelectItem key={method} value={method}>
                                {t(`paymentMethods.${method}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>{t('form.amount')}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={payment.amount}
                          onChange={(e) => updatePayment(payment.id, 'amount', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      {payments.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePayment(payment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}

                  <Button type="button" variant="outline" className="w-full" onClick={addPayment}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('form.addPayment')}
                  </Button>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('form.notes')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes..."
                    rows={3}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Summary Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax (18%)</span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Grand Total</span>
                      <span>{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payment</span>
                      <span className="text-green-600">{formatCurrency(totalPayment)}</span>
                    </div>
                    {amountDue > 0 && (
                      <div className="flex justify-between text-sm font-medium text-red-600">
                        <span>Amount Due</span>
                        <span>{formatCurrency(amountDue)}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={handleQuickBill}
                      disabled={
                        quickBill.isPending ||
                        (selectedItems.length === 0 && selectedProducts.length === 0) ||
                        !customerName ||
                        amountDue > 0.01
                      }
                    >
                      {quickBill.isPending ? t('form.creating') : t('form.createAndFinalize')}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleCreateDraft}
                      disabled={
                        createInvoice.isPending ||
                        (selectedItems.length === 0 && selectedProducts.length === 0) ||
                        !customerName
                      }
                    >
                      {createInvoice.isPending ? t('form.creating') : t('form.create')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </PageContent>
      </PageContainer>
    </PermissionGuard>
  );
}
