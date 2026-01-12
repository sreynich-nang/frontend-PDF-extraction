// API client for the FastAPI backend
// Set USE_MOCK_API to false to use the real backend
const USE_MOCK_API = false; // Change this to true for testing with mock data
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.10.188:8000/api';

export interface UploadResponse {
  task_id: string;
  status: string;
}

export interface ExtractionResult {
  markdown: {
    content: string;
    filename: string;
  };
  csv_files?: Array<{
    filename: string;
    data: string[][];
    headers: string[];
  }>;
}

export interface StatusResponse {
  status: 'processing' | 'completed' | 'error';
  result?: ExtractionResult;
  error?: string;
}

export const apiClient = {
  uploadFile: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return response.json();
  },

  getStatus: async (taskId: string): Promise<StatusResponse> => {
    const response = await fetch(`${API_BASE_URL}/status/${taskId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch status');
    }

    return response.json();
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
      task_id: Math.random().toString(36).substr(2, 9),
      status: 'processing'
    };
  },

  getStatus: async (taskId: string): Promise<StatusResponse> => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockMarkdown = `# Extracted Document

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

    const mockCsvData = [
      ['John Doe', '30', 'Engineer', 'New York'],
      ['Jane Smith', '28', 'Designer', 'San Francisco'],
      ['Bob Johnson', '35', 'Manager', 'Seattle'],
      ['Alice Williams', '32', 'Developer', 'Austin'],
    ];

    const mockCsvData2 = [
      ['Q1', '10000', '8500', '1500'],
      ['Q2', '12000', '9500', '2500'],
      ['Q3', '15000', '11000', '4000'],
      ['Q4', '18000', '13000', '5000'],
    ];

    return {
      status: 'completed',
      result: {
        markdown: {
          content: mockMarkdown,
          filename: 'extracted_document.md'
        },
        csv_files: [
          {
            filename: 'employee_data.csv',
            headers: ['Name', 'Age', 'Position', 'City'],
            data: mockCsvData
          },
          {
            filename: 'quarterly_revenue.csv',
            headers: ['Quarter', 'Revenue', 'Expenses', 'Profit'],
            data: mockCsvData2
          }
        ]
      }
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