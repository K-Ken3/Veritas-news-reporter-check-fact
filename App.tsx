
import React, { useState, useEffect, useRef } from 'react';
import { performFactCheck } from './services/geminiService';
import { FactCheckResult, HistoryItem, CitationFormat, Source } from './types';
import SourceCard from './components/SourceCard';
import VerdictBadge from './components/VerdictBadge';

const LOADING_MESSAGES = [
  "Extracting check-worthy claims...",
  "Querying institutional databases...",
  "Scanning global news corridors...",
  "Analyzing evidence strength...",
  "Cross-referencing NGO & Academic data...",
  "Synthesizing verification dossiers...",
  "Calculating evidentiary confidence...",
];

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [result, setResult] = useState<FactCheckResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<{ message: string; type: 'quota' | 'general' } | null>(null);
  const [citationFormat, setCitationFormat] = useState<CitationFormat>('Plain Text');
  
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('veritas_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleAnalyze = async () => {
    if (!inputText.trim() || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const data = await performFactCheck(inputText);
      setResult(data);
      
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        input: inputText,
        result: data,
      };
      
      const updatedHistory = [newHistoryItem, ...history].slice(0, 15);
      setHistory(updatedHistory);
      localStorage.setItem('veritas_history', JSON.stringify(updatedHistory));
      
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      const isQuota = err.message?.includes("QUOTA_EXCEEDED");
      setError({ 
        message: err.message || 'An error occurred during analysis.',
        type: isQuota ? 'quota' : 'general'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getCitation = (source: Source, index: number): string => {
    const pub = source.publisher || "Unknown Publisher";
    const date = source.publishedDate || "n.d.";
    switch(citationFormat) {
      case 'APA': return `(${index + 1}) ${pub}. (${date}). ${source.title}. Retrieved from ${source.uri}`;
      case 'MLA': return `(${index + 1}) "${source.title}." ${pub}, ${date}, ${source.uri}.`;
      case 'Markdown': return `[${index + 1}] [${source.title}](${source.uri}) - ${pub} (${date})`;
      default: return `[${index + 1}] ${source.title}. ${pub} (${date}). ${source.uri}`;
    }
  };

  const copyAllCitations = () => {
    if (!result) return;
    const text = result.sources.map((s, i) => getCitation(s, i)).join('\n');
    navigator.clipboard.writeText(text);
    alert('All citations copied!');
  };

  const exportFullReport = () => {
    if (!result) return;
    const report = `VERITAS INTELLECT REPORT
Generated: ${new Date().toLocaleString()}
Confidence: ${result.confidenceScore}%

SUMMARY:
${result.summary}

CLAIMS ANALYSIS:
${result.claims.map(c => `- CLAIM: ${c.text}\n  VERDICT: ${c.verdict.toUpperCase()}\n  REASONING: ${c.reasoning}`).join('\n\n')}

SOURCES:
${result.sources.map((s, i) => `[${i+1}] ${s.title} (${s.uri})`).join('\n')}
`;
    navigator.clipboard.writeText(report);
    alert('Full Intelligence Report copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100">
      <header className="bg-white border-b border-slate-200 py-3 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-sm italic">V</div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">VERITAS</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Evidence Discovery Engine</span>
            </div>
          </div>
          <div className="hidden md:flex gap-4 items-center">
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">V2.4 PRO</span>
            <button onClick={() => { setInputText(''); setResult(null); setError(null); }} className="text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors">Reset Terminal</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Verification Chamber</h2>
              <span className="text-[10px] text-slate-400 font-mono">{inputText.length} chars</span>
            </div>
            <div className="p-6">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste a claim or article paragraph to verify..."
                className="w-full h-44 p-0 text-xl serif leading-relaxed border-none focus:ring-0 resize-none placeholder:text-slate-300 text-slate-800"
              />
              {error && (
                <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in duration-300 border ${
                  error.type === 'quota' ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-rose-50 border-rose-100 text-rose-800'
                }`}>
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {error.type === 'quota' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    )}
                  </svg>
                  <div>
                    <p className="text-sm font-bold">{error.type === 'quota' ? 'Quota Limit Reached' : 'Analysis Failed'}</p>
                    <p className="text-xs opacity-90 leading-relaxed mt-1">{error.message}</p>
                    {error.type === 'quota' && (
                      <div className="mt-3 flex gap-3">
                         <button onClick={handleAnalyze} className="text-[10px] font-black uppercase tracking-widest bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded transition-colors">Retry Now</button>
                         <a href="https://aistudio.google.com/app/plan" target="_blank" className="text-[10px] font-black uppercase tracking-widest bg-white/50 hover:bg-white px-3 py-1.5 rounded transition-colors">Check My Quota</a>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-between items-center border-t border-slate-100 pt-6">
                <p className="text-xs text-slate-400 max-w-xs text-center sm:text-left italic">
                  Systems prioritize .gov and .edu data for verified results.
                </p>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !inputText.trim()}
                  className={`w-full sm:w-auto px-10 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                    isAnalyzing || !inputText.trim() 
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200'
                  }`}
                >
                  {isAnalyzing ? (
                    <span className="flex items-center justify-center gap-3">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      {LOADING_MESSAGES[loadingMsgIdx]}
                    </span>
                  ) : 'Scan Evidence'}
                </button>
              </div>
            </div>
          </section>

          {result && (
            <div ref={resultsRef} className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-both">
              <div className="bg-slate-900 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] -mr-32 -mt-32"></div>
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex-1">
                      <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Evidence Synthesis Summary</h3>
                      <p className="text-2xl font-bold leading-tight max-w-xl serif italic">
                        "{result.summary}"
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-center justify-center bg-white/5 border border-white/10 p-5 rounded-2xl min-w-[140px]">
                      <span className="text-[10px] font-black uppercase text-blue-300 mb-1 tracking-widest">Evidence Score</span>
                      <span className="text-4xl font-black text-white">{result.confidenceScore}%</span>
                      <div className="w-full h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
                         <div className="h-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" style={{ width: `${result.confidenceScore}%` }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={exportFullReport} className="text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 transition-colors px-4 py-2 rounded-lg flex items-center gap-2">
                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                       Copy Full Report
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Evidence Dossier</h3>
                {result.claims.map((claim, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-6 hover:border-blue-200 transition-colors shadow-sm group">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                           <VerdictBadge verdict={claim.verdict} />
                           <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${claim.evidenceStrength === 'high' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : claim.evidenceStrength === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                             {claim.evidenceStrength} support
                           </span>
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 leading-snug mb-3">
                          {claim.text}
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed mb-4 bg-slate-50 p-4 rounded-lg border border-slate-100 italic">
                          {claim.reasoning}
                        </p>
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Sources Found:</span>
                          {claim.sourceIndices.map(sIdx => (
                            <button 
                              key={sIdx} 
                              className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-500 text-[11px] font-bold flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                              onClick={() => {
                                const el = document.getElementById(`source-${sIdx}`);
                                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                el?.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50');
                                setTimeout(() => el?.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50'), 2000);
                              }}
                            >
                              {sIdx + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Reference Bibliography</h3>
                    <p className="text-sm text-slate-500">Curated credible sources identified during the evidence discovery phase.</p>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <select 
                      value={citationFormat}
                      onChange={(e) => setCitationFormat(e.target.value as CitationFormat)}
                      className="text-xs font-bold border-none bg-transparent focus:ring-0 pr-8"
                    >
                      <option value="Plain Text">Plain Text</option>
                      <option value="APA">APA Style</option>
                      <option value="MLA">MLA Style</option>
                      <option value="Markdown">Markdown</option>
                    </select>
                    <button 
                      onClick={copyAllCitations}
                      className="bg-slate-900 text-white p-2 rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
                      title="Copy all citations"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {result.sources.map((source, i) => (
                    <div id={`source-${i}`} key={i} className="transition-all duration-500 rounded-xl">
                      <SourceCard source={source} index={i} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl shadow-xl p-6 text-white overflow-hidden relative border border-slate-700">
            <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
              <span className="text-blue-400 font-mono text-sm">[01]</span>
              Expert Protocol
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed mb-6 italic serif">
              "Evidentiary discovery focuses on cross-referencing claims against established reporting and official data points."
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                <span className="block text-2xl font-black text-white">{history.length}</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest">Saved Reports</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                <span className="block text-2xl font-black text-blue-400">99.8</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest">Uptime</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Archive</h3>
              {history.length > 0 && (
                <button onClick={() => { if(confirm('Wipe history?')) {setHistory([]); localStorage.removeItem('veritas_history');}}} className="text-[10px] font-bold text-slate-300 hover:text-rose-500 transition-colors uppercase">Clear Dossier</button>
              )}
            </div>
            {history.length > 0 ? (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setInputText(item.input); setResult(item.result); setError(null); }}
                    className="w-full text-left p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all group"
                  >
                    <p className="text-xs font-bold text-slate-800 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                      {item.input}
                    </p>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-medium font-mono">
                        {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                      <span className={`font-black px-1.5 py-0.5 rounded-md ${item.result.confidenceScore > 75 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {item.result.confidenceScore}% EV
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-300">
                <p className="text-xs italic">No archive entries found.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto w-full px-6 py-12 border-t border-slate-200 mt-20 text-center sm:text-left">
         <div className="flex flex-col sm:flex-row justify-between items-center gap-10">
            <div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Veritas Intelligence Division</p>
              <p className="text-[10px] text-slate-400 max-w-sm leading-relaxed">
                Empowering investigative journalists with evidentiary discovery through neutral automated cross-referencing.
              </p>
            </div>
            <div className="flex gap-8 text-[10px] font-black uppercase text-slate-400 tracking-tighter">
               <a href="#" className="hover:text-blue-600 transition-colors">Methodology</a>
               <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="hover:text-blue-600 transition-colors">Billing Protocol</a>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default App;
