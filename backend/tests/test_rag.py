import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Dynamically add the parent directory (backend) to the sys.path to prevent module import errors
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import numpy as np
from langchain_core.documents import Document
from core.pdf_processor import PDFProcessor
from core.vector_store import VectorStoreManager, SimpleNumPyVectorStore


class TestRAGBackend(unittest.TestCase):
    def setUp(self):
        self.processor = PDFProcessor(chunk_size=100, chunk_overlap=20)
        self.vector_manager = VectorStoreManager(data_dir="./test_data")

    def tearDown(self):
        # Clean up test directories
        import shutil
        import os
        if os.path.exists("./test_data"):
            shutil.rmtree("./test_data")

    def test_pdf_processing_chunks(self):
        # Create a mock PDF structure
        # Since pypdf PdfReader takes a file-like object, we can mock it
        # However, testing RecursiveCharacterTextSplitter is simple
        doc = Document(page_content="This is a test document. It contains some text that we want to chunk. Chunking splits the document into smaller parts.", metadata={"source": "test.pdf", "page": 1})
        
        chunks = self.processor.text_splitter.split_documents([doc])
        self.assertTrue(len(chunks) > 0)
        self.assertEqual(chunks[0].metadata["source"], "test.pdf")
        self.assertEqual(chunks[0].metadata["page"], 1)

    def test_simple_numpy_vector_store(self):
        store = SimpleNumPyVectorStore()
        
        doc1 = Document(page_content="Dogs are faithful animals.", metadata={"source": "dogs.pdf"})
        doc2 = Document(page_content="Cats are independent pets.", metadata={"source": "cats.pdf"})
        
        # Add docs with mock embeddings
        store.add_documents(
            documents=[doc1, doc2],
            embeddings=[
                [1.0, 0.0, 0.0],  # Vector for doc1
                [0.0, 1.0, 0.0]   # Vector for doc2
            ]
        )
        
        # Query closest to doc1
        query_emb = [1.0, 0.1, 0.0]
        results = store.similarity_search_by_vector(query_emb, k=1)
        
        self.assertEqual(len(results), 1)
        matched_doc, score = results[0]
        self.assertEqual(matched_doc.page_content, "Dogs are faithful animals.")
        self.assertTrue(score > 0.9)

    @patch("core.vector_store.VectorStoreManager._get_embeddings_model")
    def test_vector_manager_add_and_search(self, mock_embeddings):
        # Mock embeddings model response
        mock_emb_instance = MagicMock()
        mock_emb_instance.embed_documents.return_value = [[0.9, 0.1], [0.1, 0.9]]
        mock_emb_instance.embed_query.return_value = [0.85, 0.15]
        mock_embeddings.return_value = mock_emb_instance
        
        docs = [
            Document(page_content="FastAPI is a modern web framework.", metadata={"source": "fastapi.pdf", "page": 1}),
            Document(page_content="React is a frontend framework.", metadata={"source": "react.pdf", "page": 1})
        ]
        
        # Test addition (local mode)
        self.vector_manager.add_documents(
            documents=docs,
            api_key="mock-api-key",
            provider="openai",
            store_type="local"
        )
        
        # Verify unique docs list
        unique_docs = self.vector_manager.list_documents()
        self.assertEqual(unique_docs, ["fastapi.pdf", "react.pdf"])
        
        # Test search (local mode)
        results = self.vector_manager.search(
            query="Tell me about FastAPI",
            api_key="mock-api-key",
            provider="openai",
            store_type="local",
            k=1
        )
        
        self.assertEqual(len(results), 1)
        matched_doc, score = results[0]
        self.assertEqual(matched_doc.metadata["source"], "fastapi.pdf")


if __name__ == "__main__":
    unittest.main()
