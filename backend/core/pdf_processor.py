import io
import os
from typing import List, Dict, Any
from pypdf import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document

class PDFProcessor:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )

    def extract_text_from_pdf(self, file_bytes: bytes, filename: str) -> List[Document]:
        """
        Extracts text from PDF bytes page by page.
        Returns a list of LangChain Document objects with page metadata.
        """
        documents = []
        try:
            pdf_file = io.BytesIO(file_bytes)
            reader = PdfReader(pdf_file)
            
            for page_idx, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                # Clean up multiple spaces or null characters
                page_text = page_text.replace("\x00", "").strip()
                if page_text:
                    # Page numbers are usually 1-indexed for users
                    doc = Document(
                        page_content=page_text,
                        metadata={
                            "source": filename,
                            "page": page_idx + 1
                        }
                    )
                    documents.append(doc)
        except Exception as e:
            print(f"Error processing PDF {filename}: {e}")
            raise e
            
        return documents

    def process_pdf(self, file_bytes: bytes, filename: str) -> List[Document]:
        """
        Extracts text and chunks it, retaining page metadata for citations.
        """
        documents = self.extract_text_from_pdf(file_bytes, filename)
        if not documents:
            return []
        
        # Split documents into chunks
        chunks = self.text_splitter.split_documents(documents)
        return chunks
