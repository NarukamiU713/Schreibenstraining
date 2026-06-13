import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, CheckCircle2, ChevronRight, PenLine, FileText, BarChart3, Grip, X, Clock, Trash2, Settings, Moon, Sun, Copy, AlertTriangle } from 'lucide-react';
import { BewertungResponse, Korrektur, HistoryItem } from './types';

function getHighlightedTextChunks(text: string, korrekturen: Korrektur[]) {
  const matches: { start: number; end: number; korr: Korrektur }[] = [];
  korrekturen.forEach((korr) => {
    const index = text.indexOf(korr.original);
    if (index !== -1) {
      matches.push({ start: index, end: index + korr.original.length, korr });
    }
  });

  matches.sort((a, b) => a.start - b.start);

  const nonOverlapping: typeof matches = [];
  let lastEnd = -1;
  matches.forEach((m) => {
    if (m.start >= lastEnd) {
      nonOverlapping.push(m);
      lastEnd = m.end;
    }
  });

  const chunks: { text: string; korr?: Korrektur }[] = [];
  let currentIdx = 0;
  nonOverlapping.forEach((m) => {
    if (m.start > currentIdx) {
      chunks.push({ text: text.substring(currentIdx, m.start) });
    }
    chunks.push({ text: text.substring(m.start, m.end), korr: m.korr });
    currentIdx = m.end;
  });

  if (currentIdx < text.length) {
    chunks.push({ text: text.substring(currentIdx) });
  }

  return chunks;
}

export default function App() {
  const [text, setText] = useState('');
  const [taskPrompt, setTaskPrompt] = useState('');
  const [teil, setTeil] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BewertungResponse | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'input' | 'score' | 'corrections' | 'sample' | 'history'>('input');
  const [selectedKorrektur, setSelectedKorrektur] = useState<any>(null);
  const [suggestionTop, setSuggestionTop] = useState<number>(0);

  // Compare Mode State
  const [appMode, setAppMode] = useState<'evaluate' | 'compare'>('evaluate');
  const [compareOriginal, setCompareOriginal] = useState('');
  const [compareModified, setCompareModified] = useState('');
  const [compareResult, setCompareResult] = useState<any>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [activeCompareTab, setActiveCompareTab] = useState<'input' | 'report' | 'history'>('input');

  // Settings & Theme
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [provider, setProvider] = useState<'gemini' | 'deepseek'>(() => (localStorage.getItem('apiProvider') as any) || 'gemini');
  const [customGeminiKey, setCustomGeminiKey] = useState(() => localStorage.getItem('geminiKey') || '');
  const [customDeepseekKey, setCustomDeepseekKey] = useState(() => localStorage.getItem('deepseekKey') || '');

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => { localStorage.setItem('apiProvider', provider); }, [provider]);
  useEffect(() => { localStorage.setItem('geminiKey', customGeminiKey); }, [customGeminiKey]);
  useEffect(() => { localStorage.setItem('deepseekKey', customDeepseekKey); }, [customDeepseekKey]);

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('evalHistory');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [compareHistory, setCompareHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('compareHistory');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('Bitte gib deinen Text ein.');
      return;
    }
    setError('');
    setIsLoading(true);
    setResult(null);
    try {
      const customApiKey = provider === 'gemini' ? customGeminiKey : customDeepseekKey;

      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, teil, taskPrompt, provider, customApiKey }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Fehler bei der Bewertung.');
      }
      const data: BewertungResponse = await res.json();
      setResult(data);
      
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(),
        text,
        taskPrompt,
        teil,
        result: data,
      };
      const newHistory = [newHistoryItem, ...history];
      setHistory(newHistory);
      localStorage.setItem('evalHistory', JSON.stringify(newHistory));
      
      setActiveTab('score');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!compareOriginal.trim() || !compareModified.trim()) {
      setError('Bitte gib beide Texte ein.');
      return;
    }
    setError('');
    setIsComparing(true);
    setCompareResult(null);
    try {
      const customApiKey = provider === 'gemini' ? customGeminiKey : customDeepseekKey;

      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalText: compareOriginal, modifiedText: compareModified, provider, customApiKey }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Fehler beim Vergleich.');
      }
      const data = await res.json();
      setCompareResult(data);
      
      const newCompareHistoryItem = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(),
        originalText: compareOriginal,
        modifiedText: compareModified,
        result: data,
      };
      const newCompareHistory = [newCompareHistoryItem, ...compareHistory];
      setCompareHistory(newCompareHistory);
      localStorage.setItem('compareHistory', JSON.stringify(newCompareHistory));

      setActiveCompareTab('report');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsComparing(false);
    }
  };

  const handleCopyReport = () => {
    if (!compareResult) return;
    let md = `# Korrektur-Bericht\n\n`;
    
    md += `## Wichtigste Verbesserungen\n`;
    compareResult.verbesserungen?.forEach((v: string) => md += `- ${v}\n`);
    md += `\n`;

    md += `## Stärken des Originaltextes\n`;
    compareResult.staerken?.forEach((s: string) => md += `- ${s}\n`);
    md += `\n`;

    md += `## Gefundene Korrekturen\n`;
    compareResult.korrekturen?.forEach((korr: any) => {
      md += `\n### Korrektur\n`;
      md += `**Vorher (Original):** ~~${korr.original}~~  \n`;
      md += `**Nachher (Korrektur):** ${korr.vorschlag}  \n`;
      md += `> **Erklärung:** ${korr.erklaerung}\n`;
    });

    navigator.clipboard.writeText(md);
    alert('Bericht als Markdown in die Zwischenablage kopiert!');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-black text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Header */}
      <header className="h-20 flex items-center justify-end px-6 shrink-0 fixed top-0 w-full z-10 pointer-events-none transition-colors duration-200">
        <div className="flex items-center space-x-2 text-sm font-medium bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 rounded-full px-3 py-2 shadow-sm border border-slate-200 dark:border-white/10 pointer-events-auto mt-2">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition">
            <Settings size={18} />
          </button>
          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center border-2 border-white dark:border-white/10 ml-1 shadow-sm">JS</div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-6 flex items-center text-slate-800 dark:text-white">
              <Settings className="mr-2" size={24} />
              Konfiguration
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">KI-Modell ausw\u00e4hlen</label>
                <div className="flex gap-2">
                  <button onClick={() => setProvider('gemini')} className={`flex-1 py-2 rounded-lg border-2 font-semibold transition ${provider === 'gemini' ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-400'}`}>Gemini 2.5</button>
                  <button onClick={() => setProvider('deepseek')} className={`flex-1 py-2 rounded-lg border-2 font-semibold transition ${provider === 'deepseek' ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-400'}`}>DeepSeek</button>
                </div>
              </div>

              {provider === 'gemini' && (
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Gemini API Key (Optional)</label>
                  <input type="password" value={customGeminiKey} onChange={(e) => setCustomGeminiKey(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Lass leer für Standard-Key" />
                </div>
              )}

              {provider === 'deepseek' && (
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">DeepSeek API Key</label>
                  <input type="password" value={customDeepseekKey} onChange={(e) => setCustomDeepseekKey(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="sk-..." />
                </div>
              )}
            </div>

            <button onClick={() => setShowSettings(false)} className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition">Speichern & Schließen</button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        
        {/* Mode Switcher */}
        <div className="flex justify-center mb-10">
           <div className="flex bg-slate-200/50 dark:bg-zinc-800 p-1 rounded-xl w-fit border border-slate-200 dark:border-white/10 shadow-sm">
             <button onClick={() => setAppMode('evaluate')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${appMode === 'evaluate' ? 'bg-white dark:bg-zinc-700 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>KI-Bewertung (Auto)</button>
             <button onClick={() => setAppMode('compare')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${appMode === 'compare' ? 'bg-white dark:bg-zinc-700 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Korrektur-Bericht (Manuell)</button>
           </div>
        </div>

        {appMode === 'evaluate' && (
          <div className="animate-in fade-in duration-300">
            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 bg-slate-200/50 dark:bg-zinc-800 p-1 rounded-xl w-fit mx-auto mb-8">
              <TabButton active={activeTab === 'input'} onClick={() => setActiveTab('input')} icon={<FileText size={18} />} label="Eingabe" />
              <TabButton disabled={!result} active={activeTab === 'score'} onClick={() => setActiveTab('score')} icon={<BarChart3 size={18} />} label="Bewertung" />
              <TabButton disabled={!result} active={activeTab === 'corrections'} onClick={() => setActiveTab('corrections')} icon={<CheckCircle2 size={18} />} label="Korrekturen" />
              <TabButton disabled={!result} active={activeTab === 'sample'} onClick={() => setActiveTab('sample')} icon={<Grip size={18} />} label="Musterlösung" />
              <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<Clock size={18} />} label="Verlauf" />
            </div>

        {/* --- Tab 1: Input --- */}
        {activeTab === 'input' && (
          <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 p-6 sm:p-8">
              
              {/* Teil Selector */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Prüfungsteil</label>
                <div className="flex space-x-3">
                  <button onClick={() => setTeil(1)} className={`flex-1 py-3 px-4 rounded-xl flex flex-col items-start border-2 transition-all ${teil === 1 ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                    <span className={`font-semibold ${teil === 1 ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>Teil 1</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400 mt-1">Umfangreicher Text, max 60 Punkte</span>
                  </button>
                  <button onClick={() => setTeil(2)} className={`flex-1 py-3 px-4 rounded-xl flex flex-col items-start border-2 transition-all ${teil === 2 ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                    <span className={`font-semibold ${teil === 2 ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>Teil 2</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400 mt-1">Stellungnahme, max 40 Punkte</span>
                  </button>
                </div>
              </div>

              {/* Task Prompt */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Aufgabenstellung (Optional)</label>
                <textarea
                  className="w-full bg-[#F8FAFC] dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none resize-y"
                  rows={3}
                  placeholder="Füge hier die genaue Aufgabenstellung ein, damit sie bei der Bewertung berücksichtigt werden kann."
                  value={taskPrompt}
                  onChange={(e) => setTaskPrompt(e.target.value)}
                />
              </div>

              {/* User Text */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Dein Text</label>
                <textarea
                  className="w-full bg-[#F8FAFC] dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl p-4 font-serif focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none resize-y min-h-[250px]"
                  placeholder="Schreibe oder kopiere deinen Text hier hinein..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <div className="mt-3 flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    Wörter: <span className="font-bold">{text.trim() ? text.trim().split(/\s+/).length : 0}</span>
                  </span>
                  {text.trim() && (() => {
                    const wordCount = text.trim().split(/\s+/).length;
                    if (teil === 1) {
                      if (wordCount < 200) return <span className="text-orange-500 flex items-center gap-1"><AlertTriangle size={14} /> Zu kurz (ca. 200-250 Wörter erwartet)</span>;
                      if (wordCount > 350) return <span className="text-orange-500 flex items-center gap-1"><AlertTriangle size={14} /> Evtl. zu lang (ca. 200-250 Wörter erwartet)</span>;
                    } else {
                      if (wordCount < 100) return <span className="text-orange-500 flex items-center gap-1"><AlertTriangle size={14} /> Zu kurz (ca. 100-150 Wörter erwartet)</span>;
                      if (wordCount > 250) return <span className="text-orange-500 flex items-center gap-1"><AlertTriangle size={14} /> Evtl. zu lang (ca. 100-150 Wörter erwartet)</span>;
                    }
                    return <span className="text-green-500 flex items-center gap-1"><CheckCircle2 size={14} /> Optimaler Bereich</span>;
                  })()}
                </div>
              </div>

              {error && <div className="mb-4 p-4 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full bg-[#003056] hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                    Wird bewertet...
                  </>
                ) : (
                  'Bewertung starten'
                )}
              </button>
            </div>
          </div>
        )}

        {/* --- Tab 2: Score --- */}
        {activeTab === 'score' && result && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            <div className="lg:col-span-1 space-y-6">
              {/* Total Score Card */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6">Gesamtbewertung</h3>
                <div className="relative flex items-center justify-center mb-8">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                    <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="10" fill="transparent" 
                      strokeDasharray="452" 
                      strokeDashoffset={452 - (452 * (result.gesamtpunkte / result.maxPunkte))} 
                      className={result.gesamtpunkte/result.maxPunkte > 0.8 ? 'text-green-500' : result.gesamtpunkte/result.maxPunkte > 0.6 ? 'text-yellow-400' : 'text-blue-600'} 
                      style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                    />
                  </svg>
                  <span className="absolute text-4xl font-bold">{result.gesamtpunkte}<span className="text-lg text-slate-400 font-medium">/{result.maxPunkte}</span></span>
                </div>
              </div>

              {/* All Scores History */}
              {result.allScores && result.allScores.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 p-5 flex flex-col items-center">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Einzelne KI-Durchläufe ({result.allScores.length}x)</h3>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {result.allScores.map((score, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-lg text-sm font-bold text-blue-900 dark:text-blue-300 shadow-sm">
                        {score} <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">/ {result.maxPunkte}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Urteil */}
              <div className="bg-[#003056] dark:bg-zinc-900 text-white rounded-xl shadow-sm border border-transparent dark:border-white/10 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-[0.03]">
                  <BarChart3 className="w-32 h-32" />
                </div>
                <h3 className="text-sm font-bold text-blue-200 uppercase tracking-widest mb-3">Gesamturteil</h3>
                <p className="text-sm leading-relaxed text-blue-50">{result.gesamturteil}</p>
              </div>
            </div>

            {/* Criteria Breakdown */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-zinc-800">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Detailbewertung nach C1-Kriterien</h2>
                </div>
                <div className="p-6 space-y-4">
                  <KriteriumCard name="Aufgabenerfüllung" data={result.kriterien.aufgabenerfullung} />
                  <KriteriumCard name="Kohärenz" data={result.kriterien.koherenz} />
                  <KriteriumCard name="Wortschatz" data={result.kriterien.wortschatz} />
                  <KriteriumCard name="Strukturen" data={result.kriterien.strukturen} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- Tab 3: Corrections --- */}
        {activeTab === 'corrections' && result && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Top Section: Text and Suggestions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Interactive Original Text */}
              <div className="lg:col-span-2 relative" id="text-container">
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden h-full">
                  <div className="p-3 bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex justify-between tracking-wider">
                    <span>Dein Text mit Korrekturen</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold bg-blue-100 dark:bg-blue-900/20 px-2 rounded-full">{result.korrekturen.length}</span>
                  </div>
                  <div className="p-6 font-serif leading-relaxed text-slate-800 dark:text-slate-200 text-justify whitespace-pre-wrap text-lg min-h-[300px]">
                    {getHighlightedTextChunks(text, result.korrekturen).map((chunk, i) => {
                      if (chunk.korr) {
                        return (
                          <span
                            key={i}
                            onClick={(e) => {
                              setSelectedKorrektur(chunk.korr);
                              const container = document.getElementById('text-container');
                              if (container) {
                                const containerRect = container.getBoundingClientRect();
                                const spanRect = e.currentTarget.getBoundingClientRect();
                                setSuggestionTop(Math.max(0, spanRect.top - containerRect.top));
                              }
                            }}
                            className={`cursor-pointer underline decoration-dotted decoration-2 underline-offset-4 transition-colors ${selectedKorrektur === chunk.korr ? 'bg-blue-100 dark:bg-blue-900/40 decoration-blue-600 text-blue-900 dark:text-blue-200' : (chunk.korr?.schweregrad === 'minor' ? 'decoration-yellow-400 hover:bg-slate-100 dark:hover:bg-white/5' : 'decoration-red-400 hover:bg-slate-100 dark:hover:bg-white/5')}`}
                          >
                            {chunk.text}
                          </span>
                        );
                      }
                      return <span key={i}>{chunk.text}</span>;
                    })}
                    {result.korrekturen.length === 0 && (
                      <div className="text-slate-500 text-sm py-4 text-center mt-4">Keine spezifischen Satzkorrekturen gefunden. Sehr gute Leistung!</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Suggestion Details Float */}
              <div className="lg:col-span-1 relative hidden lg:block h-full min-h-[300px]">
                {selectedKorrektur ? (
                  <div 
                    className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-blue-200 dark:border-blue-900 overflow-hidden absolute w-full transition-all duration-300 z-10"
                    style={{ top: `${suggestionTop}px` }}
                  >
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-white/10 text-xs font-bold text-blue-800 dark:text-blue-300 flex justify-between items-center uppercase tracking-wider">
                      <span>Korrekturvorschlag</span>
                      <button onClick={() => setSelectedKorrektur(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-zinc-900 rounded-full p-1 shadow-sm border border-slate-100 dark:border-white/10">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="p-5">
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 pb-4 border-b border-slate-100 dark:border-white/10">{selectedKorrektur.vorschlag}</p>
                      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 p-3 bg-[#F8FAFC] dark:bg-zinc-800 rounded border border-slate-100 dark:border-white/10 italic">
                        {selectedKorrektur.erklaerung}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-transparent rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 p-8 text-center text-slate-400 dark:text-slate-500 text-sm sticky top-24">
                    Klicke auf die unterstrichenen Textstellen im Text links, um die Korrekturvorschläge und Erklärungen im Detail zu sehen.
                  </div>
                )}
              </div>
              
              {/* Mobile overlay for selected correction */}
              <div className="lg:hidden">
                 {selectedKorrektur && (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-blue-200 dark:border-blue-900 overflow-hidden mb-6">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-white/10 text-xs font-bold text-blue-800 dark:text-blue-300 flex justify-between items-center uppercase">
                        <span>Korrekturvorschlag</span>
                        <button onClick={() => setSelectedKorrektur(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          <X size={16} />
                        </button>
                      </div>
                      <div className="p-5">
                        <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 pb-4 border-b border-slate-100 dark:border-white/10">{selectedKorrektur.vorschlag}</p>
                        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 p-3 bg-[#F8FAFC] dark:bg-zinc-800 rounded border border-slate-100 dark:border-white/10 italic">
                          {selectedKorrektur.erklaerung}
                        </p>
                      </div>
                    </div>
                 )}
              </div>
            </div>

            {/* Bottom Section: Feedback Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="p-3 bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 flex justify-between uppercase tracking-wider">
                  <span>Wichtigste Verbesserungen</span>
                  <span className="text-yellow-600 dark:text-yellow-500 font-bold bg-yellow-50 dark:bg-yellow-900/30 px-2 rounded-full">{result.verbesserungen.length}</span>
                </div>
                <div className="p-5">
                  <ul className="space-y-4">
                    {result.verbesserungen.map((v, i) => (
                      <li key={i} className="flex items-start text-sm text-slate-700 dark:text-slate-300">
                        <PenLine className="w-4 h-4 text-yellow-500 mr-3 mt-0.5 shrink-0" />
                        <span className="leading-relaxed">{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="p-3 bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 flex justify-between uppercase tracking-wider">
                  <span>Stärken</span>
                  <span className="text-green-600 dark:text-green-500 font-bold bg-green-50 dark:bg-green-900/30 px-2 rounded-full">{result.staerken.length}</span>
                </div>
                <div className="p-5">
                  <ul className="space-y-4">
                    {result.staerken.map((s, i) => (
                      <li key={i} className="flex items-start text-sm text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mr-3 mt-0.5 shrink-0" />
                        <span className="leading-relaxed">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- Tab 4: Sample --- */}
        {activeTab === 'sample' && result && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-zinc-800">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  KI Musterlösung (C1-Niveau)
                </h2>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">Referenz</span>
              </div>
              <div className="p-6 md:p-8 font-serif leading-relaxed text-lg text-slate-800 text-justify overflow-y-auto">
                <div className="markdown-body prose prose-slate max-w-none">
                  <ReactMarkdown>
                    {result.musterloesung}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- Tab 5: History --- */}
        {activeTab === 'history' && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-zinc-800">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Bisherige Bewertungen
                </h2>
                {history.length > 0 && (
                  <button 
                    onClick={() => {
                      if (window.confirm("Bist du sicher, dass du den gesamten Verlauf löschen willst?")) {
                        setHistory([]);
                        localStorage.removeItem('evalHistory');
                      }
                    }} 
                    className="text-xs text-red-500 hover:text-red-700 flex items-center px-2 py-1 rounded hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Verlauf löschen
                  </button>
                )}
              </div>
              <div className="p-0">
                {history.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center">
                    <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                    <p>Noch keine Bewertungen vorhanden.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-white/10">
                    {history.map((h) => (
                      <div key={h.id} className="p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex justify-between items-start">
                        <div className="flex-1 mr-4">
                          <div className="flex items-center gap-3 justify-start mb-2">
                            <span className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 rounded">
                              Teil {h.teil}
                            </span>
                            <span className="text-xs text-slate-400">{h.date}</span>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 italic mb-3">"{h.text}"</p>
                          <div className="flex gap-4">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Punkte: {h.result.gesamtpunkte}/{h.result.maxPunkte}</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">Urteil: {h.result.gesamturteil}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0 mt-1">
                          <button 
                            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold rounded-lg transition"
                            onClick={() => {
                              setText(h.text);
                              setTaskPrompt(h.taskPrompt || '');
                              setTeil(h.teil);
                              setResult(h.result);
                              setActiveTab('score');
                            }}
                          >
                            Ansehen
                          </button>
                          <button 
                            className="px-3 py-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition"
                            title="Bewertung löschen"
                            onClick={() => {
                              if (window.confirm("Diesen Eintrag löschen?")) {
                                const newHistory = history.filter(item => item.id !== h.id);
                                setHistory(newHistory);
                                localStorage.setItem('evalHistory', JSON.stringify(newHistory));
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
        )}

        {appMode === 'compare' && (
          <div className="animate-in fade-in duration-300">
             {/* Compare Navigation Tabs */}
             <div className="flex flex-wrap gap-2 bg-slate-200/50 dark:bg-zinc-800 p-1 rounded-xl w-fit mx-auto mb-8">
               <TabButton active={activeCompareTab === 'input'} onClick={() => setActiveCompareTab('input')} icon={<FileText size={18} />} label="Texte eingeben" />
               <TabButton disabled={!compareResult} active={activeCompareTab === 'report'} onClick={() => setActiveCompareTab('report')} icon={<CheckCircle2 size={18} />} label="Korrektur-Bericht" />
               <TabButton active={activeCompareTab === 'history'} onClick={() => setActiveCompareTab('history')} icon={<Clock size={18} />} label="Verlauf" />
             </div>

             {/* Tab: Input */}
             {activeCompareTab === 'input' && (
               <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 p-6 sm:p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Originaler Text</label>
                        <textarea
                          className="w-full bg-[#F8FAFC] dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl p-4 font-serif text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none resize-y min-h-[350px]"
                          placeholder="Füge hier den originalen, fehlerhaften Text ein..."
                          value={compareOriginal}
                          onChange={(e) => setCompareOriginal(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3" title="Hier kannst du auch Feedback von anderen KIs einfügen">
                          Korrigierter Text / KI-Feedback
                        </label>
                        <textarea
                          className="w-full bg-[#F8FAFC] dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl p-4 font-serif text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none resize-y min-h-[350px]"
                          placeholder="Füge hier die korrigierte Version oder das Bewertungs-Feedback von anderen KIs ein..."
                          value={compareModified}
                          onChange={(e) => setCompareModified(e.target.value)}
                        />
                      </div>
                    </div>
                    {error && <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}
                    <button
                      onClick={handleCompare}
                      disabled={isComparing}
                      className="w-full bg-[#003056] hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isComparing ? (
                        <><Loader2 className="animate-spin mr-2 h-5 w-5" /> Analysiere Unterschiede...</>
                      ) : (
                        'Korrektur-Bericht generieren'
                      )}
                    </button>
                  </div>
               </div>
             )}

             {/* Tab: Report */}
             {activeCompareTab === 'report' && compareResult && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex justify-end">
                    <button 
                      onClick={handleCopyReport}
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
                    >
                      <Copy size={16} />
                      <span>Bericht Kopieren (Markdown)</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Left Column: Interactive Original Text */}
                    <div className="lg:col-span-2 relative" id="compare-text-container">
                      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden h-full">
                        <div className="p-3 bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex justify-between tracking-wider">
                          <span>Dein Text mit Korrekturen</span>
                          <span className="text-blue-600 dark:text-blue-400 font-bold bg-blue-100 dark:bg-blue-900/20 px-2 rounded-full">{compareResult.korrekturen.length}</span>
                        </div>
                        <div className="p-6 font-serif leading-relaxed text-slate-800 dark:text-slate-200 text-justify whitespace-pre-wrap text-lg min-h-[300px]">
                          {getHighlightedTextChunks(compareOriginal, compareResult.korrekturen).map((chunk, i) => {
                            if (chunk.korr) {
                              return (
                                <span
                                  key={i}
                                  onClick={(e) => {
                                    setSelectedKorrektur(chunk.korr);
                                    const container = document.getElementById('compare-text-container');
                                    if (container) {
                                      const containerRect = container.getBoundingClientRect();
                                      const spanRect = e.currentTarget.getBoundingClientRect();
                                      setSuggestionTop(Math.max(0, spanRect.top - containerRect.top));
                                    }
                                  }}
                                  className={`cursor-pointer underline decoration-dotted decoration-2 underline-offset-4 transition-colors ${selectedKorrektur === chunk.korr ? 'bg-blue-100 dark:bg-blue-900/40 decoration-blue-600 text-blue-900 dark:text-blue-200' : (chunk.korr?.schweregrad === 'minor' ? 'decoration-yellow-400 hover:bg-slate-100 dark:hover:bg-white/5' : 'decoration-red-400 hover:bg-slate-100 dark:hover:bg-white/5')}`}
                                >
                                  {chunk.text}
                                </span>
                              );
                            }
                            return <span key={i}>{chunk.text}</span>;
                          })}
                          {compareResult.korrekturen.length === 0 && (
                            <div className="text-slate-500 text-sm py-4 text-center mt-4">Keine spezifischen Satzkorrekturen gefunden. Sehr gute Leistung!</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Suggestion Details Float */}
                    <div className="lg:col-span-1 relative hidden lg:block h-full min-h-[300px]">
                      {selectedKorrektur ? (
                        <div 
                          className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-blue-200 dark:border-blue-900 overflow-hidden absolute w-full transition-all duration-300 z-10"
                          style={{ top: `${suggestionTop}px` }}
                        >
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-white/10 text-xs font-bold text-blue-800 dark:text-blue-300 flex justify-between items-center uppercase tracking-wider">
                            <span>Korrekturvorschlag</span>
                            <button onClick={() => setSelectedKorrektur(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-zinc-900 rounded-full p-1 shadow-sm border border-slate-100 dark:border-white/10">
                              <X size={14} />
                            </button>
                          </div>
                          <div className="p-5">
                            <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 pb-4 border-b border-slate-100 dark:border-white/10">{selectedKorrektur.vorschlag}</p>
                            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 p-3 bg-[#F8FAFC] dark:bg-zinc-800 rounded border border-slate-100 dark:border-white/10 italic">
                              {selectedKorrektur.erklaerung}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-transparent rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 p-8 text-center text-slate-400 dark:text-slate-500 text-sm sticky top-24">
                          Klicke auf die unterstrichenen Textstellen im Text links, um die Korrekturvorschläge und Erklärungen im Detail zu sehen.
                        </div>
                      )}
                    </div>
                    
                    {/* Mobile overlay for selected correction */}
                    <div className="lg:hidden">
                       {selectedKorrektur && (
                          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-blue-200 dark:border-blue-900 overflow-hidden mb-6">
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-white/10 text-xs font-bold text-blue-800 dark:text-blue-300 flex justify-between items-center uppercase">
                              <span>Korrekturvorschlag</span>
                              <button onClick={() => setSelectedKorrektur(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X size={16} />
                              </button>
                            </div>
                            <div className="p-5">
                              <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 pb-4 border-b border-slate-100 dark:border-white/10">{selectedKorrektur.vorschlag}</p>
                              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 p-3 bg-[#F8FAFC] dark:bg-zinc-800 rounded border border-slate-100 dark:border-white/10 italic">
                                {selectedKorrektur.erklaerung}
                              </p>
                            </div>
                          </div>
                       )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                      <div className="p-3 bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 flex justify-between uppercase tracking-wider">
                        <span>Wichtigste Verbesserungen</span>
                        <span className="text-yellow-600 dark:text-yellow-500 font-bold bg-yellow-50 dark:bg-yellow-900/30 px-2 rounded-full">{compareResult.verbesserungen?.length || 0}</span>
                      </div>
                      <div className="p-5">
                        <ul className="space-y-4">
                          {compareResult.verbesserungen?.map((v: string, i: number) => (
                            <li key={i} className="flex items-start text-sm text-slate-700 dark:text-slate-300">
                              <PenLine className="w-4 h-4 text-yellow-500 mr-3 mt-0.5 shrink-0" />
                              <span className="leading-relaxed">{v}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                      <div className="p-3 bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 flex justify-between uppercase tracking-wider">
                        <span>Stärken des Originals</span>
                        <span className="text-green-600 dark:text-green-500 font-bold bg-green-50 dark:bg-green-900/30 px-2 rounded-full">{compareResult.staerken?.length || 0}</span>
                      </div>
                      <div className="p-5">
                        <ul className="space-y-4">
                          {compareResult.staerken?.map((s: string, i: number) => (
                            <li key={i} className="flex items-start text-sm text-slate-700 dark:text-slate-300">
                              <CheckCircle2 className="w-4 h-4 text-green-500 mr-3 mt-0.5 shrink-0" />
                              <span className="leading-relaxed">{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
             )}

             {/* Tab: Compare History */}
             {activeCompareTab === 'history' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Verlauf der manuellen Vergleiche</h2>
                      {compareHistory.length > 0 && (
                        <button 
                          onClick={() => {
                            if (window.confirm('Verlauf wirklich löschen?')) {
                              setCompareHistory([]);
                              localStorage.removeItem('compareHistory');
                            }
                          }}
                          className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-900/10 px-3 py-1.5 rounded-lg transition"
                        >
                          <Trash2 size={14} />
                          Verlauf löschen
                        </button>
                      )}
                    </div>
                    <div className="p-0">
                      {compareHistory.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center">
                          <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                          <p>Noch keine Vergleiche vorhanden.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-white/10">
                          {compareHistory.map((h) => (
                            <div key={h.id} className="p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex justify-between items-start">
                              <div className="flex-1 mr-4">
                                <div className="flex items-center gap-3 justify-start mb-2">
                                  <span className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 rounded">
                                    Bericht
                                  </span>
                                  <span className="text-xs text-slate-400">{h.date}</span>
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 italic mb-3">"{h.originalText}"</p>
                                <div className="flex gap-4">
                                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{h.result.korrekturen.length} Korrekturen gefunden</span>
                                </div>
                              </div>
                              <div className="flex gap-2 shrink-0 mt-1">
                                <button 
                                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold rounded-lg transition"
                                  onClick={() => {
                                    setCompareOriginal(h.originalText);
                                    setCompareModified(h.modifiedText);
                                    setCompareResult(h.result);
                                    setActiveCompareTab('report');
                                  }}
                                >
                                  Ansehen
                                </button>
                                <button 
                                  className="px-3 py-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition"
                                  title="Vergleich löschen"
                                  onClick={() => {
                                    if (window.confirm("Diesen Eintrag löschen?")) {
                                      const newHistory = compareHistory.filter(item => item.id !== h.id);
                                      setCompareHistory(newHistory);
                                      localStorage.setItem('compareHistory', JSON.stringify(newHistory));
                                    }
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
             )}
          </div>
        )}

      </main>
    </div>
  );
}

// Subcomponents
function TabButton({ active, onClick, icon, label, disabled }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 flex items-center space-x-2 rounded-lg text-sm font-semibold transition-all
        ${active 
          ? 'bg-white text-blue-700 dark:bg-zinc-700 dark:text-blue-300 shadow-sm' 
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {icon}
      <span>{label}</span>
      {disabled && !active}
    </button>
  );
}

function KriteriumCard({ name, data }: { name: string, data: any }) {
  const getLetterColor = (letter: string) => {
    switch (letter) {
      case 'A': return 'text-green-600 border-green-200';
      case 'B': return 'text-blue-600 border-blue-200';
      case 'C': return 'text-yellow-600 border-yellow-200';
      case 'D': return 'text-orange-600 border-orange-200';
      case 'E': return 'text-red-600 border-red-200';
      default: return 'text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-5 pb-4 border-b border-slate-100 dark:border-white/10 last:border-0 last:pb-0">
      {/* Grade Bubble */}
      <div className={`shrink-0 w-12 h-12 rounded bg-slate-50 dark:bg-zinc-800 border flex items-center justify-center font-bold text-xl ${getLetterColor(data.stufe)}`}>
        {data.stufe}
      </div>
      
      {/* Content */}
      <div className="flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-wide uppercase">{name}</h4>
          <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 px-2 py-1 rounded">
            {data.punkte} / {data.max} Pkt
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-2">
          {data.begrundung}
        </p>
      </div>
    </div>
  );
}

