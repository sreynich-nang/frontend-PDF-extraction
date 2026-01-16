import { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsPanel } from './components/ResultsPanel';
import { Card, CardContent } from './components/ui/card';
import { Loader2 } from 'lucide-react';
import { ProcessedFile } from './types';
import { api } from './api/client';
import { toast, Toaster } from 'sonner';

function App() {
  const [currentFile, setCurrentFile] = useState<ProcessedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);

    const processingFile: ProcessedFile = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'pdf',
      uploadedAt: new Date(),
      status: 'processing',
    };

    setCurrentFile(processingFile);
    toast.info('Processing file... This may take a moment.');

    try {
      const result = await api.processFile(file);

      const completedFile: ProcessedFile = {
        ...processingFile,
        status: 'completed',
        markdown: {
          content: result.markdown.content,
          filename: result.markdown.filename,
        },
        csvFiles: result.csv_files
          ? result.csv_files.map((csv, idx) => ({
              id: `csv-${idx}`,
              filename: csv.filename,
              data: csv.data,
              headers: csv.headers,
            }))
          : [],
      };

      setCurrentFile(completedFile);
      toast.success('Extraction completed!');
    } catch (error) {
      console.error('Processing error:', error);

      setCurrentFile({
        ...processingFile,
        status: 'error',
      });

      toast.error(
        error instanceof Error ? error.message : 'Failed to process file'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveMarkdown = (content: string) => {
    setCurrentFile(prev =>
      prev && prev.markdown
        ? {
            ...prev,
            markdown: {
              ...prev.markdown,
              editedContent: content,
            },
          }
        : prev
    );

    toast.success('Markdown saved!');
  };

  const handleSaveCsv = (csvId: string, headers: string[], data: string[][]) => {
    setCurrentFile(prev =>
      prev && prev.csvFiles
        ? {
            ...prev,
            csvFiles: prev.csvFiles.map(csv =>
              csv.id === csvId
                ? { ...csv, 
                  editedData: data.map(row => 
                    row.slice(0, csv.headers.length)), 
                    
                  editedHeaders: headers.slice(0, csv.headers.length),
                }
                : csv
            ),
          }
        : prev
    );

    toast.success('CSV saved!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            PDF Extraction Tool
          </h1>
          <p className="text-sm text-gray-600">
            Extract and process PDF & Image documents
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Upload Document
                </h2>

                <FileUpload
                  onUpload={handleFileUpload}
                  isProcessing={isProcessing}
                />

                {isProcessing && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          Processing...
                        </p>
                        <p className="text-xs text-blue-700">
                          Extracting content from your document
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {currentFile?.status === 'completed' && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-900">
                      ✓ Extraction Complete
                    </p>
                    <div className="text-xs text-green-700 mt-1 space-y-1">
                      <p>
                        • Markdown: {currentFile.markdown?.filename}
                      </p>
                      <p>
                        • CSV Tables: {currentFile.csvFiles?.length}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="mt-6">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold mb-3">
                  How to Use :D
                </h3>
                <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                  <li>Upload a PDF or image file</li>
                  <li>Wait for processing to complete</li>
                  <li>Edit markdown content</li>
                  <li>Edit extracted CSV tables</li>
                  <li>Download processed results</li>
                  <li>Transform to Tidy format</li>
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            <ResultsPanel
              file={currentFile}
              onSaveMarkdown={handleSaveMarkdown}
              onSaveCsv={handleSaveCsv}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-6 py-4">
          <p className="text-center text-sm text-gray-600">
            API: http://192.168.10.188:8000/api
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
