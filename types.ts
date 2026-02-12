
export interface Source {
  title: string;
  uri: string;
  snippet?: string;
  publisher?: string;
  publishedDate?: string;
  category?: 'news' | 'government' | 'academic' | 'ngo' | 'other';
}

export interface ClaimResult {
  text: string;
  verdict: 'verified' | 'refuted' | 'unclear' | 'partially_true';
  reasoning: string;
  sourceIndices: number[];
  evidenceStrength: 'high' | 'medium' | 'low';
}

export interface FactCheckResult {
  summary: string;
  confidenceScore: number;
  sources: Source[];
  claims: ClaimResult[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  input: string;
  result: FactCheckResult;
}

export type CitationFormat = 'APA' | 'MLA' | 'Markdown' | 'Plain Text';
