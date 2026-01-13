// Types for the PDF extraction application
export interface ProcessedFile {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  uploadedAt: Date;
  status: 'processing' | 'completed' | 'error';
  markdown?: MarkdownFile;
  csvFiles?: CsvFile[];
}

export interface MarkdownFile {
  content: string;
  filename: string;
  editedContent?: string;
}

export interface CsvFile {
  id: string;
  filename: string;
  data: string[][];
  headers: string[];
  editedData?: string[][];
}

// ...existing code...
export interface TableTransformState {
  isTransforming: boolean;
  transformedData?: string; // CSV data after transform
  error?: string;
}

// Add to existing ResultData interface
export interface ResultData {
  // ...existing fields...
  tableTransforms?: Record<number, TableTransformState>; // key is table index
}