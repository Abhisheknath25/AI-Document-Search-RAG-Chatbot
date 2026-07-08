from typing import List, Dict, Any
from langchain.docstore.document import Document
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage

RAG_SYSTEM_PROMPT = """You are a highly helpful and precise AI Assistant designed to search documents and answer questions.
You are given a user query and a set of context blocks extracted from documents.
Your task is to answer the user query based ONLY on the provided context blocks.

Instructions:
1. Answer the query accurately, using only information from the context.
2. If the context does not contain enough information to answer the query, state clearly that you do not know or that the information is not present in the uploaded documents. Do not make up answers.
3. Reference the sources of your information using inline citations in the format [Doc 1], [Doc 2], etc., corresponding to the indices of the documents provided in the context below.
4. Keep the answer structured, clear, and professional. Use markdown formatting where appropriate (bold, bullet points, lists).

Context Blocks:
{context_text}
"""

class LLMChainManager:
    def _get_llm(self, api_key: str, provider: str = "openai", temperature: float = 0.2) -> Any:
        """
        Instantiates the LLM based on provider and API key.
        """
        if provider == "google":
            return ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=api_key,
                temperature=temperature
            )
        else: # default openai
            return ChatOpenAI(
                model="gpt-4o-mini",
                openai_api_key=api_key,
                temperature=temperature
            )

    def generate_answer(
        self, 
        query: str, 
        retrieved_docs: List[Document], 
        api_key: str, 
        provider: str = "openai"
    ) -> str:
        """
        Generates an answer based on retrieved documents and the user query.
        """
        if not retrieved_docs:
            return "No document context is available. Please upload a PDF document and index it first."
            
        # Format the context text with labels for citations
        context_parts = []
        for idx, doc in enumerate(retrieved_docs):
            filename = doc.metadata.get("source", "Unknown Document")
            page = doc.metadata.get("page", "?")
            context_parts.append(
                f"--- [Doc {idx + 1}] Source: {filename} (Page {page}) ---\n"
                f"{doc.page_content}\n"
            )
        context_text = "\n".join(context_parts)
        
        # Instantiate LLM
        llm = self._get_llm(api_key, provider)
        
        # Build prompt messages
        system_prompt = RAG_SYSTEM_PROMPT.format(context_text=context_text)
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=query)
        ]
        
        try:
            response = llm.invoke(messages)
            return response.content
        except Exception as e:
            print(f"Error calling LLM provider {provider}: {e}")
            return f"Error communicating with {provider.capitalize()} API: {str(e)}"
