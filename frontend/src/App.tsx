import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import type { Message } from './components/ChatArea';

const BACKEND_API_URL = import.meta.env.VITE_API_URL || '';

function App() {
  // Config states initialized from LocalStorage for seamless UX
  const [provider, setProvider] = useState<'openai' | 'google'>(() => {
    return (localStorage.getItem('rag_provider') as 'openai' | 'google') || 'openai';
  });
  const [apiKey, setApiKey] = useState<string>(() => {
    const savedProvider = localStorage.getItem('rag_provider') || 'openai';
    return localStorage.getItem(`rag_key_${savedProvider}`) || localStorage.getItem('rag_api_key') || '';
  });
  const [storeType, setStoreType] = useState<'local' | 'pinecone'>(() => {
    return (localStorage.getItem('rag_store_type') as 'local' | 'pinecone') || 'local';
  });
  const [pineconeKey, setPineconeKey] = useState<string>(() => {
    return localStorage.getItem('rag_pinecone_key') || '';
  });
  const [pineconeIndex, setPineconeIndex] = useState<string>(() => {
    return localStorage.getItem('rag_pinecone_index') || '';
  });

  // Data & Interface states
  const [documents, setDocuments] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);

  // Wrap setProvider to also swap the cached API key in a single batch,
  // avoiding a synchronous setState inside a useEffect (which causes cascading renders).
  const handleSetProvider = useCallback((newProvider: 'openai' | 'google') => {
    setProvider(newProvider);
    const cachedKey = localStorage.getItem(`rag_key_${newProvider}`) || '';
    setApiKey(cachedKey);
  }, []);

  // Sync config states with localStorage
  useEffect(() => {
    localStorage.setItem('rag_provider', provider);
  }, [provider]);

  useEffect(() => {
    localStorage.setItem(`rag_key_${provider}`, apiKey);
  }, [apiKey, provider]);

  useEffect(() => {
    localStorage.setItem('rag_store_type', storeType);
  }, [storeType]);

  useEffect(() => {
    localStorage.setItem('rag_pinecone_key', pineconeKey);
  }, [pineconeKey]);

  useEffect(() => {
    localStorage.setItem('rag_pinecone_index', pineconeIndex);
  }, [pineconeIndex]);

  // Fetch indexed documents list from the backend
  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${BACKEND_API_URL}/api/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        console.error("Failed to load documents list from server.");
      }
    } catch (e) {
      console.error("Connection error while fetching documents:", e);
    }
  };

  // Fetch documents once on initial mount using the null-check ref init pattern.
  // React allows reading refs during render when using `ref.current === null` for initialization.
  const hasFetched = useRef<boolean | null>(null);
  if (hasFetched.current === null) {
    hasFetched.current = true;
    fetchDocuments();
  }

  const getHeaders = () => {
    const headers: Record<string, string> = {
      'x-provider': provider,
      'x-api-key': apiKey,
      'x-store-type': storeType,
    };
    if (storeType === 'pinecone') {
      headers['x-pinecone-key'] = pineconeKey;
      headers['x-pinecone-index'] = pineconeIndex;
    }
    return headers;
  };

  const handleUpload = async (files: FileList) => {
    if (!apiKey) {
      alert("Please provide an API Key in the settings before uploading documents.");
      return;
    }
    if (storeType === 'pinecone' && (!pineconeKey || !pineconeIndex)) {
      alert("Please configure your Pinecone API Key and Index Name in the settings panel.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const response = await fetch(`${BACKEND_API_URL}/api/upload`, {
        method: 'POST',
        headers: getHeaders(),
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        // Success
        await fetchDocuments();
      } else {
        alert(data.detail || "Error occurred during file processing.");
      }
    } catch (error) {
      console.error("Upload network error:", error);
      alert("Unable to reach backend server. Please verify the backend is running.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (name: string) => {
    try {
      const response = await fetch(`${BACKEND_API_URL}/api/documents/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchDocuments();
      } else {
        const data = await response.json();
        alert(data.detail || "Failed to delete document from index.");
      }
    } catch (e) {
      console.error("Delete network error:", e);
      alert("Unable to reach backend server to delete document.");
    }
  };

  const handleSendMessage = async (query: string) => {
    if (!apiKey) {
      alert("Please configure your API Key in the settings panel first.");
      return;
    }

    // 1. Add user query to conversation history
    const userMsg: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setIsLoadingChat(true);

    try {
      // 2. Query backend chat endpoint
      const response = await fetch(`${BACKEND_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          ...getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (response.ok) {
        // 3. Add AI answer + citations to conversation
        const aiMsg: Message = {
          role: 'ai',
          content: data.answer,
          citations: data.sources,
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        const aiMsg: Message = {
          role: 'ai',
          content: `Error from server: ${data.detail || "An unexpected error occurred."}`,
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (error) {
      console.error("Chat network error:", error);
      const aiMsg: Message = {
        role: 'ai',
        content: "Network error: Failed to connect to the chatbot server. Please ensure the backend is running.",
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Configuration Sidebar */}
      <Sidebar
        provider={provider}
        setProvider={handleSetProvider}
        apiKey={apiKey}
        setApiKey={setApiKey}
        storeType={storeType}
        setStoreType={setStoreType}
        pineconeKey={pineconeKey}
        setPineconeKey={setPineconeKey}
        pineconeIndex={pineconeIndex}
        setPineconeIndex={setPineconeIndex}
        documents={documents}
        onUpload={handleUpload}
        onDeleteDoc={handleDeleteDoc}
        isUploading={isUploading}
      />

      {/* Primary chat content pane */}
      <ChatArea
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoadingChat}
        documentsIndexedCount={documents.length}
      />
    </div>
  );
}

export default App;
