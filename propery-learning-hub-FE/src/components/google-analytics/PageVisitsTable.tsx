import React, { useState } from 'react';
import { ExternalLink, TrendingUp, ArrowUpDown } from 'lucide-react';

interface PageVisit {
  url: string;
  visits: number;
}

interface PageVisitsTableProps {
  data: PageVisit[];
}

type SortField = 'url' | 'visits';
type SortOrder = 'asc' | 'desc';

const PageVisitsTable: React.FC<PageVisitsTableProps> = ({ data }) => {
  const [sortField, setSortField] = useState<SortField>('visits');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const comparison = sortField === 'url' ? a.url.localeCompare(b.url) : a.visits - b.visits;
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const SortButton: React.FC<{ field: SortField; label: string }> = ({ field, label }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 sm:gap-2 hover:text-blue-600 transition-colors group text-xs sm:text-sm"
    >
      {label}
      <ArrowUpDown
        className={`w-3 h-3 sm:w-4 sm:h-4 transition-all flex-shrink-0 ${
          sortField === field ? 'text-blue-600 scale-110' : 'text-slate-400 group-hover:text-blue-600'
        }`}
      />
    </button>
  );

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-slate-200 hover:shadow-lg transition-shadow duration-300">
      <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-4 sm:mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
        Page Visits
      </h2>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle px-4 sm:px-0">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-slate-500">
                  <SortButton field="url" label="Page URL" />
                </th>
                <th className="py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-slate-500 text-center">
                  <SortButton field="visits" label="Visits" />
                </th>
                <th className="text-center py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((page, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 sm:py-4 px-2 sm:px-4">
                    <span
                      className="text-xs sm:text-sm font-medium text-slate-800 break-all line-clamp-2"
                      title={page.url}
                    >
                      {page.url.length > 50 ? `${page.url.substring(0, 50)}...` : page.url}
                    </span>
                  </td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-center">
                    <div className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-blue-50">
                      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                      <span className="text-xs sm:text-sm font-bold text-blue-600">
                        {page.visits.toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-center">
                    <button
                      onClick={() => window.open(page.url, '_blank')}
                      className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-xs sm:text-sm font-medium"
                    >
                      <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      Visit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sortedData.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-slate-400">No page visit data available</p>
        </div>
      )}
    </div>
  );
};

export default PageVisitsTable;
