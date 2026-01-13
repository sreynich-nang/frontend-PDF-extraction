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

