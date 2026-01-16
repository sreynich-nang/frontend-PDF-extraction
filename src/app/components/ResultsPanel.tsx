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
  onSaveCsv: (
    csvId: string,
    headers: string[],
    data: string[][]
  ) => void;
  onTransformCsv?: (csvId: string, data: string[][]) => Promise<void>;
}

export function ResultsPanel({
  file,
  onSaveMarkdown,
  onSaveCsv,
  onTransformCsv,
}: ResultsPanelProps) {
  const [activeView, setActiveView] =
    useState<'markdown' | 'csv'>('markdown');
  const [selectedCsvId, setSelectedCsvId] = useState('');
  const [csvVersion, setCsvVersion] = useState(0);

  // ✅ SAFE csvFiles access
  const csvFiles = file?.csvFiles ?? [];

  useEffect(() => {
    if (csvFiles.length && !selectedCsvId) {
      setSelectedCsvId(csvFiles[0].id);
    }
  }, [csvFiles, selectedCsvId]);

  const handleSaveCsv = (
    csvId: string,
    headers: string[],
    data: string[][]
  ) => {
    onSaveCsv(csvId, headers, data);
    setCsvVersion(v => v + 1);
  };

  const handleDownloadCsv = (csvId: string) => {
    const csv = csvFiles.find(c => c.id === csvId);
    if (!csv) return;

    const headers = csv.editedHeaders || csv.headers;
    const data = csv.editedData || csv.data;

    const content = [headers, ...data]
      .map(r => r.join(','))
      .join('\n');

    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = csv.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!file || file.status !== 'completed') {
    return (
      <Card className="w-full">
        <CardContent className="p-12 text-center text-gray-400">
          <FileText className="h-16 w-16 mx-auto mb-4" />
          No processed files yet
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Extraction Results</CardTitle>
        <p className="text-sm text-gray-500">{file.name}</p>
      </CardHeader>

      <CardContent>
        <Tabs
          value={activeView}
          onValueChange={v =>
            setActiveView(v as 'markdown' | 'csv')
          }
        >
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="markdown">
              <FileText className="h-4 w-4 mr-2" />
              Markdown
            </TabsTrigger>
            <TabsTrigger
              value="csv"
              disabled={!csvFiles.length}
            >
              <Table className="h-4 w-4 mr-2" />
              CSV Tables ({csvFiles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="markdown">
            {file.markdown && (
              <MarkdownViewer
                markdown={file.markdown}
                onSave={onSaveMarkdown}
              />
            )}
          </TabsContent>

          <TabsContent value="csv">
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {csvFiles.map(csv => (
                  <Button
                    key={csv.id}
                    size="sm"
                    variant={
                      csv.id === selectedCsvId
                        ? 'default'
                        : 'outline'
                    }
                    onClick={() => setSelectedCsvId(csv.id)}
                  >
                    {csv.filename}
                  </Button>
                ))}
              </div>

              {selectedCsvId && (
                <CsvViewer
                  key={`${selectedCsvId}-v${csvVersion}`}
                  csv={csvFiles.find(c => c.id === selectedCsvId)!}
                  onSave={(headers, data) =>
                    handleSaveCsv(selectedCsvId, headers, data)
                  }
                  onTransform={onTransformCsv}
                  onDownload={() =>
                    handleDownloadCsv(selectedCsvId)
                  }
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
