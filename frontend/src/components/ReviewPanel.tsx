import React, { useState } from 'react';
import { X, CheckCircle, XCircle, MessageSquare, ExternalLink } from 'lucide-react';
import { reviewVerdict } from '../utils/api';

export const ReviewPanel = ({ verdict, onClose, onUpdate }: { verdict: any, onClose: () => void, onUpdate: () => void }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAction = async (status: string) => {
    setLoading(true);
    try {
      await reviewVerdict(verdict.id, status, reason, "Human Reviewer");
      onUpdate();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[500px] bg-gray-900 border-l border-gray-700 shadow-2xl z-50 p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Evidence Review</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="space-y-8">
        {/* Verdict Summary */}
        <section>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">AI Verdict</h3>
          <div className={`p-4 rounded-xl border ${verdict.status === 'pass' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <div className="flex items-center gap-2 font-bold capitalize text-lg mb-2">
              {verdict.status.replace('_', ' ')}
              <span className="text-sm font-normal text-gray-400 ml-auto">{(verdict.confidence * 100).toFixed(0)}% Confidence</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">{verdict.reasoning}</p>
          </div>
        </section>

        {/* Evidence Excerpt */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Extracted Evidence</h3>
            <span className="text-xs bg-gray-800 px-2 py-1 rounded text-blue-400 flex items-center gap-1">
              Page {verdict.evidence_citation.page} <ExternalLink size={10} />
            </span>
          </div>
          <div className="p-5 bg-gray-950 rounded-xl border border-gray-800 font-mono text-sm text-gray-400 italic relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-xl"></div>
            "{verdict.evidence_citation.excerpt}"
          </div>
        </section>

        {/* Review Action */}
        <section className="pt-6 border-t border-gray-800">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Human Override</h3>
          <textarea 
            placeholder="Add reasoning for status change..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500 h-32 mb-4"
          />
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleAction('pass')}
              className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-all"
            >
              <CheckCircle size={18} /> Confirm Pass
            </button>
            <button 
              onClick={() => handleAction('fail')}
              className="flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold transition-all"
            >
              <XCircle size={18} /> Mark Fail
            </button>
          </div>
        </section>

        {/* Audit Trail Note */}
        <p className="text-[10px] text-gray-500 text-center italic">
          All changes are recorded in the immutable audit log with your identifier.
        </p>
      </div>
    </div>
  );
};
