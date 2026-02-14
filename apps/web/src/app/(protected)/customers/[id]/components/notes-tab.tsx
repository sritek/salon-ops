'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

import type { CustomerNote } from '@/types/customers';

// ============================================
// Helper
// ============================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ============================================
// Types
// ============================================

interface NotesTabProps {
  notes?: CustomerNote[];
  noteContent: string;
  onNoteContentChange: (value: string) => void;
  onAddNote: () => void;
  isAdding: boolean;
}

// ============================================
// Component
// ============================================

export function NotesTab({
  notes = [],
  noteContent,
  onNoteContentChange,
  onAddNote,
  isAdding,
}: NotesTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Add a note about this customer..."
            value={noteContent}
            onChange={(e) => onNoteContentChange(e.target.value)}
            rows={3}
          />
          <Button onClick={onAddNote} disabled={!noteContent.trim() || isAdding}>
            {isAdding ? 'Adding...' : 'Add Note'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notes History</CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length > 0 ? (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="border-b pb-4 last:border-0">
                  <p className="text-sm">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{formatDate(note.createdAt)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No notes yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
