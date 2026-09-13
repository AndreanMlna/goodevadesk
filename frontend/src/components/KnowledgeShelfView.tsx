import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Sparkles,
  Layers,
  ShieldCheck,
  Cpu,
  Info,
  RotateCw,
  Palette,
  Plus,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Database,
  ChevronDown,
  ChevronUp,
  Search,
  Zap,
} from 'lucide-react';
import { CompleteShelfLandingPage } from './CompleteShelfLandingPage';
import { fetchSopDocuments, ingestSopDocument, fetchVectorSearchResults } from '../api';
import { trackTelemetryEvent } from '../lib/telemetry';

interface KnowledgeShelfViewProps {
  apiKey?: string;
}

export const KnowledgeShelfView: React.FC<KnowledgeShelfViewProps> = ({ apiKey }) => {
  const [accentColor, setAccentColor] = useState('#c87046');

  // Dynamic SOP Registry State
  const [sopDocs, setSopDocs] = useState<any[]>([]);
  const [loadingSops, setLoadingSops] = useState(false);
  const [showRegistry, setShowRegistry] = useState(false);

  // Enterprise Fase 3: Vector RAG Hybrid Search Playground State
  const [vectorQuery, setVectorQuery] = useState('');
  const [vectorResults, setVectorResults] = useState<any[]>([]);
  const [isSearchingVector, setIsSearchingVector] = useState(false);
  const [hasSearchedVector, setHasSearchedVector] = useState(false);

  // Ingestion Modal State
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [ingestTitle, setIngestTitle] = useState('');
  const [ingestCategory, setIngestCategory] = useState<'billing' | 'technical' | 'general'>('technical');
  const [ingestContent, setIngestContent] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestFeedback, setIngestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const sopHighlights = [
    { roman: 'I', title: 'RAG SOPs', tag: 'Grounding' },
    { roman: 'II', title: 'Smart Triage', tag: 'SLA' },
    { roman: 'III', title: 'Multi-Tenancy', tag: 'Isolation' },
    { roman: 'IV', title: 'Gemini AI', tag: 'LLM' },
    { roman: 'V', title: 'Redis Cache', tag: 'Memory' },
    { roman: 'VI', title: 'HITL & RLHF', tag: 'Supervision' },
    { roman: 'VII', title: 'Python NLP', tag: 'Linguistics' },
  ];

  const loadSops = useCallback(async () => {
    if (!apiKey) return;
    setLoadingSops(true);
    try {
      const docs = await fetchSopDocuments(apiKey);
      if (Array.isArray(docs)) {
        setSopDocs(docs);
      }
    } catch (err) {
      console.warn('[Knowledge Shelf] Could not load active SOP documents:', err);
    } finally {
      setLoadingSops(false);
    }
  }, [apiKey]);

  useEffect(() => {
    loadSops();
  }, [loadSops]);

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestTitle.trim() || !ingestContent.trim()) return;

    setIsIngesting(true);
    setIngestFeedback(null);

    try {
      const result = await ingestSopDocument(apiKey || '', {
        title: ingestTitle.trim(),
        category: ingestCategory,
        content: ingestContent.trim(),
      });

      trackTelemetryEvent('sop_document_ingested', {
        category: ingestCategory,
        title: ingestTitle.trim(),
        tenant_id: apiKey ? 'authenticated' : 'anonymous',
      });

      setIngestFeedback({
        type: 'success',
        message: result?.message || `SOP "${ingestTitle}" successfully indexed into vector grounding memory!`,
      });

      setIngestTitle('');
      setIngestContent('');
      await loadSops();

      setTimeout(() => {
        setIsIngestModalOpen(false);
        setIngestFeedback(null);
      }, 1500);
    } catch (err: any) {
      setIngestFeedback({
        type: 'error',
        message: err.message || 'Failed to ingest SOP document into knowledge shelf.',
      });
    } finally {
      setIsIngesting(false);
    }
  };

  // Enterprise Fase 3: Vector RAG Hybrid Search Handler
  const handleVectorSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!vectorQuery.trim() || !apiKey) return;
    setIsSearchingVector(true);
    setHasSearchedVector(true);
    try {
      const results = await fetchVectorSearchResults(apiKey, vectorQuery.trim(), 3);
      setVectorResults(results || []);
    } catch (err) {
      console.warn('[Knowledge Shelf] Vector search failed:', err);
    } finally {
      setIsSearchingVector(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-[#111827]/80 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
                <BookOpen className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                GoodevaDesk 3D Knowledge & Policy Shelf
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30">
                Spatial Three.js r165
              </span>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Interactive 3D representation of GoodevaDesk&apos;s authoritative operational volumes. 
              These authoritative documents directly power the RAG Grounding pipeline and LLM automated triage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsIngestModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl shadow-lg shadow-purple-900/30 text-xs font-bold transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Ingest New SOP</span>
            </button>
            <div className="flex items-center gap-2 bg-[#090d16]/80 px-3.5 py-2 rounded-xl border border-slate-800 text-xs text-slate-300">
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="font-semibold text-white">{sopDocs.length || 7}</span> Grounded SOPs
            </div>
            <div className="flex items-center gap-2 bg-[#090d16]/80 px-3.5 py-2 rounded-xl border border-slate-800 text-xs text-slate-300">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>WebGL / GPU 60 FPS</span>
            </div>
            <div className="flex items-center gap-2 bg-[#090d16]/80 px-3.5 py-2 rounded-xl border border-slate-800 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>RAG Grounded</span>
            </div>
          </div>
        </div>

        {/* SOP Quick Badges */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Core Volumes:
            </span>
            {sopHighlights.map((sop) => (
              <div
                key={sop.roman}
                className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 flex items-center gap-2"
              >
                <span className="font-mono font-bold text-purple-400 text-[11px]">Vol {sop.roman}</span>
                <span className="text-slate-400 text-[11px]">•</span>
                <span className="text-slate-200 font-semibold text-[11px]">{sop.title}</span>
                <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                  {sop.tag}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-xs">Theme Accent:</span>
            <button
              type="button"
              onClick={() => setAccentColor('#c87046')}
              className={`w-4 h-4 rounded-full bg-[#c87046] transition-transform ${accentColor === '#c87046' ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
              title="Classic Terracotta (#c87046)"
            />
            <button
              type="button"
              onClick={() => setAccentColor('#8b5cf6')}
              className={`w-4 h-4 rounded-full bg-[#8b5cf6] transition-transform ${accentColor === '#8b5cf6' ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
              title="Goodeva Purple (#8b5cf6)"
            />
            <button
              type="button"
              onClick={() => setAccentColor('#06b6d4')}
              className={`w-4 h-4 rounded-full bg-[#06b6d4] transition-transform ${accentColor === '#06b6d4' ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
              title="Cyber Cyan (#06b6d4)"
            />
          </div>
        </div>
      </div>

      {/* Enterprise Fase 3: Vector RAG Hybrid Search Playground */}
      <div className="bg-[#111827]/80 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Vector RAG Hybrid Search Engine (pgvector)</h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-[10px] text-cyan-300 font-mono border border-cyan-500/40">
                  /ai-engineer
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-[10px] text-purple-300 font-mono border border-purple-500/40 hidden sm:inline">
                  Dense Vector + Sparse Keyword
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Query enterprise SOP policy documents using cosine similarity ranking over 256-dimensional embeddings.
              </p>
            </div>
          </div>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleVectorSearch} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={vectorQuery}
                onChange={(e) => setVectorQuery(e.target.value)}
                placeholder="Enter customer inquiry or support issue (e.g., 'How to handle chargeback and refund requests?')..."
                className="w-full bg-[#090d16] border border-cyan-500/30 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={isSearchingVector || !vectorQuery.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 disabled:opacity-40 shadow-lg shadow-cyan-900/20"
            >
              {isSearchingVector ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              <span>{isSearchingVector ? 'Searching Vectors...' : 'Vector Search'}</span>
            </button>
          </div>

          {/* Quick Query Suggestions */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px]">Quick Tests:</span>
            {[
              'Payment failed chargeback refund request',
              'API gateway 504 gateway timeout SLA breach',
              'Enterprise multi-tenant data isolation policy',
              'Urgent double billing invoice dispute',
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setVectorQuery(q);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-[11px] border border-slate-700/50 transition"
              >
                {q}
              </button>
            ))}
          </div>
        </form>

        {/* Vector Search Results Display */}
        {hasSearchedVector && (
          <div className="pt-3 border-t border-cyan-500/20 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">
                Hybrid RAG Retrieval Results ({vectorResults.length} matches):
              </span>
              <span className="text-[11px] font-mono text-cyan-400">
                Metric: Cosine Similarity [0.0 - 1.0]
              </span>
            </div>

            {vectorResults.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#090d16]/60 border border-slate-800 text-xs text-slate-400 text-center">
                No matching SOP policies found for this query.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {vectorResults.map((res: any, idx: number) => {
                  const score = typeof res.score === 'number' ? res.score : 0.85;
                  const isHighMatch = score >= 0.8;

                  return (
                    <div
                      key={res.docId || idx}
                      className="p-4 rounded-xl bg-[#090d16] border border-cyan-500/30 hover:border-cyan-400/60 transition space-y-2 relative overflow-hidden flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <span className="font-mono font-bold text-cyan-300">
                            {res.docId || `DOC-${idx + 1}`}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10px] border ${
                              isHighMatch
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            }`}
                          >
                            Sim: {score.toFixed(3)}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-white leading-tight">
                          {res.title || 'Authoritative Operating Procedure'}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                          {res.snippet || res.content || 'Standard operational guidelines.'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">
                          {res.category || 'policy'}
                        </span>
                        <span className="text-cyan-400/80 font-mono">Rank #{idx + 1}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3D Canvas Showcase */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl bg-[#080808]">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-slate-300 pointer-events-none">
          <RotateCw className="w-3.5 h-3.5 text-purple-400 animate-spin-slow" />
          <span>Interactive 3D Scene • Click books to inspect • Drag to rotate camera</span>
        </div>

        <div className="w-full h-[740px]">
          <CompleteShelfLandingPage
            headingFont="iowan-old-style"
            bodyFont="inter"
            headingWeight="400"
            bodyWeight="400"
            primaryColor={accentColor}
            headingSize={60}
            bodySize={12}
            headingLetterSpacing={-0.055}
            className="w-full h-full"
          />
        </div>

        <div className="p-3 bg-[#0d121f] border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-400" />
            <span>Authored Three.js r165 environment with real-time dynamic lighting, shaders, and physics-based volume pull interaction.</span>
          </div>
          <button
            type="button"
            onClick={() => setShowRegistry((prev) => !prev)}
            className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition text-xs font-semibold"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{showRegistry ? 'Hide SOP Index' : 'Inspect RAG SOP Index'}</span>
            {showRegistry ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Active SOP Registry Table */}
      {showRegistry && (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Active RAG Grounding SOP Registry</h3>
              <span className="text-xs text-slate-400">({sopDocs.length} indexed documents)</span>
            </div>
            <button
              type="button"
              onClick={loadSops}
              disabled={loadingSops}
              className="text-xs text-purple-400 hover:text-purple-300 transition flex items-center gap-1"
            >
              <RotateCw className={`w-3 h-3 ${loadingSops ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sopDocs.map((doc, idx) => (
              <div
                key={doc.id || idx}
                className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-purple-500/30 transition space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-slate-200 line-clamp-1">{doc.title}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                      doc.category === 'billing'
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        : doc.category === 'technical'
                        ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                        : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    }`}
                  >
                    {doc.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {doc.content}
                </p>
                {doc.keywords && doc.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {doc.keywords.slice(0, 4).map((kw: string, i: number) => (
                      <span key={i} className="text-[9px] font-mono bg-slate-800 text-purple-300 px-1.5 py-0.5 rounded">
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ingest SOP Document Modal */}
      {isIngestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111827] border border-purple-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Ingest New SOP Policy Document</h3>
                  <p className="text-xs text-slate-400">Expand the RAG anti-hallucination knowledge base</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsIngestModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {ingestFeedback && (
              <div
                className={`p-3 rounded-xl flex items-center gap-2 text-xs ${
                  ingestFeedback.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                }`}
              >
                {ingestFeedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{ingestFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleIngestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  SOP Document Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Enterprise Refund & Chargeback Policy"
                  value={ingestTitle}
                  onChange={(e) => setIngestTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category Classification
                </label>
                <select
                  value={ingestCategory}
                  onChange={(e) => setIngestCategory(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="technical">Technical Support / System Incident</option>
                  <option value="billing">Billing, Invoice, and Subscriptions</option>
                  <option value="general">General Corporate Policy & Compliance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Policy Content / Operating Instructions (Markdown)
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Enter the authoritative policy text. Keywords will be automatically extracted and indexed for anti-hallucination RAG grounding..."
                  value={ingestContent}
                  onChange={(e) => setIngestContent(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 leading-relaxed font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsIngestModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isIngesting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isIngesting ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{isIngesting ? 'Indexing...' : 'Ingest Document'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
