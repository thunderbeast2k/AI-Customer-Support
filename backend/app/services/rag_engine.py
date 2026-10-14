import os
from typing import List, Dict
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_core.documents import Document
from app.config import GEMINI_API_KEY, CHROMA_PATH


embeddings = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-004",
    google_api_key=GEMINI_API_KEY
)

vector_store = Chroma(
    persist_directory=CHROMA_PATH,
    embedding_function=embeddings
)

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=100
)

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.1,
    google_api_key=GEMINI_API_KEY
)


def ingest_file(file_path: str) -> int:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    if file_path.lower().endswith(".pdf"):
        loader = PyPDFLoader(file_path)
    elif file_path.lower().endswith(".txt"):
        loader = TextLoader(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_path}")

    documents = loader.load()
    chunks = text_splitter.split_documents(documents)

    for chunk in chunks:
        chunk.metadata["source"] = os.path.basename(file_path)

    vector_store.add_documents(chunks)
    return len(chunks)


def query_rag(question: str) -> Dict:
    retriever = vector_store.as_retriever(search_kwargs={"k": 3})
    relevant_docs: List[Document] = retriever.invoke(question)

    sources = list({doc.metadata.get("source", "unknown") for doc in relevant_docs})
    context = "\n\n".join(doc.page_content for doc in relevant_docs)

    if not context.strip():
        return {
            "answer": "I don't have enough information to answer that question.",
            "needs_escalation": False,
            "sources": []
        }

    prompt = f"""You are a customer support assistant. Answer the question STRICTLY using ONLY the provided context below.

If the answer is not in the context, or if the customer explicitly asks for a human agent, or if the customer expresses strong anger/frustration that requires human intervention, output exactly: ESCALATE_REQUIRED

Context:
{context}

Question: {question}

Answer:"""

    response = llm.invoke(prompt)
    answer = response.content.strip()

    needs_escalation = answer == "ESCALATE_REQUIRED"
    if needs_escalation:
        answer = "I understand this is important. Let me connect you with a human agent who can better assist you."

    return {
        "answer": answer,
        "needs_escalation": needs_escalation,
        "sources": sources
    }