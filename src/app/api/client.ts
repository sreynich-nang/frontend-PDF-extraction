// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL;

// Log the API URL for debugging (check browser console)
console.log('[API Client] Using API URL:', API_BASE_URL);

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
          tableResult.excel_files.map(async (filePath: string) => {
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

  transform2tidy: async (csvData: string, tableIndex: number) => {
    const response = await fetch(`${API_BASE_URL}/transform2tidy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        csv_data: csvData,
        table_index: tableIndex
      }),
    });

    if (!response.ok) {
      throw new Error(`Transform failed: ${response.statusText}`);
    }

    return response.json();
  },
};

// Export the API client
export const api = apiClient;