import { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsPanel } from './components/ResultsPanel';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Wand2, Loader2 } from 'lucide-react';
import { ProcessedFile, CsvFile, MarkdownFile } from './types';
import { api } from './api/client';
import { toast, Toaster } from 'sonner';

function App() {
  const [currentFile, setCurrentFile] = useState<ProcessedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    
    try {
      // Upload file to backend
      const uploadResponse = await api.uploadFile(file);
      
      toast.info('File uploaded. Processing...');

      // Create initial file entry
      const newFile: ProcessedFile = {
        id: uploadResponse.task_id,
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'pdf',
        uploadedAt: new Date(),
        status: 'processing',
      };
      
      setCurrentFile(newFile);

      // Poll for status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await api.getStatus(uploadResponse.task_id);
          
          if (statusResponse.status === 'completed' && statusResponse.result) {
            clearInterval(pollInterval);
            const completedFile: ProcessedFile = {
              ...newFile,
              status: 'completed',
              markdown: {
                content: statusResponse.result.markdown.content,
                filename: statusResponse.result.markdown.filename,
              },
              csvFiles: statusResponse.result.csv_files?.map((csv, idx) => ({
                id: `csv-${idx}`,
                filename: csv.filename,
                data: csv.data,
                headers: csv.headers,
              })),
            };
            
            setCurrentFile(completedFile);
            setIsProcessing(false);
            toast.success('Extraction completed!');
          } else if (statusResponse.status === 'error') {
            clearInterval(pollInterval);
            setIsProcessing(false);
            toast.error('Extraction failed: ' + (statusResponse.error || 'Unknown error'));
          }
        } catch (error) {
          clearInterval(pollInterval);
          setIsProcessing(false);
          toast.error('Failed to check status');
        }
      }, 2000); // Poll every 2 seconds
    } catch (error) {
      console.error('Upload error:', error);
      setIsProcessing(false);
      toast.error('Failed to upload file');
    }
  };

  const handleSaveMarkdown = (content: string) => {
    if (currentFile && currentFile.markdown) {
      setCurrentFile({
        ...currentFile,
        markdown: {
          ...currentFile.markdown,
          editedContent: content,
        },
      });
      toast.success('Markdown saved!');
    }
  };

  const handleSaveCsv = (csvId: string, data: string[][]) => {
    if (currentFile && currentFile.csvFiles) {
      setCurrentFile({
        ...currentFile,
        csvFiles: currentFile.csvFiles.map(csv =>
          csv.id === csvId ? { ...csv, editedData: data } : csv
        ),
      });
      toast.success('CSV saved!');
    }
  };

  const handleTransform2Tidy = async () => {
    if (!currentFile || !currentFile.csvFiles || currentFile.csvFiles.length === 0) {
      toast.error('No CSV data available to transform');
      return;
    }

    setIsTransforming(true);
    
    try {
      const csvData = currentFile.csvFiles[0].editedData || currentFile.csvFiles[0].data;
      const result = await api.transform2tidy({
        data: csvData,
        headers: currentFile.csvFiles[0].headers
      });
      
      toast.success('Data transformed to tidy format!');
      console.log('Transformed data:', result);
    } catch (error) {
      console.error('Transform error:', error);
      toast.error('Failed to transform data');
    } finally {
      setIsTransforming(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleTransform2Tidy}
                disabled={!currentFile || isTransforming || !currentFile.csvFiles || currentFile.csvFiles.length === 0}
                variant="outline"
                className="mr-4"
              >
                {isTransforming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transforming...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Transform2Tidy
                  </>
                )}
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PDF Extraction Tool</h1>
                <p className="text-sm text-gray-600">Extract and process PDF & Image documents</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Upload Document</h2>
                <FileUpload onUpload={handleFileUpload} isProcessing={isProcessing} />
                
                {isProcessing && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Processing...</p>
                        <p className="text-xs text-blue-700">Extracting content from your document</p>
                      </div>
                    </div>
                  </div>
                )}

                {currentFile && currentFile.status === 'completed' && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-green-900">✓ Extraction Complete</p>
                      <div className="text-xs text-green-700 space-y-1">
                        <p>• Markdown: {currentFile.markdown?.filename}</p>
                        {currentFile.csvFiles && currentFile.csvFiles.length > 0 && (
                          <p>• CSV Tables: {currentFile.csvFiles.length} file(s)</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="mt-6">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold mb-3">How to Use</h3>
                <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                  <li>Upload a PDF or image file</li>
                  <li>Wait for processing to complete</li>
                  <li>View and edit markdown content</li>
                  <li>Preview and edit CSV tables</li>
                  <li>Download processed files</li>
                  <li>Use Transform2Tidy for data cleanup</li>
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
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