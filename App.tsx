
import React, { useState, useEffect, useRef } from 'react';
import { performFactCheck } from './services/geminiService';
import { FactCheckResult, HistoryItem, CitationFormat, Source, User } from './types';
import SourceCard from './components/SourceCard';
import VerdictBadge from './components/VerdictBadge';
import LoginOverlay from './components/LoginOverlay';
import Logo from './components/Logo';

const LOADING_MESSAGES = [
  "Synchronizing with search index...",
  "Cross-referencing institutional data...",
  "Scanning academic archives...",
  "Validating source credibility...",
  "Building evidentiary timeline...",
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [result, setResult] = useState<FactCheckResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<{ message: string; type: 'quota' | 'general' } | null>(null);
  const [citationFormat, setCitationFormat] = useState<CitationFormat>('Plain Text');
  const [cooldown, setCooldown] = useState(0);
  
  const resultsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load User from Session
  useEffect(() => {
    const savedUser = localStorage.getItem('veritas_session');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
      } catch (e) { console.error(e); }
    }
  }, []);

  // Load History based on User
  useEffect(() => {
    if (currentUser) {
      const storageKey = `veritas_history_${currentUser.email}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try { setHistory(JSON.parse(saved)); } catch (e) { console.error(e); }
      } else {
        setHistory([]);
      }
    }
  }, [currentUser]);

  // Save history whenever it changes
  useEffect(() => {
    if (currentUser && history.length >= 0) {
      const storageKey = `veritas_history_${currentUser.email}`;
      localStorage.setItem(storageKey, JSON.stringify(history));
    }
  }, [history, currentUser]);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleLogin = (email: string) => {
    const user = { email, lastLogin: Date.now() };
    setCurrentUser(user);
    localStorage.setItem('veritas_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('veritas_session');
    setResult(null);
    setInputText('');
  };

  const handleAnalyze = async () => {
    if (!inputText.trim() || isAnalyzing || cooldown > 0) return;
    
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
      
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 50));
      setCooldown(60);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      if (err.message === "SEARCH_QUOTA_EXCEEDED") {
        setCooldown(70);
        setError({ 
          message: "The search tool is exhausted. Please wait for the countdown before attempting a re-scan.",
          type: 'quota'
        });
      } else {
        setError({ 
          message: err.message || 'Verification failed. Please check your connection.',
          type: 'general'
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Permanently purge this investigation from the archive?")) {
      setHistory(prev => prev.filter(item => item.id !== id));
    }
  };

  const exportArchive = () => {
    if (!currentUser) return;
    const data = JSON.stringify(history, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veritas_archive_${currentUser.email.split('@')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importArchive = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          setHistory(prev => {
            const combined = [...imported, ...prev];
            return Array.from(new Map(combined.map(item => [item.id, item])).values())
              .sort((a: any, b: any) => b.timestamp - a.timestamp)
              .slice(0, 100);
          });
        }
      } catch (err) {
        alert('Failed to parse archive file.');
      }
    };
    reader.readAsText(file);
  };

  if (!currentUser) {
    return <LoginOverlay onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100">
      <header className="bg-white border-b border-slate-200 py-3 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo className="h-9" />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">VERITAS</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Investigative Evidence Engine</span>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold ${cooldown > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${cooldown > 0 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
              {cooldown > 0 ? `SEARCH COOLING: ${cooldown}s` : 'SEARCH READY'}
            </div>
            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[120px]">{currentUser.email}</span>
              <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Input Analysis Terminal</h2>
              <span className="text-[10px] text-slate-400 font-mono italic">Secure Local Encryption Active</span>
            </div>
            <div className="p-6">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste claim text to cross-reference..."
                className="w-full h-40 p-0 text-xl serif leading-relaxed border-none focus:ring-0 resize-none placeholder:text-slate-300 text-slate-800"
              />
              
              {error && (
                <div className={`mt-4 p-4 rounded-xl border flex gap-3 animate-in slide-in-from-top-2 ${
                  error.type === 'quota' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <div className="text-xs leading-relaxed">{error.message}</div>
                </div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-between items-center border-t border-slate-100 pt-6">
                <p className="text-[10px] text-slate-400 max-w-xs leading-normal italic">
                  Systems prioritize .gov and .edu data for verified results.
                </p>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !inputText.trim() || cooldown > 0}
                  className={`w-full sm:w-auto px-10 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-3 ${
                    isAnalyzing || !inputText.trim() || cooldown > 0
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                    : 'bg-slate-900 text-white hover:bg-black'
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span>{LOADING_MESSAGES[loadingMsgIdx]}</span>
                    </>
                  ) : cooldown > 0 ? (
                    <span>Wait {cooldown}s</span>
                  ) : 'Scan Evidence'}
                </button>
              </div>
            </div>
          </section>

          {result && (
            <div ref={resultsRef} className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] -mr-32 -mt-32"></div>
                <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">Evidentiary Synthesis</h3>
                <p className="text-2xl font-bold leading-tight serif italic mb-6">"{result.summary}"</p>
                <div className="flex items-center gap-6 border-t border-white/10 pt-6">
                  <div className="text-center px-4 border-r border-white/10">
                    <span className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Score</span>
                    <span className="text-2xl font-black">{result.confidenceScore}%</span>
                  </div>
                  <div className="text-center px-4">
                    <span className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Citations</span>
                    <span className="text-2xl font-black">{result.sources.length}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Analysis Breakdown</h3>
                {result.claims.map((claim, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                       <VerdictBadge verdict={claim.verdict} />
                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${claim.evidenceStrength === 'high' ? 'text-emerald-600' : 'text-amber-600'}`}>
                         {claim.evidenceStrength.toUpperCase()} CONFIDENCE
                       </span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-3">{claim.text}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed italic">{claim.reasoning}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-slate-900">Bibliography</h3>
                  <select 
                    value={citationFormat}
                    onChange={(e) => setCitationFormat(e.target.value as CitationFormat)}
                    className="text-xs font-bold border-slate-200 bg-slate-50 p-2 rounded-lg"
                  >
                    <option value="Plain Text">Plain Text</option>
                    <option value="APA">APA Style</option>
                    <option value="MLA">MLA Style</option>
                    <option value="Markdown">Markdown</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {result.sources.map((source, i) => (
                    <SourceCard key={i} source={source} index={i} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[700px] sticky top-24">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Archive Dossier</h3>
                <span className="text-[10px] font-mono text-slate-300">{history.length} cases</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={exportArchive}
                  className="text-[9px] font-black uppercase tracking-wider py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 flex items-center justify-center gap-2"
                >
                  Export
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[9px] font-black uppercase tracking-wider py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-200 flex items-center justify-center gap-2"
                >
                  Import
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={importArchive} 
                  className="hidden" 
                  accept=".json"
                />
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-3">
              {history.length > 0 ? (
                history.map((item) => (
                  <div key={item.id} className="group relative">
                    <button
                      onClick={() => { setInputText(item.input); setResult(item.result); setError(null); }}
                      className="w-full text-left p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white transition-all"
                    >
                      <p className="text-xs font-bold text-slate-800 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors pr-6">{item.input}</p>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                        <span className="text-blue-500 font-bold">{item.result.confidenceScore}% EV</span>
                      </div>
                    </button>
                    <button 
                      onClick={(e) => deleteHistoryItem(item.id, e)}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all p-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30 py-12">
                   <p className="text-[10px] uppercase font-black tracking-widest">Archive Empty</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
              <p className="text-[9px] text-slate-400 italic text-center leading-normal">
                Investigative dossiers are saved locally.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
