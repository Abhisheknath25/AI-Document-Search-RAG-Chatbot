import os
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Header, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import core modules
from core.pdf_processor import PDFProcessor
from core.vector_store import VectorStoreManager
from core.llm_chain import LLMChainManager

app = FastAPI(
    title="AI Document Search (RAG Chatbot) API",
    description="Backend API for uploading PDFs, indexing text chunks, and running context-augmented chat queries with citations.",
    version="1.0.0"
)

# Enable CORS for frontend client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Open for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate core managers
pdf_processor = PDFProcessor()
vector_store_manager = VectorStoreManager(data_dir="./data")
llm_chain_manager = LLMChainManager()

class ChatRequest(BaseModel):
    query: str

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/upload")
async def upload_documents(
    files: List[UploadFile] = File(...),
    x_provider: str = Header("openai"),
    x_api_key: str = Header(None),
    x_store_type: str = Header("local"),
    x_pinecone_key: Optional[str] = Header(None),
    x_pinecone_index: Optional[str] = Header(None)
):
    if not x_api_key:
        raise HTTPException(status_code=400, detail="API Key (x-api-key header) is required.")

    pinecone_config = None
    if x_store_type == "pinecone":
        if not x_pinecone_key or not x_pinecone_index:
            raise HTTPException(
                status_code=400, 
                detail="Pinecone API Key (x-pinecone-key) and Index Name (x-pinecone-index) are required for Pinecone storage."
            )
        pinecone_config = {
            "api_key": x_pinecone_key,
            "index_name": x_pinecone_index
        }

    total_chunks_indexed = 0
    uploaded_files_summary = []

    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"File {file.filename} is not a PDF.")
            
        try:
            content = await file.read()
            chunks = pdf_processor.process_pdf(content, file.filename)
            
            if chunks:
                vector_store_manager.add_documents(
                    documents=chunks,
                    api_key=x_api_key,
                    provider=x_provider,
                    store_type=x_store_type,
                    pinecone_config=pinecone_config
                )
                total_chunks_indexed += len(chunks)
                uploaded_files_summary.append({
                    "filename": file.filename,
                    "chunks": len(chunks),
                    "status": "success"
                })
            else:
                uploaded_files_summary.append({
                    "filename": file.filename,
                    "chunks": 0,
                    "status": "empty_or_failed"
                })
        except Exception as e:
            uploaded_files_summary.append({
                "filename": file.filename,
                "error": str(e),
                "status": "failed"
            })

    return {
        "message": f"Successfully processed {len(files)} files.",
        "details": uploaded_files_summary,
        "total_chunks": total_chunks_indexed
    }

@app.get("/api/documents")
async def list_documents():
    """
    Returns the list of documents indexed locally.
    """
    try:
        docs = vector_store_manager.list_documents()
        return {"documents": docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/documents/{filename}")
async def delete_document(filename: str):
    """
    Deletes an indexed document.
    """
    try:
        deleted = vector_store_manager.delete_document(filename)
        if deleted:
            return {"message": f"Document '{filename}' successfully deleted from vector index."}
        else:
            raise HTTPException(status_code=404, detail=f"Document '{filename}' not found in index.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_with_documents(
    request: ChatRequest,
    x_provider: str = Header("openai"),
    x_api_key: str = Header(None),
    x_store_type: str = Header("local"),
    x_pinecone_key: Optional[str] = Header(None),
    x_pinecone_index: Optional[str] = Header(None)
):
    if not x_api_key:
        raise HTTPException(status_code=400, detail="API Key (x-api-key header) is required.")
        
    pinecone_config = None
    if x_store_type == "pinecone":
        if not x_pinecone_key or not x_pinecone_index:
            raise HTTPException(
                status_code=400, 
                detail="Pinecone API Key and Index Name are required for Pinecone store query."
            )
        pinecone_config = {
            "api_key": x_pinecone_key,
            "index_name": x_pinecone_index
        }

    try:
        # 1. Retrieve relevant chunks
        retrieved_docs_with_scores = vector_store_manager.search(
            query=request.query,
            api_key=x_api_key,
            provider=x_provider,
            store_type=x_store_type,
            k=4,
            pinecone_config=pinecone_config
        )
        
        # Extract document list
        retrieved_docs = [doc for doc, score in retrieved_docs_with_scores]
        
        # 2. Call LLM to generate answer based on retrieved documents
        answer = llm_chain_manager.generate_answer(
            query=request.query,
            retrieved_docs=retrieved_docs,
            api_key=x_api_key,
            provider=x_provider
        )
        
        # 3. Format citation metadata
        sources = []
        for idx, doc in enumerate(retrieved_docs):
            sources.append({
                "id": idx + 1,
                "document": doc.metadata.get("source", "Unknown"),
                "page": doc.metadata.get("page", "?"),
                "text": doc.page_content
            })
            
        return {
            "answer": answer,
            "sources": sources
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# Mount static folder (compiled React frontend) if it exists
from fastapi.staticfiles import StaticFiles
static_path = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_path):
    app.mount("/", StaticFiles(directory=static_path, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    # Read port from env or default to 8000
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

