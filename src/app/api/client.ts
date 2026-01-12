// API client for the FastAPI backend
// Set USE_MOCK_API to false to use the real backend
const USE_MOCK_API = false; // Change this to true for testing with mock data

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://192.168.10.188:8000/api';

// Log the API URL for debugging (check browser console)
console.log('[API Client] Using API URL:', API_BASE_URL);
console.log('[API Client] USE_MOCK_API:', USE_MOCK_API);

// Response from /upload endpoint - matches FastAPI UploadResponse schema
export interface UploadResponse {
  status: string;
  filename: string;
  merged_path: string; // Document name for download endpoint
  processing_time_seconds: number;
}

// Response from /filter_tables endpoint - matches FastAPI TableExtractionResponse schema
export interface TableExtractionResponse {
  status: string;
  document: string;
  markdown_path: string;
  tables_count: number;
  excel_folder: string;
  excel_files: string[];
}

// CSV file data structure for frontend
export interface CsvFileData {
  filename: string;
  data: string[][];
  headers: string[];
}

// Complete extraction result combining markdown + tables
export interface ExtractionResult {
  markdown: {
    content: string;
    filename: string;
  };
  csv_files?: CsvFileData[];
  document_name: string;
}

export const apiClient = {
  /**
   * Upload a PDF or image file for processing.
   * The backend processes synchronously and returns when complete.
   */
  uploadFile: async (file: File): Promise<UploadResponse> => {
    console.log('[API Client] Uploading file:', file.name);
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Upload failed');
    }

    const result = await response.json();
    console.log('[API Client] Upload response:', result);
    return result;
  },

  /**
   * Download the processed markdown file for a document.
   */
  downloadMarkdown: async (documentName: string): Promise<string> => {
    console.log('[API Client] Downloading markdown for:', documentName);
    const response = await fetch(`${API_BASE_URL}/download/${encodeURIComponent(documentName)}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Download failed');
    }

    return response.text();
  },

  /**
   * Extract tables from a processed document's markdown.
   * Creates CSV files for each table found.
   */
  filterTables: async (document: string, storeInFilters: boolean = false): Promise<TableExtractionResponse> => {
    console.log('[API Client] Extracting tables for:', document);
    const params = new URLSearchParams({
      document,
      store_in_filters: storeInFilters.toString(),
    });

    const response = await fetch(`${API_BASE_URL}/filter_tables?${params}`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Table extraction failed');
    }

    return response.json();
  },

  /**
   * Download a specific CSV table file.
   */
  downloadTable: async (document: string, filename: string, storeInFilters: boolean = false): Promise<string> => {
    const params = new URLSearchParams({
      document,
      filename,
      store_in_filters: storeInFilters.toString(),
    });

    const response = await fetch(`${API_BASE_URL}/download_table?${params}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'CSV download failed');
    }

    return response.text();
  },

  /**
   * Parse CSV content into headers and data rows.
   */
  parseCsvContent: (csvContent: string): { headers: string[]; data: string[][] } => {
    const lines = csvContent.trim().split('\n');
    if (lines.length === 0) {
      return { headers: [], data: [] };
    }

    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]);
    const data = lines.slice(1).map(parseRow);
    
    return { headers, data };
  },

  /**
   * Full extraction workflow: upload, download markdown, extract tables.
   */
  processFile: async (file: File): Promise<ExtractionResult> => {
    console.log('[API Client] Starting processFile for:', file.name);
    
    // Step 1: Upload and process the file
    const uploadResult = await apiClient.uploadFile(file);
    const documentName = uploadResult.merged_path;
    console.log('[API Client] Document name:', documentName);

    // Step 2: Download the generated markdown
    const markdownContent = await apiClient.downloadMarkdown(documentName);
    console.log('[API Client] Markdown downloaded, length:', markdownContent.length);

    // Step 3: Extract tables from markdown
    let csvFiles: CsvFileData[] = [];
    try {
      console.log('[API Client] Calling filterTables for:', documentName);
      const tableResult = await apiClient.filterTables(documentName);
      console.log('[API Client] filterTables response:', tableResult);
      console.log('[API Client] Tables extracted:', tableResult.tables_count);
      console.log('[API Client] Excel files:', tableResult.excel_files);
      
      // Step 4: Download each CSV file
      if (tableResult.excel_files && tableResult.excel_files.length > 0) {
        console.log('[API Client] Downloading', tableResult.excel_files.length, 'CSV files...');
        csvFiles = await Promise.all(
          tableResult.excel_files.map(async (filePath) => {
            const filename = filePath.split(/[/\\]/).pop() || filePath;
            console.log('[API Client] Downloading CSV:', filename);
            const csvContent = await apiClient.downloadTable(documentName, filename);
            console.log('[API Client] CSV content length:', csvContent.length);
            const parsed = apiClient.parseCsvContent(csvContent);
            console.log('[API Client] Parsed CSV - headers:', parsed.headers, 'rows:', parsed.data.length);
            return {
              filename,
              headers: parsed.headers,
              data: parsed.data,
            };
          })
        );
        console.log('[API Client] All CSVs downloaded:', csvFiles.length);
      }
    } catch (error) {
      // Tables extraction is optional - document may not have tables
      console.error('[API Client] Table extraction failed:', error);
    }

    return {
      markdown: {
        content: markdownContent,
        filename: `${documentName}.md`,
      },
      csv_files: csvFiles,
      document_name: documentName,
    };
  },

  transform2tidy: async (data: any): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/transform2tidy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Transform failed');
    }

    return response.json();
  },
};

// Mock API client for development/testing
export const mockApiClient = {
  uploadFile: async (file: File): Promise<UploadResponse> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      status: 'success',
      filename: file.name,
      merged_path: file.name.replace(/\.[^.]+$/, ''),
      processing_time_seconds: 1.5,
    };
  },

  downloadMarkdown: async (documentName: string): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return `# ${documentName}

## Introduction
This is a sample extracted document from the PDF/image processing.

## Main Content
- Point 1: Important information
- Point 2: More details
- Point 3: Additional notes

### Data Analysis
The following table shows the extracted data:

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |

## Conclusion
Document extraction completed successfully.
`;
  },

  filterTables: async (document: string, storeInFilters: boolean = false): Promise<TableExtractionResponse> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      status: 'success',
      document,
      markdown_path: `outputs/${document}/${document}.md`,
      tables_count: 2,
      excel_folder: `outputs/${document}/tables_csv_${document}`,
      excel_files: ['table_1.csv', 'table_2.csv'],
    };
  },

  downloadTable: async (document: string, filename: string, storeInFilters: boolean = false): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    if (filename === 'table_1.csv') {
      return `Name,Age,Position,City
John Doe,30,Engineer,New York
Jane Smith,28,Designer,San Francisco
Bob Johnson,35,Manager,Seattle
Alice Williams,32,Developer,Austin`;
    }
    return `Quarter,Revenue,Expenses,Profit
Q1,10000,8500,1500
Q2,12000,9500,2500
Q3,15000,11000,4000
Q4,18000,13000,5000`;
  },

  parseCsvContent: (csvContent: string): { headers: string[]; data: string[][] } => {
    return apiClient.parseCsvContent(csvContent);
  },

  processFile: async (file: File): Promise<ExtractionResult> => {
    const uploadResult = await mockApiClient.uploadFile(file);
    const documentName = uploadResult.merged_path;
    const markdownContent = await mockApiClient.downloadMarkdown(documentName);
    const tableResult = await mockApiClient.filterTables(documentName);
    
    const csvFiles: CsvFileData[] = await Promise.all(
      tableResult.excel_files.map(async (filename) => {
        const csvContent = await mockApiClient.downloadTable(documentName, filename);
        const parsed = mockApiClient.parseCsvContent(csvContent);
        return {
          filename,
          headers: parsed.headers,
          data: parsed.data,
        };
      })
    );

    return {
      markdown: {
        content: markdownContent,
        filename: `${documentName}.md`,
      },
      csv_files: csvFiles,
      document_name: documentName,
    };
  },

  transform2tidy: async (data: any): Promise<any> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      success: true,
      message: 'Data transformed to tidy format',
      transformed_data: data
    };
  },
};

// Export the appropriate client based on configuration
export const api = USE_MOCK_API ? mockApiClient : apiClient;