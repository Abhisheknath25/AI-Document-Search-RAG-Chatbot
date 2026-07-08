import os
import pickle
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from langchain.docstore.document import Document
from langchain_openai import OpenAIEmbeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings

# Try to import FAISS, but provide fallback if it fails to load
try:
    from langchain_community.vectorstores import FAISS
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    print("FAISS not available. Falling back to Simple NumPy Vector Store.")

# Try to import Pinecone, but provide fallback if it fails
try:
    from pinecone import Pinecone as PineconeClient
    PINECONE_AVAILABLE = True
except ImportError:
    PINECONE_AVAILABLE = False
    print("Pinecone client not available.")


class SimpleNumPyVectorStore:
    """
    A lightweight, pure-Python fallback vector store that uses NumPy for cosine similarity.
    Saves and loads from a simple pickle file.
    """
    def __init__(self):
        self.documents: List[Document] = []
        self.embeddings: List[List[float]] = []

    def add_documents(self, documents: List[Document], embeddings: List[List[float]]):
        self.documents.extend(documents)
        self.embeddings.extend(embeddings)

    def similarity_search_by_vector(self, query_embedding: List[float], k: int = 4) -> List[Tuple[Document, float]]:
        if not self.embeddings:
            return []
        
        q = np.array(query_embedding)
        matrix = np.array(self.embeddings)
        
        # Calculate cosine similarity
        q_norm = np.linalg.norm(q)
        matrix_norm = np.linalg.norm(matrix, axis=1)
        
        # Avoid division by zero
        matrix_norm = np.where(matrix_norm == 0, 1e-10, matrix_norm)
        q_norm = 1e-10 if q_norm == 0 else q_norm
        
        scores = np.dot(matrix, q) / (matrix_norm * q_norm)
        
        # Get top k indices sorted by score descending
        top_k_indices = np.argsort(scores)[::-1][:k]
        
        results = []
        for idx in top_k_indices:
            results.append((self.documents[idx], float(scores[idx])))
        return results

    def save(self, filepath: str):
        with open(filepath, "wb") as f:
            pickle.dump({"documents": self.documents, "embeddings": self.embeddings}, f)

    def load(self, filepath: str):
        if os.path.exists(filepath):
            with open(filepath, "rb") as f:
                data = pickle.load(f)
                self.documents = data.get("documents", [])
                self.embeddings = data.get("embeddings", [])


class VectorStoreManager:
    def __init__(self, data_dir: str = "./data"):
        self.data_dir = data_dir
        os.makedirs(self.data_dir, exist_ok=True)
        self.local_db_path = os.path.join(self.data_dir, "local_store.pkl")
        self.faiss_db_path = os.path.join(self.data_dir, "faiss_store")
        
        # In-memory instances
        self.local_numpy_store = SimpleNumPyVectorStore()
        if os.path.exists(self.local_db_path):
            self.local_numpy_store.load(self.local_db_path)
            
        self.faiss_store = None
        
    def _get_embeddings_model(self, api_key: str, provider: str = "openai") -> Any:
        """
        Instantiates the embedding model based on provider and API key.
        """
        if provider == "google":
            return GoogleGenerativeAIEmbeddings(
                model="models/text-embedding-004",
                google_api_key=api_key
            )
        else:  # default openai
            return OpenAIEmbeddings(
                model="text-embedding-3-small",
                openai_api_key=api_key
            )

    def add_documents(
        self, 
        documents: List[Document], 
        api_key: str, 
        provider: str = "openai",
        store_type: str = "local",
        pinecone_config: Optional[Dict[str, str]] = None
    ) -> bool:
        """
        Generates embeddings and adds documents to the specified store.
        """
        if not documents:
            return False
            
        embeddings_model = self._get_embeddings_model(api_key, provider)
        
        if store_type == "pinecone" and PINECONE_AVAILABLE:
            if not pinecone_config or "api_key" not in pinecone_config or "index_name" not in pinecone_config:
                raise ValueError("Pinecone configuration is missing required parameters.")
            
            pc = PineconeClient(api_key=pinecone_config["api_key"])
            index = pc.Index(pinecone_config["index_name"])
            
            # Generate embeddings and upload to Pinecone
            texts = [doc.page_content for doc in documents]
            embeddings = embeddings_model.embed_documents(texts)
            
            vectors = []
            for idx, (doc, emb) in enumerate(zip(documents, embeddings)):
                vectors.append({
                    "id": f"{doc.metadata.get('source')}_page{doc.metadata.get('page')}_{idx}",
                    "values": emb,
                    "metadata": {
                        "text": doc.page_content,
                        "source": doc.metadata.get("source"),
                        "page": doc.metadata.get("page")
                    }
                })
            
            # Batch upsert
            batch_size = 100
            for i in range(0, len(vectors), batch_size):
                index.upsert(vectors=vectors[i:i + batch_size])
            return True
            
        else: # Local storage
            texts = [doc.page_content for doc in documents]
            embeddings = embeddings_model.embed_documents(texts)
            
            # Update Simple NumPy Fallback Store (always done as a backup/local fallback)
            self.local_numpy_store.add_documents(documents, embeddings)
            self.local_numpy_store.save(self.local_db_path)
            
            # Try to build/update FAISS if available
            if FAISS_AVAILABLE:
                try:
                    if os.path.exists(self.faiss_db_path):
                        self.faiss_store = FAISS.load_local(
                            self.faiss_db_path, 
                            embeddings_model,
                            allow_dangerous_deserialization=True
                        )
                        self.faiss_store.add_documents(documents)
                    else:
                        self.faiss_store = FAISS.from_documents(documents, embeddings_model)
                    
                    self.faiss_store.save_local(self.faiss_db_path)
                except Exception as e:
                    print(f"Failed to update FAISS store: {e}. Falling back to NumPy store only.")
            
            return True

    def search(
        self, 
        query: str, 
        api_key: str, 
        provider: str = "openai",
        store_type: str = "local",
        k: int = 4,
        pinecone_config: Optional[Dict[str, str]] = None
    ) -> List[Tuple[Document, float]]:
        """
        Searches the active store for documents matching the query.
        """
        embeddings_model = self._get_embeddings_model(api_key, provider)
        query_embedding = embeddings_model.embed_query(query)
        
        if store_type == "pinecone" and PINECONE_AVAILABLE:
            if not pinecone_config or "api_key" not in pinecone_config or "index_name" not in pinecone_config:
                raise ValueError("Pinecone configuration is missing required parameters.")
            
            pc = PineconeClient(api_key=pinecone_config["api_key"])
            index = pc.Index(pinecone_config["index_name"])
            
            res = index.query(vector=query_embedding, top_k=k, include_metadata=True)
            results = []
            for match in res.get("matches", []):
                meta = match.get("metadata", {})
                doc = Document(
                    page_content=meta.get("text", ""),
                    metadata={
                        "source": meta.get("source", "unknown"),
                        "page": int(meta.get("page", 0))
                    }
                )
                results.append((doc, float(match.get("score", 0.0))))
            return results
            
        else: # Local storage
            # Use FAISS if available and built
            if FAISS_AVAILABLE:
                try:
                    if not self.faiss_store and os.path.exists(self.faiss_db_path):
                        self.faiss_store = FAISS.load_local(
                            self.faiss_db_path, 
                            embeddings_model,
                            allow_dangerous_deserialization=True
                        )
                    
                    if self.faiss_store:
                        # FAISS similarity search returns (Doc, L2 distance/Score)
                        # We return as a list of Tuple[Document, float]
                        return self.faiss_store.similarity_search_with_score(query, k=k)
                except Exception as e:
                    print(f"FAISS search failed: {e}. Falling back to NumPy store.")
            
            # NumPy fallback search
            return self.local_numpy_store.similarity_search_by_vector(query_embedding, k=k)

    def delete_document(self, filename: str) -> bool:
        """
        Removes a document's chunks from the local storage.
        """
        # NumPy Fallback delete
        new_docs = []
        new_embs = []
        deleted_count = 0
        
        for doc, emb in zip(self.local_numpy_store.documents, self.local_numpy_store.embeddings):
            if doc.metadata.get("source") != filename:
                new_docs.append(doc)
                new_embs.append(emb)
            else:
                deleted_count += 1
                
        self.local_numpy_store.documents = new_docs
        self.local_numpy_store.embeddings = new_embs
        self.local_numpy_store.save(self.local_db_path)
        
        # If FAISS was present, we simply reconstruct it from the remaining documents
        # since standard FAISS doesn't support easy metadata-based deletions.
        if FAISS_AVAILABLE and os.path.exists(self.faiss_db_path):
            try:
                import shutil
                if os.path.exists(self.faiss_db_path):
                    shutil.rmtree(self.faiss_db_path)
                self.faiss_store = None
                
                # Rebuild if documents remain
                if self.local_numpy_store.documents:
                    # We can lazy rebuild or build on next query. We will rebuild here
                    # using standard fake/mock embeddings or wait until a query comes.
                    # Since we don't have the API key in the delete call directly,
                    # we let it lazy rebuild when the next query/upload happens.
                    pass
            except Exception as e:
                print(f"Error resetting FAISS index: {e}")
                
        return deleted_count > 0

    def list_documents(self) -> List[str]:
        """
        Lists filenames of unique documents currently indexed in local store.
        """
        sources = set()
        for doc in self.local_numpy_store.documents:
            source = doc.metadata.get("source")
            if source:
                sources.add(source)
        return sorted(list(sources))
