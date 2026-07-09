import React, { useState, useRef, useEffect } from 'react';
import { 
  FolderOpen, 
  Settings, 
  Trash2, 
  UploadCloud, 
  Sparkles, 
  Key, 
  Database, 
  FileText, 
  Loader2, 
  Eye, 
  EyeOff,
  AlertCircle
} from 'lucide-react';

const BACKEND_API_URL = import.meta.env.VITE_API_URL || '';

interface SidebarProps {
  provider: 'openai' | 'google';
  setProvider: (val: 'openai' | 'google') => void;
  apiKey: string;
  setApiKey: (val: string) => void;
  storeType: 'local' | 'pinecone';
  setStoreType: (val: 'local' | 'pinecone') => void;
  pineconeKey: string;
  setPineconeKey: (val: string) => void;
  pineconeIndex: string;
  setPineconeIndex: (val: string) => void;
  documents: string[];
  onUpload: (files: FileList) => Promise<void>;
  onDeleteDoc: (name: string) => Promise<void>;
  isUploading: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  provider,
  setProvider,
  apiKey,
  setApiKey,
  storeType,
  setStoreType,
  pineconeKey,
  setPineconeKey,
  pineconeIndex,
  setPineconeIndex,
  documents,
  onUpload,
  onDeleteDoc,
  isUploading,
}) => {
  const [showSettings, setShowSettings] = useState<boolean>(true);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [showPcKey, setShowPcKey] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Health check: ping /api/health on mount and every 30 seconds
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${BACKEND_API_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
        setBackendStatus(response.ok ? 'online' : 'offline');
      } catch {
        setBackendStatus('offline');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await onUpload(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await onUpload(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = async (docName: string) => {
    setDeletingDoc(docName);
    try {
      await onDeleteDoc(docName);
    } finally {
      setDeletingDoc(null);
    }
  };

  const statusConfig = {
    online: { color: 'bg-emerald-500', label: 'Online', animate: 'animate-pulse' },
    offline: { color: 'bg-rose-500', label: 'Offline', animate: '' },
    checking: { color: 'bg-amber-500', label: 'Checking...', animate: 'animate-pulse' },
  };
  const status = statusConfig[backendStatus];

  return (
    <div className="w-80 h-full flex flex-col glass-panel select-none">
      {/* Header Branding */}
      <div className="p-6 border-b border-white/5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Sparkles className="w-5 h-5 text-white animate-pulse-subtle" />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg leading-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            DocuMind RAG
          </h1>
          <p className="text-[10px] text-brand-300 font-semibold tracking-wider uppercase">
            Semantic Search Chat
          </p>
        </div>
      </div>

      {/* Main content sidebar: Config Panel & Docs List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* Toggle Settings Panel button */}
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition text-sm font-medium"
        >
          <span className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-brand-400" />
            Configuration Settings
          </span>
          <span className="text-xs text-slate-400">{showSettings ? 'Hide' : 'Show'}</span>
        </button>

        {showSettings && (
          <div className="space-y-4 animate-fade-in bg-white/[0.02] border border-white/5 rounded-2xl p-4">
            {/* AI Provider */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                AI Model Provider
              </label>
              <div className="grid grid-cols-2 gap-2 bg-black/30 p-1 rounded-lg border border-white/5">
                <button
                  type="button"
                  onClick={() => setProvider('openai')}
                  className={`py-1.5 text-xs font-medium rounded-md transition ${
                    provider === 'openai' 
                      ? 'bg-brand-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  OpenAI
                </button>
                <button
                  type="button"
                  onClick={() => setProvider('google')}
                  className={`py-1.5 text-xs font-medium rounded-md transition ${
                    provider === 'google' 
                      ? 'bg-brand-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Google Gemini
                </button>
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-brand-400" />
                  {provider === 'openai' ? 'OpenAI API Key' : 'Gemini API Key'}
                </span>
                <span className="text-[10px] text-rose-400 font-bold uppercase">Required</span>
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={provider === 'openai' ? "sk-..." : "AIzaSy..."}
                  className="w-full pl-3 pr-10 py-2 text-xs rounded-lg glass-input text-slate-100 placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Vector DB Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-brand-400" />
                Vector Storage
              </label>
              <div className="grid grid-cols-2 gap-2 bg-black/30 p-1 rounded-lg border border-white/5">
                <button
                  type="button"
                  onClick={() => setStoreType('local')}
                  className={`py-1.5 text-xs font-medium rounded-md transition ${
                    storeType === 'local' 
                      ? 'bg-brand-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Local DB
                </button>
                <button
                  type="button"
                  onClick={() => setStoreType('pinecone')}
                  className={`py-1.5 text-xs font-medium rounded-md transition ${
                    storeType === 'pinecone' 
                      ? 'bg-brand-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pinecone Cloud
                </button>
              </div>
            </div>

            {/* Pinecone Settings */}
            {storeType === 'pinecone' && (
              <div className="space-y-3 pt-2 border-t border-white/5 animate-fade-in">
                {/* Pinecone API Key */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
                    Pinecone Key
                  </label>
                  <div className="relative">
                    <input
                      type={showPcKey ? "text" : "password"}
                      value={pineconeKey}
                      onChange={(e) => setPineconeKey(e.target.value)}
                      placeholder="pc_..."
                      className="w-full pl-3 pr-10 py-2 text-xs rounded-lg glass-input text-slate-100 placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPcKey(!showPcKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPcKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Pinecone Index */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                    Index Name
                  </label>
                  <input
                    type="text"
                    value={pineconeIndex}
                    onChange={(e) => setPineconeIndex(e.target.value)}
                    placeholder="my-rag-index"
                    className="w-full px-3 py-2 text-xs rounded-lg glass-input text-slate-100 placeholder:text-slate-600"
                  />
                </div>
              </div>
            )}
            
            {/* Warning if no key */}
            {!apiKey && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Enter an API key above to enable PDF uploading and document chatting.</span>
              </div>
            )}
          </div>
        )}

        {/* PDF Document Management */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-brand-400" />
            Documents Indexed
          </label>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={`relative p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition duration-300 ${
              dragActive 
                ? 'border-brand-500 bg-brand-500/5' 
                : 'border-white/10 hover:border-brand-500/50 hover:bg-white/[0.02]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept=".pdf"
              className="hidden"
            />
            {isUploading ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
                <span className="text-xs font-medium text-slate-300">Processing PDF...</span>
                <span className="text-[10px] text-slate-500">Chunking & embedding</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-300">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-200">
                    Upload PDF Files
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Drag & drop or click to browse
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Document list */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {documents.length === 0 ? (
              <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] text-center text-xs text-slate-500">
                No documents uploaded yet
              </div>
            ) : (
              documents.map((doc, idx) => (
                <div 
                  key={doc + idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition group"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                    <FileText className="w-4 h-4 text-brand-400 shrink-0" />
                    <span className="text-xs text-slate-300 truncate" title={doc}>
                      {doc}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(doc)}
                    disabled={deletingDoc === doc}
                    className="p-1.5 rounded-lg bg-transparent hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition"
                    title="Remove document index"
                  >
                    {deletingDoc === doc ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
        <span>Backend Status</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${status.color} ${status.animate}`} />
          <span className="text-slate-400 font-medium">{status.label}</span>
        </div>
      </div>
    </div>
  );
};
