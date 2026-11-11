/**
 * High-Performance Virtualized Material DataGrid for React 19.
 * Handles 10,000+ items at 60-120 FPS with minimal DOM footprint (only ~15-20 active rows rendered).
 */

import React, { useState, useRef, useMemo, useCallback, memo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, X } from 'lucide-react';
import { normalizeArabicText } from '../../utils/performance';
import { MuiTextField } from './MuiTextField';
import { MuiIconButton } from './MuiIconButton';

export interface GridColumn<T> {
  field: keyof T | string;
  headerName: string;
  width?: number | string;
  minWidth?: number;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  renderCell?: (row: T, index: number) => React.ReactNode;
}

export interface MuiDataGridProps<T> {
  rows: T[];
  columns: GridColumn<T>[];
  rowHeight?: number;
  height?: number | string;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  onRowClick?: (row: T) => void;
  getRowId?: (row: T) => string | number;
  emptyMessage?: string;
  toolbarActions?: React.ReactNode;
}

function MuiDataGridInner<T extends Record<string, any>>({
  rows,
  columns,
  rowHeight = 52,
  height = 540,
  searchPlaceholder = 'بحث سريع في الجدول...',
  searchFields,
  onRowClick,
  getRowId,
  emptyMessage = 'لا توجد بيانات متوفرة حاليًا',
  toolbarActions,
}: MuiDataGridProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [scrollTop, setScrollTop] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Filtered rows (memoized with normalized Arabic tokens)
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;

    const normTerm = normalizeArabicText(searchTerm);
    return rows.filter((row) => {
      if (searchFields && searchFields.length > 0) {
        return searchFields.some((field) => {
          const val = row[field as string];
          if (val == null) return false;
          return normalizeArabicText(String(val)).includes(normTerm);
        });
      }

      // Default: search all string/number fields in row
      return Object.values(row).some((val) => {
        if (typeof val === 'string' || typeof val === 'number') {
          return normalizeArabicText(String(val)).includes(normTerm);
        }
        return false;
      });
    });
  }, [rows, searchTerm, searchFields]);

  // 2. Sorted rows (memoized)
  const sortedRows = useMemo(() => {
    if (!sortField) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB, 'ar') : strB.localeCompare(strA, 'ar');
    });
  }, [filteredRows, sortField, sortDirection]);

  // 3. Virtualization calculations
  const totalCount = sortedRows.length;
  const viewportHeight = typeof height === 'number' ? height : 500;
  const totalHeight = totalCount * rowHeight;

  // Buffer of 3 rows above and below viewport
  const buffer = 4;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
  const visibleItemCount = Math.ceil(viewportHeight / rowHeight) + buffer * 2;
  const endIndex = Math.min(totalCount, startIndex + visibleItemCount);

  // Slice only the visible window of rows
  const visibleRows = useMemo(() => {
    return sortedRows.slice(startIndex, endIndex);
  }, [sortedRows, startIndex, endIndex]);

  const offsetY = startIndex * rowHeight;

  // Optimized scroll handler using requestAnimationFrame
  const rafRef = useRef<number | null>(null);
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      setScrollTop(currentScrollTop);
    });
  }, []);

  const handleSort = useCallback((field: string) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
        return field;
      }
      setSortDirection('asc');
      return field;
    });
  }, []);

  return (
    <div className="flex flex-col w-full bg-white dark:bg-[#1e1e1e] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-3 bg-slate-50 dark:bg-[#181818] border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <MuiTextField
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={searchPlaceholder}
            density="compact"
            startAdornment={<Search className="w-4 h-4" />}
            className="matjark-data-grid-search"
          />
          {searchTerm && (
            <MuiIconButton
              icon={<X className="w-4 h-4" />}
              ariaLabel="مسح البحث"
              size="extraSmall"
              className="matjark-data-grid-clear"
              onClick={() => setSearchTerm('')}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          {toolbarActions}
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-[#252525] px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700">
            <span>إجمالي: </span>
            <strong className="text-blue-600 dark:text-blue-400">{totalCount.toLocaleString('ar-EG')}</strong>
            <span className="ms-1 text-[10px] text-slate-400">({visibleRows.length} في الذاكرة)</span>
          </div>
        </div>
      </div>

      {/* Header Row */}
      <div className="flex items-center bg-slate-100 dark:bg-[#151515] border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 select-none pe-2">
        {columns.map((col, idx) => {
          const isSorted = sortField === col.field;
          const sortable = col.sortable !== false;

          return (
            <div
              key={String(col.field) || idx}
              onClick={() => sortable && handleSort(String(col.field))}
              style={{
                width: col.width || 'auto',
                minWidth: col.minWidth || 90,
                flex: col.width ? 'none' : 1,
              }}
              className={`px-3 py-3 flex items-center gap-1.5 text-slate-700 dark:text-slate-200 ${
                sortable ? 'cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/80 transition-colors' : ''
              } ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : 'justify-start'}`}
            >
              <span className="truncate">{col.headerName}</span>
              {sortable && (
                <span className="text-slate-400">
                  {isSorted ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Virtualized Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ height: viewportHeight, maxHeight: viewportHeight }}
        className="relative overflow-y-auto overflow-x-hidden divide-y divide-slate-100 dark:divide-slate-800/50"
      >
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <div style={{ height: totalHeight, position: 'relative', width: '100%' }}>
            <div
              style={{
                transform: `translateY(${offsetY}px)`,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
              }}
            >
              {visibleRows.map((row, idx) => {
                const actualIndex = startIndex + idx;
                const rowKey = getRowId ? getRowId(row) : (row.id as string) || actualIndex;

                return (
                  <div
                    key={rowKey}
                    onClick={() => onRowClick && onRowClick(row)}
                    style={{ height: rowHeight }}
                    className={`flex items-center border-b border-slate-100 dark:border-slate-800/60 text-xs text-slate-800 dark:text-slate-200 transition-colors ${
                      onRowClick ? 'cursor-pointer hover:bg-blue-50/70 dark:hover:bg-blue-950/20' : 'hover:bg-slate-50 dark:hover:bg-[#232323]'
                    } ${actualIndex % 2 === 1 ? 'bg-slate-50/40 dark:bg-[#1a1a1a]/40' : ''}`}
                  >
                    {columns.map((col, cIdx) => (
                      <div
                        key={String(col.field) || cIdx}
                        style={{
                          width: col.width || 'auto',
                          minWidth: col.minWidth || 90,
                          flex: col.width ? 'none' : 1,
                        }}
                        className={`px-3 py-1 truncate flex items-center ${
                          col.align === 'center'
                            ? 'justify-center text-center'
                            : col.align === 'right'
                            ? 'justify-end text-end'
                            : 'justify-start text-start'
                        }`}
                      >
                        {col.renderCell ? col.renderCell(row, actualIndex) : String(row[col.field as string] ?? '-')}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-[#181818] border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>
          نافذة العرض الافتراضية النشطة: من {startIndex + 1} إلى {Math.min(endIndex, totalCount)}
        </span>
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
          Virtualization Active (DOM Nodes: ~{visibleRows.length * columns.length + columns.length})
        </span>
      </div>
    </div>
  );
}

export const MuiDataGrid = memo(MuiDataGridInner) as typeof MuiDataGridInner;
