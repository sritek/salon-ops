'use client';

/**
 * Filter Chips Component
 * Displays active filters as removable chips with saved presets
 * Requirements: 12.6, 12.7, 12.8, 12.9
 */

import { useCallback, useEffect, useState } from 'react';
import { X, Plus, Save, Bookmark, RotateCcw } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface FilterOption {
  key: string;
  label: string;
  value: string;
  displayValue?: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterOption[];
}

interface FilterChipsProps {
  /** Available filter options to add */
  availableFilters?: FilterOption[];
  /** Currently active filters */
  activeFilters: FilterOption[];
  /** Callback when filters change */
  onFiltersChange: (filters: FilterOption[]) => void;
  /** Saved filter presets */
  presets?: FilterPreset[];
  /** Callback when presets change */
  onPresetsChange?: (presets: FilterPreset[]) => void;
  /** Whether to persist filters in URL */
  persistInUrl?: boolean;
  /** Storage key for presets in localStorage */
  presetsStorageKey?: string;
  /** Additional class names */
  className?: string;
}

const PRESETS_STORAGE_PREFIX = 'filter-presets-';

export function FilterChips({
  availableFilters = [],
  activeFilters,
  onFiltersChange,
  presets: externalPresets,
  onPresetsChange,
  persistInUrl = true,
  presetsStorageKey,
  className,
}: FilterChipsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [localPresets, setLocalPresets] = useState<FilterPreset[]>([]);

  // Use external presets if provided, otherwise use local state
  const presets = externalPresets ?? localPresets;
  const setPresets = onPresetsChange ?? setLocalPresets;

  // Load presets from localStorage on mount
  useEffect(() => {
    if (presetsStorageKey && !externalPresets) {
      try {
        const stored = localStorage.getItem(PRESETS_STORAGE_PREFIX + presetsStorageKey);
        if (stored) {
          setLocalPresets(JSON.parse(stored));
        }
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [presetsStorageKey, externalPresets]);

  // Save presets to localStorage when they change
  useEffect(() => {
    if (presetsStorageKey && !externalPresets) {
      try {
        localStorage.setItem(
          PRESETS_STORAGE_PREFIX + presetsStorageKey,
          JSON.stringify(localPresets)
        );
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [localPresets, presetsStorageKey, externalPresets]);

  // Sync filters with URL
  useEffect(() => {
    if (persistInUrl) {
      const params = new URLSearchParams(searchParams.toString());

      // Clear existing filter params
      activeFilters.forEach((filter) => {
        params.delete(filter.key);
      });

      // Add current filters
      activeFilters.forEach((filter) => {
        params.set(filter.key, filter.value);
      });

      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [activeFilters, pathname, router, searchParams, persistInUrl]);

  // Remove a filter
  const handleRemoveFilter = useCallback(
    (filterToRemove: FilterOption) => {
      const newFilters = activeFilters.filter(
        (f) => !(f.key === filterToRemove.key && f.value === filterToRemove.value)
      );
      onFiltersChange(newFilters);
    },
    [activeFilters, onFiltersChange]
  );

  // Add a filter
  const handleAddFilter = useCallback(
    (filter: FilterOption) => {
      // Check if filter already exists
      const exists = activeFilters.some((f) => f.key === filter.key && f.value === filter.value);
      if (!exists) {
        onFiltersChange([...activeFilters, filter]);
      }
    },
    [activeFilters, onFiltersChange]
  );

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    onFiltersChange([]);
  }, [onFiltersChange]);

  // Apply a preset
  const handleApplyPreset = useCallback(
    (preset: FilterPreset) => {
      onFiltersChange(preset.filters);
    },
    [onFiltersChange]
  );

  // Save current filters as preset
  const handleSavePreset = useCallback(() => {
    if (!presetName.trim() || activeFilters.length === 0) return;

    const newPreset: FilterPreset = {
      id: `preset-${Date.now()}`,
      name: presetName.trim(),
      filters: [...activeFilters],
    };

    setPresets([...presets, newPreset]);
    setPresetName('');
    setSaveDialogOpen(false);
  }, [presetName, activeFilters, presets, setPresets]);

  // Delete a preset
  const handleDeletePreset = useCallback(
    (presetId: string) => {
      setPresets(presets.filter((p) => p.id !== presetId));
    },
    [presets, setPresets]
  );

  // Get filters that can still be added
  const addableFilters = availableFilters.filter(
    (available) =>
      !activeFilters.some(
        (active) => active.key === available.key && active.value === available.value
      )
  );

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Active filter chips */}
      {activeFilters.map((filter, index) => (
        <Badge
          key={`${filter.key}-${filter.value}-${index}`}
          variant="secondary"
          className="gap-1 pr-1"
        >
          <span className="text-muted-foreground">{filter.label}:</span>
          <span>{filter.displayValue || filter.value}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={() => handleRemoveFilter(filter)}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove {filter.label} filter</span>
          </Button>
        </Badge>
      ))}

      {/* Add filter dropdown */}
      {addableFilters.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1">
              <Plus className="h-3 w-3" />
              Add Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {addableFilters.map((filter) => (
              <DropdownMenuItem
                key={`${filter.key}-${filter.value}`}
                onClick={() => handleAddFilter(filter)}
              >
                {filter.label}: {filter.displayValue || filter.value}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Presets dropdown */}
      {(presets.length > 0 || hasActiveFilters) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1">
              <Bookmark className="h-3 w-3" />
              Presets
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {presets.map((preset) => (
              <DropdownMenuItem key={preset.id} className="flex items-center justify-between gap-2">
                <span onClick={() => handleApplyPreset(preset)} className="flex-1 cursor-pointer">
                  {preset.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePreset(preset.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </DropdownMenuItem>
            ))}
            {presets.length > 0 && hasActiveFilters && <DropdownMenuSeparator />}
            {hasActiveFilters && (
              <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
                <Save className="mr-2 h-4 w-4" />
                Save Current Filters
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Reset filters button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-muted-foreground"
          onClick={handleResetFilters}
        >
          <RotateCcw className="h-3 w-3" />
          Reset Filters
        </Button>
      )}

      {/* Save preset dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
            <DialogDescription>
              Save your current filters as a preset for quick access later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., Today's VIP appointments"
              />
            </div>
            <div className="space-y-2">
              <Label>Filters to save</Label>
              <div className="flex flex-wrap gap-1">
                {activeFilters.map((filter, index) => (
                  <Badge key={`${filter.key}-${filter.value}-${index}`} variant="secondary">
                    {filter.label}: {filter.displayValue || filter.value}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
