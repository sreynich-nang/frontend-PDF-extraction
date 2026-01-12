import { useState } from 'react';
import { Edit, Save, X, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { CsvFile } from '../types';

interface CsvViewerProps {
  csv: CsvFile;
  onSave: (data: string[][]) => void;
}

export function CsvViewer({ csv, onSave }: CsvViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<string[][]>(csv.editedData || csv.data);
  const [editHeaders, setEditHeaders] = useState<string[]>(csv.headers);

  const displayData = csv.editedData || csv.data;

  const handleSave = () => {
    onSave(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(csv.editedData || csv.data);
    setEditHeaders(csv.headers);
    setIsEditing(false);
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newData = [...editData];
    newData[rowIndex][colIndex] = value;
    setEditData(newData);
  };

  const handleHeaderChange = (index: number, value: string) => {
    const newHeaders = [...editHeaders];
    newHeaders[index] = value;
    setEditHeaders(newHeaders);
  };

  const handleAddRow = () => {
    const newRow = new Array(editHeaders.length).fill('');
    setEditData([...editData, newRow]);
  };

  const handleDeleteRow = (rowIndex: number) => {
    const newData = editData.filter((_, idx) => idx !== rowIndex);
    setEditData(newData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {displayData.length} rows × {csv.headers.length} columns
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
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-auto max-h-[600px]">
        <Table>
          <TableHeader>
            <TableRow>
              {isEditing && <TableHead className="w-12"></TableHead>}
              {(isEditing ? editHeaders : csv.headers).map((header, idx) => (
                <TableHead key={idx}>
                  {isEditing ? (
                    <Input
                      value={header}
                      onChange={(e) => handleHeaderChange(idx, e.target.value)}
                      className="h-8 font-medium"
                    />
                  ) : (
                    header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(isEditing ? editData : displayData).map((row, rowIdx) => (
              <TableRow key={rowIdx}>
                {isEditing && (
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteRow(rowIdx)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                )}
                {row.map((cell, colIdx) => (
                  <TableCell key={colIdx}>
                    {isEditing ? (
                      <Input
                        value={cell}
                        onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                        className="h-8"
                      />
                    ) : (
                      cell
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
