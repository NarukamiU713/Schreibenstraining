import { useState } from 'react';
import { Loader2, X, Sparkles } from 'lucide-react';

export function InteractiveMusterloesung({ 
  text, 
  onUpdateText,
  provider,
  customGeminiKey,
  customDeepseekKey
}: { 
  text: string;
  onUpdateText: (newText: string) => void;
  provider: string;
  customGeminiKey: string;
  customDeepseekKey: string;
}) {
  const [selectedGlobalIdx, setSelectedGlobalIdx] = useState<number | null>(null);
  const [selectedSentenceText, setSelectedSentenceText] = useState("");
  const [suggestionTop, setSuggestionTop] = useState(0);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradedData, setUpgradedData] = useState<{ upgraded: string, explanation: string } | null>(null);

  const handleUpgrade = async () => {
    if (!selectedSentenceText) return;
    setIsUpgrading(true);
    setUpgradedData(null);
    try {
      const customApiKey = provider === 'gemini' ? customGeminiKey : customDeepseekKey;
      const res = await fetch('/api/upgrade-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sentence: selectedSentenceText, 
          context: text,
          provider,
          customApiKey
        })
      });
      if (!res.ok) throw new Error("Upgrade failed");
      const data = await res.json();
      setUpgradedData(data);
    } catch (e) {
      console.error(e);
      alert("Fehler beim Aufwerten des Satzes.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleApply = () => {
    if (!upgradedData || selectedGlobalIdx === null) return;
    
    // Wir ersetzen den genauen Satz im Text
    let currentGlobalIdx = 0;
    const paragraphs = text.split('\n\n');
    let replacedText = '';

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const p = paragraphs[pIdx];
      // Regex für dt. Sätze
      const parts = p.split(/([.?!]+[\s\n]+(?=[A-ZÄÖÜ]))/);
      for (let i = 0; i < parts.length; i += 2) {
        const textPart = parts[i];
        const delim = parts[i + 1] || "";
        
        if (currentGlobalIdx === selectedGlobalIdx) {
          // Ersatz. Wir behalten evtl. das alte Trennzeichen am Ende oder lassen die AI entscheiden?
          // Die KI liefert oft einen Satz mit Punkt zurück. Wir checken, ob am Ende von upgradedData.upgraded ein Punkt ist.
          let finalRepl = upgradedData.upgraded;
          let newDelim = delim;
          if (finalRepl.match(/[.?!]+$/)) {
             // KI hat Satzzeichen inkludiert. Trimmen wir old delim
             newDelim = delim.replace(/^[.?!]+/, "");
          }
          replacedText += finalRepl + newDelim;
        } else {
          replacedText += textPart + delim;
        }
        currentGlobalIdx++;
      }
      if (pIdx < paragraphs.length - 1) {
        replacedText += '\n\n';
      }
    }

    onUpdateText(replacedText);
    setSelectedGlobalIdx(null);
    setUpgradedData(null);
  };

  const paragraphs = text.split('\n\n');
  let globalIdxStr = 0;

  return (
    <div className="relative">
      <div className="text-slate-800 dark:text-slate-200">
        {paragraphs.map((p, pIdx) => {
          const parts = p.split(/([.?!]+[\s\n]+(?=[A-ZÄÖÜ]))/);
          const sentences = [];
          for (let i = 0; i < parts.length; i += 2) {
            sentences.push({
              text: parts[i],
              delim: parts[i + 1] || "",
            });
          }

          return (
            <p key={pIdx} className="mb-4 last:mb-0">
              {sentences.map((s, sIdx) => {
                const currentIdx = globalIdxStr++;
                const isActive = selectedGlobalIdx === currentIdx;
                return (
                  <span 
                    key={currentIdx} 
                    className={`cursor-pointer transition-colors duration-200 rounded ${isActive ? 'bg-blue-200 dark:bg-blue-900/60' : 'hover:bg-slate-200 dark:hover:bg-slate-700/50'}`}
                    onClick={(e) => {
                      if (isActive) {
                        setSelectedGlobalIdx(null);
                        return;
                      }
                      setSelectedGlobalIdx(currentIdx);
                      setSelectedSentenceText(s.text + s.delim);
                      setUpgradedData(null);
                      
                      const container = e.currentTarget.closest('.relative');
                      if (container) {
                        const containerRect = container.getBoundingClientRect();
                        const spanRect = e.currentTarget.getBoundingClientRect();
                        setSuggestionTop(spanRect.bottom - containerRect.top + 10);
                      }
                    }}
                  >
                    {s.text}{s.delim}
                  </span>
                );
              })}
            </p>
          );
        })}
      </div>

      {selectedGlobalIdx !== null && (
        <div 
          className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-blue-200 dark:border-blue-900/50 overflow-hidden absolute w-full transition-all duration-300 z-10 font-sans"
          style={{ top: `${suggestionTop}px` }}
        >
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-white/10 text-xs font-bold text-blue-800 dark:text-blue-300 flex justify-between items-center uppercase tracking-wider">
            <span className="flex items-center"><Sparkles className="w-3.5 h-3.5 mr-1" /> Satz aufwerten</span>
            <button onClick={() => setSelectedGlobalIdx(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-[#0a0a0a] rounded-full p-1 shadow-sm border border-slate-100 dark:border-white/[0.06]">
              <X size={14} />
            </button>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Original</span>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{selectedSentenceText}</p>
            </div>
            
            {!upgradedData && !isUpgrading && (
              <button 
                onClick={handleUpgrade}
                className="self-start text-sm bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Satz verbessern (C1/C2)
              </button>
            )}

            {isUpgrading && (
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                <Loader2 className="w-4 h-4 animate-spin" /> KI generiert Vorschlag...
              </div>
            )}

            {upgradedData && (
              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
                <span className="text-xs font-semibold text-blue-800 dark:text-blue-400 uppercase">Vorschlag</span>
                <p className="text-base font-serif text-slate-800 dark:text-slate-200 mt-1">{upgradedData.upgraded}</p>
                
                <div className="mt-3 bg-white dark:bg-zinc-800 p-2 rounded text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-white/10">
                  <span className="font-semibold block mb-1">KI Begründung:</span>
                  {upgradedData.explanation}
                </div>

                <div className="mt-4 flex gap-2">
                  <button onClick={handleApply} className="bg-green-600 hover:bg-green-700 text-white text-sm py-1.5 px-4 rounded-lg font-medium transition-colors">
                    Diesen Satz übernehmen
                  </button>
                  <button onClick={handleUpgrade} className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 text-sm py-1.5 px-4 rounded-lg font-medium transition-colors">
                    Erneut generieren
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
