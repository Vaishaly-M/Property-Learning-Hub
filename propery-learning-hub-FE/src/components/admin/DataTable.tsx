'use client';

import React, { useState } from 'react';
import {
  ArrowUpward,
  ArrowDownward,
  FilterList,
  MoreVert,
} from '@mui/icons-material';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string | number;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  selectable?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  pagination?: boolean;
  pageSize?: number;
  onRowClick?: (item: T) => void;
  loading?: boolean;
}

const DataTable = <T extends { id: string }>({
  data,
  columns,
  selectable = false,
  onSelectionChange,
  pagination = false,
  pageSize = 10,
  onRowClick,
  loading = false,
}: DataTableProps<T>) => {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = data.map(item => item.id);
      setSelectedRows(allIds);
      onSelectionChange?.(allIds);
    } else {
      setSelectedRows([]);
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (id: string) => {
    const newSelectedRows = selectedRows.includes(id)
      ? selectedRows.filter(rowId => rowId !== id)
      : [...selectedRows, id];
    
    setSelectedRows(newSelectedRows);
    onSelectionChange?.(newSelectedRows);
  };

  const handleSort = (columnKey: string) => {
    if (!columns.find(col => col.key === columnKey)?.sortable) return;
    
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = pagination ? data.slice(startIndex, endIndex) : data;

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-12 text-center">
          <div className="w-10 h-10 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <div className="mt-3 text-sm text-slate-500">Loading data...</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-12 text-center">
          <FilterList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-base text-slate-600 font-medium mb-2">No data available</h3>
          <p className="text-sm text-slate-500">
            There are no records to display at the moment.
          </p>
        </div>
      </div>
    );
  }

  const getColumnWidth = (column: Column<T>) => {
    if (column.width) return column.width;
    if (selectable && column.key === 'selection') return '40px';
    return 'auto';
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Selection Bar */}
      {selectedRows.length > 0 && (
        <div className="bg-blue-50 px-6 py-3 border-b border-blue-200 flex items-center justify-between">
          <div className="text-sm font-semibold text-blue-800">
            {selectedRows.length} item{selectedRows.length > 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Bulk Action
            </button>
            <button
              onClick={() => {
                setSelectedRows([]);
                onSelectionChange?.([]);
              }}
              className="px-3 py-1.5 text-sm font-semibold text-red-800 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-full">
          {/* Table Header */}
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {selectable && (
                <th className="py-4 px-4 text-left text-sm font-semibold text-slate-600 w-10">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === data.length && data.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </div>
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    py-4 px-4 text-left text-sm font-semibold text-slate-600 whitespace-nowrap
                    ${column.sortable ? 'cursor-pointer' : ''}
                  `}
                  style={{ width: getColumnWidth(column) }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  {column.sortable ? (
                    <div className="flex items-center gap-2">
                      {column.label}
                      <div className="flex flex-col">
                        <ArrowUpward className={`w-3 h-3 ${sortColumn === column.key && sortDirection === 'asc' ? 'text-blue-500' : 'text-slate-300'}`} />
                        <ArrowDownward className={`w-3 h-3 ${sortColumn === column.key && sortDirection === 'desc' ? 'text-blue-500' : 'text-slate-300'}`} />
                      </div>
                    </div>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {currentData.map((item, index) => (
              <tr
                key={item.id}
                className={`
                  border-b border-slate-200 transition-colors
                  ${selectedRows.includes(item.id) ? 'bg-blue-50' : ''}
                  ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}
                `}
                onClick={() => onRowClick?.(item)}
              >
                {selectable && (
                  <td className="py-4 px-4 w-10">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(item.id)}
                        onChange={() => handleSelectRow(item.id)}
                        className="w-4 h-4 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={`${item.id}-${column.key}`}
                    className="py-4 px-4 text-sm text-slate-600 align-middle"
                    style={{ width: getColumnWidth(column) }}
                  >
                    {column.render
                      ? column.render(item, index)
                      : (item as any)[column.key] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length} entries
          </div>
          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`
                flex items-center gap-1 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg transition-colors
                ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 hover:border-slate-400'}
              `}
            >
              <ArrowUpward className="w-4 h-4 rotate-[-90deg]" />
              Previous
            </button>
            
            {/* Page Numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              if (pageNum > totalPages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`
                    w-8 h-8 flex items-center justify-center text-sm rounded-lg border transition-colors
                    ${currentPage === pageNum
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 hover:border-slate-400'
                    }
                  `}
                >
                  {pageNum}
                </button>
              );
            })}
            
            {/* Ellipsis and Last Page */}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="text-slate-500">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-8 h-8 flex items-center justify-center text-sm text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors"
                >
                  {totalPages}
                </button>
              </>
            )}
            
            {/* Next Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`
                flex items-center gap-1 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg transition-colors
                ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 hover:border-slate-400'}
              `}
            >
              Next
              <ArrowUpward className="w-4 h-4 rotate-90" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;