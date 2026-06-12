export interface Kriterium {
  stufe: string;
  punkte: number;
  max: number;
  begrundung: string;
}

export interface Korrektur {
  original: string;
  vorschlag: string;
  erklaerung: string;
  schweregrad: 'minor' | 'major';
}

export interface BewertungResponse {
  gesamturteil: string;
  gesamtpunkte: number;
  maxPunkte: number;
  kriterien: {
    aufgabenerfullung: Kriterium;
    koherenz: Kriterium;
    wortschatz: Kriterium;
    strukturen: Kriterium;
  };
  staerken: string[];
  verbesserungen: string[];
  korrekturen: Korrektur[];
  musterloesung: string;
  allScores?: number[];
}

export interface CompareResult {
  staerken: string[];
  verbesserungen: string[];
  korrekturen: Korrektur[];
}

export interface HistoryItem {
  id: string;
  date: string;
  text: string;
  taskPrompt: string;
  teil: 1 | 2;
  result: BewertungResponse;
}

export interface CompareHistoryItem { id: string; date: string; originalText: string; modifiedText: string; result: CompareResult; }