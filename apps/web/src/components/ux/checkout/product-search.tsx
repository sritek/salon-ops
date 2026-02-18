'use client';

/**
 * Product Search Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 6.3
 *
 * Fuzzy search across products with one-click add to checkout.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { api } from '@/lib/api/client';
import { Search, Plus, Package, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

// ============================================
// Types
// ============================================

interface Product {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  category?: string;
  defaultSellingPrice: number;
  imageUrl?: string;
  stockQuantity?: number;
  isActive: boolean;
}

interface ProductSearchProps {
  onAddProduct: (productId: string, quantity?: number) => void;
  isAdding?: boolean;
  className?: string;
  placeholder?: string;
}

interface ProductItemProps {
  product: Product;
  onAdd: () => void;
  isAdding?: boolean;
}

// ============================================
// Product Item Component
// ============================================

function ProductItem({ product, onAdd, isAdding }: ProductItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors',
        'border-b last:border-0'
      )}
      onClick={onAdd}
    >
      {/* Product Image/Icon */}
      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-medium text-sm truncate">{product.name}</h4>
            {product.sku && <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>}
          </div>
          <p className="font-semibold text-sm flex-shrink-0">
            ₹{product.defaultSellingPrice.toFixed(2)}
          </p>
        </div>
        {product.category && (
          <Badge variant="outline" className="text-xs mt-1">
            {product.category}
          </Badge>
        )}
      </div>

      {/* Add Button */}
      <Button
        variant="ghost"
        size="icon"
        className="flex-shrink-0 h-8 w-8"
        disabled={isAdding}
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
      >
        {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      </Button>
    </div>
  );
}

// ============================================
// Loading Skeleton
// ============================================

function ProductSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="w-12 h-12 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-8 rounded-md" />
    </div>
  );
}

// ============================================
// Empty State
// ============================================

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center px-4">
      <Package className="h-10 w-10 text-muted-foreground mb-3" />
      <p className="text-sm font-medium">No products found</p>
      <p className="text-xs text-muted-foreground mt-1">
        {query ? `No products match "${query}"` : 'Start typing to search products'}
      </p>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function ProductSearch({
  onAddProduct,
  isAdding,
  className,
  placeholder = 'Search products...',
}: ProductSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  const debouncedQuery = useDebounce(query, 300);

  // Fetch products
  const { data, isLoading } = useQuery({
    queryKey: ['products', 'search', debouncedQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedQuery) {
        params.set('search', debouncedQuery);
      }
      params.set('limit', '20');
      params.set('isActive', 'true');

      const response = await api.get<{ data: Product[]; meta: any }>(
        `/products?${params.toString()}`
      );
      return response.data;
    },
    enabled: open,
    staleTime: 30000, // 30 seconds
  });

  // Handle add product
  const handleAddProduct = useCallback(
    async (productId: string) => {
      setAddingProductId(productId);
      try {
        await onAddProduct(productId, 1);
        // Clear search after adding
        setQuery('');
      } finally {
        setAddingProductId(null);
      }
    },
    [onAddProduct]
  );

  // Handle clear
  const handleClear = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  // Focus input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const products = data || [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('justify-start gap-2', className)}>
          <Search className="h-4 w-4" />
          <span>Add Product</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start" sideOffset={4}>
        {/* Search Input */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="pl-9 pr-9"
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[300px]">
          {isLoading ? (
            <div className="divide-y">
              <ProductSkeleton />
              <ProductSkeleton />
              <ProductSkeleton />
            </div>
          ) : products.length === 0 ? (
            <EmptyState query={debouncedQuery} />
          ) : (
            <div className="divide-y">
              {products.map((product) => (
                <ProductItem
                  key={product.id}
                  product={product}
                  onAdd={() => handleAddProduct(product.id)}
                  isAdding={addingProductId === product.id || isAdding}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {products.length > 0 && (
          <div className="p-2 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              {products.length} product{products.length !== 1 ? 's' : ''} found
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ============================================
// Inline Product Search (Alternative Layout)
// ============================================

interface InlineProductSearchProps extends ProductSearchProps {
  showResults?: boolean;
}

export function InlineProductSearch({
  onAddProduct,
  isAdding,
  className,
  placeholder = 'Search products to add...',
  showResults = true,
}: InlineProductSearchProps) {
  const [query, setQuery] = useState('');
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  // Debounce search query
  const debouncedQuery = useDebounce(query, 300);

  // Fetch products
  const { data, isLoading } = useQuery({
    queryKey: ['products', 'search', debouncedQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedQuery) {
        params.set('search', debouncedQuery);
      }
      params.set('limit', '10');
      params.set('isActive', 'true');

      const response = await api.get<{ data: Product[]; meta: any }>(
        `/products?${params.toString()}`
      );
      return response.data;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  });

  // Handle add product
  const handleAddProduct = useCallback(
    async (productId: string) => {
      setAddingProductId(productId);
      try {
        await onAddProduct(productId, 1);
        setQuery('');
      } finally {
        setAddingProductId(null);
      }
    },
    [onAddProduct]
  );

  const products = data || [];
  const showProductList = showResults && debouncedQuery.length >= 2;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>

      {/* Results */}
      {showProductList && (
        <div className="rounded-lg border">
          {isLoading ? (
            <div className="divide-y">
              <ProductSkeleton />
              <ProductSkeleton />
            </div>
          ) : products.length === 0 ? (
            <EmptyState query={debouncedQuery} />
          ) : (
            <div className="divide-y max-h-[200px] overflow-y-auto">
              {products.map((product) => (
                <ProductItem
                  key={product.id}
                  product={product}
                  onAdd={() => handleAddProduct(product.id)}
                  isAdding={addingProductId === product.id || isAdding}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
