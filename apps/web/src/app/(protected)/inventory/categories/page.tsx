'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Folder, FolderPlus, Pencil, Trash2 } from 'lucide-react';

import {
  useProductCategories,
  useCreateProductCategory,
  useUpdateProductCategory,
  useDeleteProductCategory,
} from '@/hooks/queries/use-inventory';

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
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

import type { ProductCategory, CreateCategoryInput } from '@/types/inventory';

export default function ProductCategoriesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories, isLoading } = useProductCategories({ isActive: undefined });
  const createCategory = useCreateProductCategory();
  const updateCategory = useUpdateProductCategory();
  const deleteCategory = useDeleteProductCategory();

  // Separate root and child categories
  const rootCategories = categories?.filter((c) => !c.parentId) || [];
  const childCategories = categories?.filter((c) => c.parentId) || [];

  const getChildrenForParent = (parentId: string) =>
    childCategories.filter((c) => c.parentId === parentId);

  const handleOpenCreate = (parentId?: string) => {
    setEditingCategory(null);
    setSelectedParentId(parentId || null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    setSelectedParentId(category.parentId || null);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteCategory.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const parentId = formData.get('parentId') as string;
    const data: CreateCategoryInput = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || undefined,
      parentId: parentId && parentId !== 'none' ? parentId : null,
      expiryTrackingEnabled: formData.get('expiryTrackingEnabled') === 'on',
      displayOrder: parseInt(formData.get('displayOrder') as string) || 0,
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
        title="Product Categories"
        description="Organize your inventory products into categories (max 2 levels)"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/inventory/products">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Products
              </Link>
            </Button>
            <Button onClick={() => handleOpenCreate()}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        }
      />

      <PageContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : !categories || categories.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="No categories"
            description="Create your first category to start organizing products."
            action={
              <Button onClick={() => handleOpenCreate()}>
                <FolderPlus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {rootCategories.map((category) => {
              const children = getChildrenForParent(category.id);
              return (
                <div key={category.id} className="rounded-lg border">
                  {/* Parent Category */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Folder className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{category.name}</h3>
                        {category.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <Badge variant={category.isActive ? 'default' : 'secondary'}>
                          {category.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {category.expiryTrackingEnabled && (
                          <Badge variant="outline">Expiry Tracking</Badge>
                        )}
                      </div>

                      <ActionMenu
                        items={[
                          {
                            label: 'Add Sub-category',
                            icon: FolderPlus,
                            onClick: () => handleOpenCreate(category.id),
                          },
                          {
                            label: 'Edit',
                            icon: Pencil,
                            onClick: () => handleOpenEdit(category),
                          },
                          {
                            label: 'Delete',
                            icon: Trash2,
                            onClick: () => handleDelete(category.id),
                            variant: 'destructive',
                            separator: true,
                          },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Child Categories */}
                  {children.length > 0 && (
                    <div className="border-t bg-muted/30">
                      {children.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between border-b last:border-b-0 px-4 py-3 pl-12"
                        >
                          <div className="flex items-center gap-3">
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="font-medium">{child.name}</span>
                              {child.description && (
                                <p className="text-sm text-muted-foreground">{child.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant={child.isActive ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {child.isActive ? 'Active' : 'Inactive'}
                            </Badge>

                            <ActionMenu
                              items={[
                                {
                                  label: 'Edit',
                                  icon: Pencil,
                                  onClick: () => handleOpenEdit(child),
                                },
                                {
                                  label: 'Delete',
                                  icon: Trash2,
                                  onClick: () => handleDelete(child.id),
                                  variant: 'destructive',
                                  separator: true,
                                },
                              ]}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PageContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update the category details below.'
                : 'Add a new category to organize your products.'}
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
                  placeholder="e.g., Hair Care Products"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="parentId">Parent Category</Label>
                <Select
                  name="parentId"
                  defaultValue={selectedParentId || editingCategory?.parentId || 'none'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Root Category)</SelectItem>
                    {rootCategories
                      .filter((c) => c.id !== editingCategory?.id)
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Categories can only have 2 levels (parent → child)
                </p>
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

              <div className="grid gap-2">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  name="displayOrder"
                  type="number"
                  defaultValue={editingCategory?.displayOrder || 0}
                  min={0}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="expiryTrackingEnabled"
                    name="expiryTrackingEnabled"
                    defaultChecked={editingCategory?.expiryTrackingEnabled ?? false}
                  />
                  <Label htmlFor="expiryTrackingEnabled" className="font-normal">
                    Enable Expiry Tracking
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isActive"
                    name="isActive"
                    defaultChecked={editingCategory?.isActive ?? true}
                  />
                  <Label htmlFor="isActive" className="font-normal">
                    Active
                  </Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Category"
        description="Are you sure you want to delete this category? This action cannot be undone."
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteCategory.isPending}
      />
    </PageContainer>
  );
}
