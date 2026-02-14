'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableTags: string[];
  onSubmit: (tag: string) => Promise<void>;
  isPending: boolean;
}

export function AddTagDialog({
  open,
  onOpenChange,
  availableTags,
  onSubmit,
  isPending,
}: AddTagDialogProps) {
  const [selectedTag, setSelectedTag] = useState('');

  const handleSubmit = async () => {
    if (!selectedTag) return;
    await onSubmit(selectedTag);
    setSelectedTag('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) setSelectedTag('');
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Tag</DialogTitle>
          <DialogDescription>Select a tag to add to this customer.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tag</Label>
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tag" />
              </SelectTrigger>
              <SelectContent>
                {availableTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedTag || isPending}>
            {isPending ? 'Adding...' : 'Add Tag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
