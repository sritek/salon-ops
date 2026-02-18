'use client';

/**
 * Empty State Suggestions Component
 * Shows alternative searches and filter adjustments when no results
 * Requirements: 12.10
 */

import { Search, Filter, RotateCcw, Lightbulb } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Suggestion {
  type: 'search' | 'filter' | 'action';
  label: string;
  description?: string;
  onClick: () => void;
}

interface EmptyStateSuggestionsProps {
  /** The search query that returned no results */
  searchQuery?: string;
  /** Active filters that may be limiting results */
  activeFilters?: Array<{ label: string; value: string }>;
  /** Suggested alternative searches */
  searchSuggestions?: string[];
  /** Callback when a search suggestion is clicked */
  onSearchSuggestion?: (query: string) => void;
  /** Callback to clear all filters */
  onClearFilters?: () => void;
  /** Callback to broaden date range */
  onBroadenDateRange?: () => void;
  /** Custom suggestions */
  customSuggestions?: Suggestion[];
  /** Title for the empty state */
  title?: string;
  /** Description for the empty state */
  description?: string;
  /** Additional class names */
  className?: string;
}

export function EmptyStateSuggestions({
  searchQuery,
  activeFilters = [],
  searchSuggestions = [],
  onSearchSuggestion,
  onClearFilters,
  onBroadenDateRange,
  customSuggestions = [],
  title = 'No results found',
  description,
  className,
}: EmptyStateSuggestionsProps) {
  const hasFilters = activeFilters.length > 0;
  const hasSearchQuery = !!searchQuery?.trim();
  const hasSuggestions =
    searchSuggestions.length > 0 ||
    hasFilters ||
    onBroadenDateRange ||
    customSuggestions.length > 0;

  // Generate default description if not provided
  const defaultDescription = hasSearchQuery
    ? `We couldn't find anything matching "${searchQuery}"`
    : hasFilters
      ? 'No items match your current filters'
      : 'There are no items to display';

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="rounded-full bg-muted p-4 mb-4">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>

      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description || defaultDescription}</p>

      {hasSuggestions && (
        <div className="space-y-4 w-full max-w-md">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lightbulb className="h-4 w-4" />
            <span>Try these suggestions:</span>
          </div>

          <div className="space-y-2">
            {/* Search suggestions */}
            {searchSuggestions.length > 0 && onSearchSuggestion && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground text-left">Alternative searches:</p>
                <div className="flex flex-wrap gap-2">
                  {searchSuggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => onSearchSuggestion(suggestion)}
                    >
                      <Search className="h-3 w-3" />
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Filter adjustments */}
            {hasFilters && onClearFilters && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground text-left">Filter adjustments:</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-1" onClick={onClearFilters}>
                    <RotateCcw className="h-3 w-3" />
                    Clear all filters
                  </Button>
                  {activeFilters.slice(0, 3).map((filter, index) => (
                    <Button
                      key={`${filter.label}-${index}`}
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground"
                    >
                      <Filter className="h-3 w-3" />
                      Remove {filter.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Date range suggestion */}
            {onBroadenDateRange && (
              <Button variant="outline" size="sm" className="gap-1" onClick={onBroadenDateRange}>
                Broaden date range
              </Button>
            )}

            {/* Custom suggestions */}
            {customSuggestions.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground text-left">Other options:</p>
                <div className="flex flex-wrap gap-2">
                  {customSuggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={suggestion.onClick}
                    >
                      {suggestion.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
