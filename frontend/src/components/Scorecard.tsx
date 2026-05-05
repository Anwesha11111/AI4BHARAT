import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Search } from 'lucide-react';

interface Verdict {
  id: number;
  bidder_id: number;
  criterion_id: number;
  status: 'pass' | 'fail' | 'review_needed';
  confidence: number;
  reasoning: string;
  evidence_citation: any;
}

interface ScorecardProps {
  data: {
    tender_id: number;
    criteria: any[];
    bidders: any[];
  };
  onSelectVerdict: (verdict: Verdict) => void;
}

export const Scorecard = ({ data, onSelectVerdict }: ScorecardProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle2 className="text-emerald-400" size={18} />;
      case 'fail': return <XCircle className="text-red-400" size={18} />;
      default: return <AlertCircle className="text-amber-400" size={18} />;
    }
  };

  return (
    <div className="overflow-x-auto bg-gray-800 rounded-2xl border border-gray-700 shadow-xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-700 bg-gray-900/50">
            <th className="p-4 font-semibold text-gray-400 sticky left-0 bg-gray-900 z-10">Criteria \ Bidder</th>
            {data.bidders.map(b => (
              <th key={b.bidder_id} className="p-4 font-bold text-blue-400 min-w-[200px]">
                {b.vendor_name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.criteria.map(criterion => (
            <tr key={criterion.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
              <td className="p-4 max-w-md sticky left-0 bg-gray-800 z-10 shadow-lg">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{criterion.text}</span>
                  <span className={`text-[10px] mt-1 px-2 py-0.5 rounded-full w-fit ${criterion.type === 'mandatory' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {criterion.type.toUpperCase()}
                  </span>
                </div>
              </td>
              {data.bidders.map(bidder => {
                const verdict = bidder.verdicts.find((v: any) => v.criterion_id === criterion.id);
                return (
                  <td key={`${bidder.bidder_id}-${criterion.id}`} className="p-4">
                    {verdict ? (
                      <div 
                        onClick={() => onSelectVerdict(verdict)}
                        className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-700 transition-all border border-transparent hover:border-gray-600"
                      >
                        {getStatusIcon(verdict.status)}
                        <div className="flex flex-col">
                          <span className="text-xs capitalize font-semibold">{verdict.status.replace('_', ' ')}</span>
                          <span className="text-[10px] text-gray-400">Conf: {(verdict.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <Search size={14} className="ml-auto text-gray-500" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-600 animate-pulse">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-xs">Evaluating...</span>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Loader2 = ({ size, className }: { size: number, className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
