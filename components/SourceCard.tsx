
import React from 'react';
import { Source } from '../types';

interface SourceCardProps {
  source: Source;
  index: number;
}

const SourceCard: React.FC<SourceCardProps> = ({ source, index }) => {
  const getCategoryColor = (cat?: string) => {
    switch(cat) {
      case 'government': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'academic': return 'bg-cyan-50 text-cyan-600 border-cyan-100';
      case 'ngo': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'news': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:border-blue-200 transition-all flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2">
        <span className="flex-shrink-0 bg-slate-900 text-white font-bold text-[10px] rounded h-5 w-5 flex items-center justify-center">
          {index + 1}
        </span>
        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${getCategoryColor(source.category)}`}>
          {source.category || 'Other'}
        </span>
        {source.publishedDate && (
          <span className="text-[10px] text-slate-400 font-medium ml-auto">
            {source.publishedDate}
          </span>
        )}
      </div>
      
      <h4 className="text-sm font-bold text-slate-900 leading-tight mb-2 line-clamp-2">
        {source.title}
      </h4>
      
      <p className="text-xs text-slate-600 mb-3 line-clamp-3 italic flex-grow">
        "{source.snippet || "Reference content extracted."}"
      </p>

      <div className="pt-3 border-t border-slate-50 mt-auto">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-slate-400 truncate max-w-[120px]">
            {source.publisher || 'Direct Source'}
          </span>
          <a 
            href={source.uri} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors underline"
          >
            Visit Source
          </a>
        </div>
      </div>
    </div>
  );
};

export default SourceCard;
