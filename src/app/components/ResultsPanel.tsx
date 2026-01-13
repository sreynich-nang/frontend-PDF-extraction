import { useState, useEffect } from 'react';
import { FileText, Table, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ProcessedFile } from '../types';
import { MarkdownViewer } from './MarkdownViewer';
import { CsvViewer } from './CsvViewer';

interface ResultsPanelProps {
  file: ProcessedFile | null;
  onSaveMarkdown: (content: string) => void;
  onSaveCsv: (csvId: string, data: string[][]) => void;
  onTransformCsv?: (csvId: string, data: string[][]) => Promise<void>;
}

export function ResultsPanel({ file, onSaveMarkdown, onSaveCsv, onTransformCsv }: ResultsPanelProps) {
  const [activeView, setActiveView] = useState<'markdown' | 'csv'>('markdown');
  const [selectedCsvId, setSelectedCsvId] = useState<string>('');
  const [csvVersion, setCsvVersion] = useState(0);

  // Auto-select first CSV when available
  useEffect(() => {
    if (file?.csvFiles && file.csvFiles.length > 0 && !selectedCsvId) {
      setSelectedCsvId(file.csvFiles[0].id);
    }
  }, [file?.csvFiles, selectedCsvId]);

  const handleSaveCsv = (csvId: string, data: string[][]) => {
    console.log('[ResultsPanel] Saving CSV:', csvId, data);
    onSaveCsv(csvId, data);
    // Increment version to force re-render
    setCsvVersion(v => v + 1);
  };

  const handleTransformCsv = async (csvId: string, data: string[][]) => {
    if (onTransformCsv) {
      console.log('[ResultsPanel] Transforming CSV:', csvId, data);
      await onTransformCsv(csvId, data);
      // Increment version to force re-render with new data
      setCsvVersion(v => v + 1);
    }
  };

  if (!file || file.status !== 'completed') {
    return (
      <Card className="w-full">
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center gap-4 text-gray-400">
            <FileText className="h-16 w-16" />
            <p className="text-lg">No processed files yet</p>
            <p className="text-sm">Upload a PDF or image to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleDownloadMarkdown = () => {
    if (file.markdown) {
      const content = file.markdown.editedContent || file.markdown.content;
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.markdown.filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadCsv = (csvId: string) => {
    const csv = file.csvFiles?.find(c => c.id === csvId);
    if (csv) {
      const data = csv.editedData || csv.data;
      const csvContent = [csv.headers, ...data]
        .map(row => row.join(','))
        .join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = csv.filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Extraction Results</CardTitle>
          {activeView === 'markdown' && (
            <Button size="sm" variant="outline" onClick={handleDownloadMarkdown}>
              <Download className="h-4 w-4 mr-2" />
              Download MD
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-500">{file.name}</p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'markdown' | 'csv')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="markdown">
              <FileText className="h-4 w-4 mr-2" />
              Markdown
            </TabsTrigger>
            <TabsTrigger value="csv" disabled={!file.csvFiles || file.csvFiles.length === 0}>
              <Table className="h-4 w-4 mr-2" />
              CSV Tables ({file.csvFiles?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="markdown" className="mt-0">
            {file.markdown && (
              <MarkdownViewer
                markdown={file.markdown}
                onSave={onSaveMarkdown}
              />
            )}
          </TabsContent>

          <TabsContent value="csv" className="mt-0">
            {file.csvFiles && file.csvFiles.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {file.csvFiles.map((csv) => (
                    <Button
                      key={csv.id}
                      size="sm"
                      variant={selectedCsvId === csv.id ? 'default' : 'outline'}
                      onClick={() => setSelectedCsvId(csv.id)}
                    >
                      {csv.filename}
                    </Button>
                  ))}
                </div>
                {selectedCsvId && file.csvFiles.find(c => c.id === selectedCsvId) && (
                  <CsvViewer
                    key={`${selectedCsvId}-v${csvVersion}`}
                    csv={file.csvFiles.find(c => c.id === selectedCsvId)!}
                    onSave={(data) => handleSaveCsv(selectedCsvId, data)}
                    onTransform={handleTransformCsv}
                    onDownload={() => handleDownloadCsv(selectedCsvId)}
                  />
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}