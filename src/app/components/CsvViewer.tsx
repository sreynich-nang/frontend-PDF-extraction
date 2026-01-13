import { useState } from 'react';
import { Edit, Save, X, Plus, Trash2, Wand2, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CsvFile } from '../types';

interface CsvViewerProps {
  csv: CsvFile;
  onSave: (data: string[][]) => void;
  onTransform?: (csvId: string, data: string[][]) => Promise<void>;
  onDownload?: () => void;
}

export function CsvViewer({ csv, onSave, onTransform, onDownload }: CsvViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<string[][]>([]);
  const [editHeaders, setEditHeaders] = useState<string[]>([]);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformError, setTransformError] = useState<string | null>(null);

  // Current display values
  const displayData = isEditing ? editData : csv.editedData || csv.data;
  const displayHeaders = isEditing ? editHeaders : csv.headers;

  // Start editing
  const handleStartEdit = () => {
    setEditData(displayData.map(row => [...row]));
    setEditHeaders([...displayHeaders]);
    setIsEditing(true);
  };

  // Save edited data
  const handleSave = () => {
    // Update headers and data
    const newData = editData.map(row => [...row]);
    onSave(newData); // App will store editedData
    setIsEditing(false);
  };

  // Cancel editing
  const handleCancel = () => {
    setIsEditing(false);
  };

  // Update cell
  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    setEditData(prev => {
      const newData = prev.map(row => [...row]);
      newData[rowIndex][colIndex] = value;
      return newData;
    });
  };

  // Update header
  const handleHeaderChange = (colIndex: number, value: string) => {
    setEditHeaders(prev => {
      const newHeaders = [...prev];
      newHeaders[colIndex] = value;
      return newHeaders;
    });
  };

  // Add a new row
  const handleAddRow = () => {
    const newRow = new Array(editHeaders.length).fill('');
    setEditData(prev => [...prev, newRow]);
  };

  // Delete a row
  const handleDeleteRow = (rowIndex: number) => {
    setEditData(prev => prev.filter((_, idx) => idx !== rowIndex));
  };

  // Transform to tidy format
  const handleTransform = async () => {
    if (!onTransform) return;
    
    setIsTransforming(true);
    setTransformError(null);
    
    try {
      // Use the latest data (edited or original)
      const currentData = csv.editedData || csv.data;
      await onTransform(csv.id, currentData);
    } catch (error) {
      setTransformError(error instanceof Error ? error.message : 'Transform failed');
      console.error('Transform error:', error);
    } finally {
      setIsTransforming(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {displayData.length} rows × {displayHeaders.length} columns
        </p>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button size="sm" variant="outline" onClick={handleAddRow}>
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
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
            <>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
              <div className="flex flex-col gap-2">
                <Button size="sm" variant="outline" onClick={handleStartEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleTransform}
                  disabled={isTransforming || !onTransform}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  {isTransforming ? 'Transforming...' : 'Transform2Tidy'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-300 rounded-lg overflow-auto max-h-[600px]">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              {isEditing && <th className="border px-2 py-2 w-12"></th>}
              {displayHeaders.map((header, idx) => (
                <th
                  key={idx}
                  className="border px-4 py-2 text-left font-semibold text-sm"
                >
                  {isEditing ? (
                    <Input
                      value={header}
                      onChange={(e) => handleHeaderChange(idx, e.target.value)}
                      className="h-8 font-medium"
                    />
                  ) : (
                    header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                {isEditing && (
                  <td className="border px-2 py-1 text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteRow(rowIdx)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                )}
                {row.map((cell, colIdx) => (
                  <td
                    key={colIdx}
                    className="border px-4 py-2 text-sm"
                  >
                    {isEditing ? (
                      <Input
                        value={cell}
                        onChange={(e) =>
                          handleCellChange(rowIdx, colIdx, e.target.value)
                        }
                        className="h-8"
                      />
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Transform Error Message */}
      {transformError && (
        <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded p-3">
          <strong>Transform Error:</strong> {transformError}
        </div>
      )}
    </div>
  );
}