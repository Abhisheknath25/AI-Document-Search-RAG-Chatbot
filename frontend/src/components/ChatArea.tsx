import React, { useRef, useEffect, useState } from 'react';
import { Send, Bot, User, FileText, ChevronDown, ChevronUp, MessageSquareDashed } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export interface Citation {
  id: number;
  document: string;
  page: number | string;
  text: string;
}

export interface Message {
  role: 'user' | 'ai';
  content: string;
  citations?: Citation[];
}

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (query: string) => Promise<void>;
  isLoading: boolean;
  documentsIndexedCount: number;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  onSendMessage,
  isLoading,
  documentsIndexedCount,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [expandedCitations, setExpandedCitations] = useState<Record<number, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    onSendMessage(inputValue);
    setInputValue('');
  };

  const toggleCitation = (msgIndex: number) => {
    setExpandedCitations(prev => ({
      ...prev,
      [msgIndex]: !prev[msgIndex]
    }));
  };

  return (
    <div className="flex-1 h-full flex flex-col relative overflow-hidden bg-slate-950/20">
      
      {/* Messages Log area */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 scroll-smooth">
        {messages.length === 0 ? (
          /* Empty state Welcome panel */
          <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-6 px-4 animate-fade-in select-none">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-xl shadow-brand-500/10">
              <Bot className="w-8 h-8 text-white" />
            </div>
            
            <div className="space-y-2">
              <h2 className="font-display font-bold text-2xl text-slate-100">
                Ask your Documents Anything
              </h2>
              <p className="text-slate-400 text-sm">
                Upload your research papers, contracts, or text files, and get instant answers with verbatim citations directly from the text source.
              </p>
            </div>

            {documentsIndexedCount === 0 ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center gap-2 max-w-md">
                <MessageSquareDashed className="w-5 h-5 shrink-0" />
                <span>To begin, upload one or more PDFs using the sidebar drag-and-drop zone.</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 w-full text-left pt-4">
                {[
                  "What is the main finding in the text?",
                  "Summarize the key sections.",
                  "Are there any specific dates or figures?",
                  "Define the terms mentioned."
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!isLoading) {
                        onSendMessage(prompt);
                      }
                    }}
                    className="p-3 text-xs text-left rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-brand-500/30 text-slate-300 transition duration-200"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Conversation log */
          messages.map((message, idx) => {
            const isUser = message.role === 'user';
            return (
              <div 
                key={idx}
                className={`flex gap-4 max-w-3xl animate-slide-up ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                  isUser 
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10' 
                    : 'bg-white/5 border border-white/10 text-slate-300'
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble content */}
                <div className="space-y-2">
                  <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    isUser 
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white border border-brand-500/20' 
                      : 'bg-white/[0.03] border border-white/5 text-slate-200'
                  }`}>
                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    ) : (
                      <div className="prose">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Citation blocks (Only for AI, if citations exist) */}
                  {!isUser && message.citations && message.citations.length > 0 && (
                    <div className="bg-white/[0.01] border border-white/5 rounded-xl overflow-hidden max-w-full">
                      <button
                        onClick={() => toggleCitation(idx)}
                        className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-white/[0.02] transition text-xs text-slate-400 font-medium"
                      >
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-brand-400" />
                          Source Citations ({message.citations.length})
                        </span>
                        {expandedCitations[idx] ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </button>

                      {expandedCitations[idx] && (
                        <div className="p-3 border-t border-white/5 space-y-2.5 max-h-60 overflow-y-auto">
                          {message.citations.map((citation) => (
                            <div 
                              key={citation.id}
                              className="p-2.5 rounded-lg bg-black/20 border border-white/5 hover:border-brand-500/20 transition text-[11px]"
                            >
                              <div className="flex items-center gap-2 mb-1 text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
                                <span className="px-1 py-0.5 rounded bg-brand-500/20 text-brand-300 font-bold border border-brand-500/10">
                                  Doc {citation.id}
                                </span>
                                <span className="truncate max-w-[150px]" title={citation.document}>
                                  {citation.document}
                                </span>
                                <span>•</span>
                                <span>Page {citation.page}</span>
                              </div>
                              <p className="text-slate-300 italic leading-relaxed pl-1.5 border-l border-white/10">
                                "{citation.text}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* AI Loading state placeholder */}
        {isLoading && (
          <div className="flex gap-4 max-w-3xl mr-auto animate-pulse">
            <div className="w-8 h-8 rounded-lg shrink-0 bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
              <Bot className="w-4 h-4" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="rounded-2xl px-4 py-3 bg-white/[0.02] border border-white/5 text-slate-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" />
                <span className="text-xs ml-1 text-slate-500">Retrieving sources and synthesizing...</span>
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input query form panel */}
      <div className="p-6 border-t border-white/5 bg-slate-950/40 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-3 relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            placeholder={
              documentsIndexedCount === 0 
                ? "Upload a PDF first to begin chatting..." 
                : "Ask a question about your indexed documents..."
            }
            className="flex-1 px-4 py-3 rounded-xl glass-input text-sm text-slate-200 placeholder:text-slate-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim() || documentsIndexedCount === 0}
            className="px-4 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-medium shadow-md shadow-brand-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
};
