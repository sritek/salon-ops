'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Folder, FolderPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/hooks/queries/use-categories';

import {
  EmptyState,
  PageContainer,
  PageContent,
  PageHeader,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

import type { ServiceCategory, CreateCategoryInput } from '@/types/services';

export default function CategoriesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ServiceCategory | null>(null);

  const { data: categories, isLoading } = useCategories({
    includeInactive: true,
    flat: true,
  });
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (category: ServiceCategory) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      await deleteCategory.mutateAsync(id);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: CreateCategoryInput = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || undefined,
      color: (formData.get('color') as string) || '#6B7280',
      icon: (formData.get('icon') as string) || undefined,
      isActive: formData.get('isActive') === 'on',
    };

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, data });
      } else {
        await createCategory.mutateAsync(data);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  };

  const isPending = createCategory.isPending || updateCategory.isPending;

  return (
    <PageContainer>
      <PageHeader
        title="Service Categories"
        description="Organize your services into categories"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/services">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Services
              </Link>
            </Button>
            <Button onClick={handleOpenCreate}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        }
      />

      <PageContent>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : !categories || categories.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="No categories"
            description="Create your first category to start organizing services."
            action={
              <Button onClick={handleOpenCreate}>
                <FolderPlus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="group relative rounded-lg border p-4 hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg"
                      style={{ backgroundColor: category.color + '20' }}
                    >
                      <div
                        className="flex h-full w-full items-center justify-center rounded-lg"
                        style={{ color: category.color }}
                      >
                        <span className="text-lg font-bold">
                          {category.name.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {category._count?.services || 0} services
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleOpenEdit(category)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(category.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {category.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {category.description}
                  </p>
                )}

                <div className="mt-3 flex gap-2">
                  <Badge variant={category.isActive ? 'default' : 'secondary'}>
                    {category.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update the category details below.'
                : 'Add a new category to organize your services.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingCategory?.name || ''}
                  placeholder="e.g., Hair Services"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingCategory?.description || ''}
                  placeholder="Brief description..."
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="color">Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color"
                      name="color"
                      type="color"
                      defaultValue={editingCategory?.color || '#6B7280'}
                      className="h-10 w-20 p-1"
                    />
                    <Input
                      type="text"
                      defaultValue={editingCategory?.color || '#6B7280'}
                      placeholder="#6B7280"
                      className="flex-1"
                      readOnly
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="icon">Icon</Label>
                  <Input
                    id="icon"
                    name="icon"
                    defaultValue={editingCategory?.icon || ''}
                    placeholder="e.g., scissors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  defaultChecked={editingCategory?.isActive ?? true}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isActive" className="font-normal">
                  Active
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? 'Saving...'
                  : editingCategory
                    ? 'Save Changes'
                    : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
