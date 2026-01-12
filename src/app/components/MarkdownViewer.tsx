import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Eye, Edit, Save, X } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { MarkdownFile } from '../types';

interface MarkdownViewerProps {
  markdown: MarkdownFile;
  onSave: (content: string) => void;
}

export function MarkdownViewer({ markdown, onSave }: MarkdownViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(markdown.editedContent || markdown.content);
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');

  const handleSave = () => {
    onSave(editContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(markdown.editedContent || markdown.content);
    setIsEditing(false);
  };

  const displayContent = markdown.editedContent || markdown.content;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'preview' | 'source')}>
          <TabsList>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="source">
              <Edit className="h-4 w-4 mr-2" />
              Source
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {viewMode === 'preview' ? (
        <div className="prose max-w-none p-6 bg-white border rounded-lg max-h-[600px] overflow-auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {isEditing ? editContent : displayContent}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {isEditing ? (
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="font-mono text-sm min-h-[600px] border-0 focus-visible:ring-0"
              placeholder="Enter markdown content..."
            />
          ) : (
            <pre className="p-6 bg-gray-50 text-sm overflow-auto max-h-[600px] m-0">
              <code>{displayContent}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
