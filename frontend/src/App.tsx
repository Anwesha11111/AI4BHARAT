import React, { useState, useEffect } from 'react';
import { UploadForm } from './components/UploadForm';
import { Scorecard } from './components/Scorecard';
import { ReviewPanel } from './components/ReviewPanel';
import { getScorecard } from './utils/api';
import { Brain, ShieldCheck, History, Database, LayoutDashboard } from 'lucide-react';

const App = () => {
  const [activeTenderId, setActiveTenderId] = useState<number | null>(null);
  const [scorecardData, setScorecardData] = useState<any>(null);
  const [selectedVerdict, setSelectedVerdict] = useState<any>(null);
  const [refreshInterval, setRefreshInterval] = useState<any>(null);

  const fetchScorecard = async (id: number) => {
    try {
      const data = await getScorecard(id);
      setScorecardData(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTenderId) {
      fetchScorecard(activeTenderId);
      const interval = setInterval(() => fetchScorecard(activeTenderId), 5000);
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    }
  }, [activeTenderId]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Sidebar Navigation */}
      <nav className="fixed left-0 top-0 h-full w-20 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-8 gap-10 z-50">
        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
          <Brain className="text-white" size={32} />
        </div>
        <div className="flex flex-col gap-8 text-gray-500">
          <LayoutDashboard className="hover:text-blue-400 cursor-pointer transition-colors" size={24} />
          <ShieldCheck className="hover:text-emerald-400 cursor-pointer transition-colors" size={24} />
          <History className="hover:text-amber-400 cursor-pointer transition-colors" size={24} />
          <Database className="hover:text-purple-400 cursor-pointer transition-colors" size={24} />
        </div>
      </nav>

      {/* Main Content */}
      <main className="ml-20 p-10 max-w-[1600px] mx-auto">
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-2">
            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-full uppercase tracking-widest border border-blue-500/20">
              V1.0 Production Prototype
            </span>
          </div>
          <h1 className="text-5xl font-black mb-2 tracking-tight">
            Tender<span className="text-blue-500">Mind</span>
          </h1>
          <p className="text-gray-400 text-lg">AI-powered co-pilot for government procurement evaluation and audit.</p>
        </header>

        <UploadForm onTenderUpload={(id) => setActiveTenderId(id)} />

        {scorecardData && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                Evaluation Scorecard
                {scorecardData.bidders.some((b: any) => b.verdicts.length === 0) && (
                  <span className="text-xs bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20 animate-pulse">
                    Processing Bidders...
                  </span>
                )}
              </h2>
            </div>
            <Scorecard 
              data={scorecardData} 
              onSelectVerdict={(v) => setSelectedVerdict(v)} 
            />
          </section>
        )}
      </main>

      {/* Review Sidebar overlay */}
      {selectedVerdict && (
        <ReviewPanel 
          verdict={selectedVerdict} 
          onClose={() => setSelectedVerdict(null)}
          onUpdate={() => activeTenderId && fetchScorecard(activeTenderId)}
        />
      )}

      {/* Background Decor */}
      <div className="fixed top-0 right-0 -z-10 w-[800px] h-[800px] bg-blue-600/5 blur-[150px] rounded-full"></div>
      <div className="fixed bottom-0 left-0 -z-10 w-[600px] h-[600px] bg-emerald-600/5 blur-[120px] rounded-full"></div>
    </div>
  );
};

export default App;
