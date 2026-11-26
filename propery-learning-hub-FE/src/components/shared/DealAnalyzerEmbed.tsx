'use client';

import React, { useState } from 'react';
import { OpenInNew, Calculate } from '@mui/icons-material';

export const DEAL_ANALYZER_URL = 'https://dealanalyser.com/';

interface DealAnalyzerEmbedProps {
  /** Negative margin to cancel parent layout padding for a full-bleed frame */
  bleedClassName?: string;
  /** Fill remaining viewport height (parent should be flex column with defined height) */
  fillViewport?: boolean;
}

const DealAnalyzerEmbed: React.FC<DealAnalyzerEmbedProps> = ({
  bleedClassName = '',
  fillViewport = false,
}) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={`flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden ${
        fillViewport ? 'h-full min-h-0 flex-1' : ''
      } ${bleedClassName}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Calculate className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-800 truncate">Deal Analyzer</h1>
            <p className="text-xs text-slate-500 truncate">
              Property investment calculator ·{' '}
              <a
                href={DEAL_ANALYZER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                dealanalyser.com
              </a>
            </p>
          </div>
        </div>
        <a
          href={DEAL_ANALYZER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shrink-0"
        >
          <OpenInNew className="w-4 h-4" />
          Open in new tab
        </a>
      </div>

      <div
        className={`relative flex-1 min-h-0 bg-slate-100 ${
          fillViewport ? '' : 'min-h-[calc(100dvh-11rem)]'
        }`}
      >
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500 z-10">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Loading Deal Analyzer…</p>
          </div>
        )}
        <iframe
          title="Property Deal Analyser"
          src={DEAL_ANALYZER_URL}
          className="w-full h-full border-0 bg-white"
          onLoad={() => setLoaded(true)}
          allow="clipboard-read; clipboard-write"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
};

export default DealAnalyzerEmbed;
