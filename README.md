# IntelliDesk AI — RAG Self-Service & Automated Ticket Triage Engine

> **Production-ready AI customer support system** combining Retrieval-Augmented Generation (RAG) for grounded self-service answers with an automated LLM triage agent that escalates unresolved queries to human agents with structured tickets.

---

## 🏗 Architecture

```mermaid
flowchart TD
    subgraph FE[Frontend - React + Vite + Tailwind]
        UI[Split-Screen UI]
        CHAT[Chat Panel]
        QUEUE[Escalation Queue]
    end

    subgraph BE[Backend - FastAPI + Python]
        API[FastAPI REST API]
        RAG[RAG Engine<br/>Gemini Embeddings + ChromaDB]
        TRIAGE[Triage Agent<br/>Structured Output]
        DB[(SQLite / PostgreSQL)]
    end

    subgraph EXT[External Services]
        GEMINI[Google Gemini API<br/>gemini-2.5-flash + text-embedding-004]
    end

    UI --> CHAT
    UI --> QUEUE
    CHAT -->|POST /api/chat| API
    QUEUE -->|GET /api/admin/tickets| API
    QUEUE -->|PATCH /api/admin/tickets/:id/resolve| API
    API -->|User Message| RAG
    RAG -->|Vector Search| CHROMA[(ChromaDB)]
    RAG -->|Context + Query| GEMINI
    GEMINI -->|Answer / ESCALATE_REQUIRED| RAG
    RAG -->|If escalated| TRIAGE
    TRIAGE -->|Structured TicketExtraction| GEMINI
    GEMINI -->|TicketExtraction| TRIAGE
    TRIAGE -->|SupportTicket| DB
    API -->|KB Upload| RAG
    RAG -->|Ingest + Embed| CHROMA
```

### Data Flow: Two Pipelines

| Pipeline | Trigger | Flow | Output |
|----------|---------|------|--------|
| **Pipeline A: RAG Self-Service** | User asks question | `query_rag()` → Chroma top-3 → Gemini (context-only) | Grounded answer + source citations |
| **Pipeline B: Auto-Triage Escalation** | RAG returns `ESCALATE_REQUIRED` | `analyze_and_triage()` → Gemini structured output → `SupportTicket` | Escalation reply + ticket in DB + queue update |

---

## 🛠 Tech Stack Justification

| Layer | Technology | Why |
|-------|------------|-----|
| **API Framework** | FastAPI | Async, automatic OpenAPI docs, type-safe with Pydantic v2 |
| **Database** | SQLAlchemy + SQLite/PostgreSQL | ORM flexibility, zero-config dev, production-ready swap |
| **Vector Store** | ChromaDB | Persistent, serverless, zero-infra, perfect for RAG prototypes |
| **Embeddings** | Google `text-embedding-004` | State-of-the-art multilingual, 768-dim, free tier generous |
| **LLM** | Google `gemini-2.5-flash` | Fast, cost-effective, supports structured output via `with_structured_output()` |
| **RAG Orchestration** | LangChain | Standardized loaders, splitters, retrievers, prompt templates |
| **Frontend** | React 18 + Vite + Tailwind | Modern DX, fast HMR, utility-first CSS, dark-mode native |
| **Icons** | Lucide React | Consistent, tree-shakeable, accessible SVG icons |
| **Deployment** | Render (backend) + Vercel (frontend) | Free tiers, auto-deploy from Git, custom domains |

---

## 🚀 Local Setup (Windows / macOS / Linux)

### Prerequisites
- Python 3.10+
- Node.js 18+
- Google Gemini API Key → [Get one free](https://aistudio.google.com/app/apikey)

### 1. Clone & Configure Backend
```bash
git clone <your-repo-url>
cd intellidesk/backend

# Create virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 2. Run Backend
```bash
uvicorn app.main:app --reload --port 8000
```
- API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/`

### 3. Ingest Sample Knowledge Base
```bash
# Option A: Via API (after frontend runs)
# Option B: Direct script
python -c "
from app.services.rag_engine import ingest_file
print(f'Indexed {ingest_file(\"../sample_company_policy.txt\")} chunks')
"
```

### 4. Run Frontend
```bash
cd ../frontend
npm install
npm run dev
```
- App: `http://localhost:5173` (proxies `/api` to `localhost:8000`)

### 5. Test the Full Flow
1. Open `http://localhost:5173`
2. Click **Upload Knowledge Base** → select `backend/sample_company_policy.txt`
3. Wait for "Indexed sample_company_policy.txt (X chunks)"
4. Ask questions in the chat panel (see test queries below)

---

## 📡 API Endpoint Reference

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| `GET` | `/` | Health check | — | `{status, service}` |
| `POST` | `/api/chat` | Customer chat | `ChatRequest` | `ChatResponse` |
| `POST` | `/api/admin/upload-kb` | Upload KB file | `multipart/form-data` (file) | `{filename, chunks_indexed}` |
| `GET` | `/api/admin/tickets` | List all tickets | — | `TicketResponse[]` |
| `PATCH` | `/api/admin/tickets/{id}/resolve` | Resolve ticket | — | `TicketResponse` |

### Schemas

**ChatRequest**
```json
{ "session_id": "string", "message": "string" }
```

**ChatResponse**
```json
{
  "reply": "string",
  "escalated": "boolean",
  "sources": ["string"],
  "ticket": { "id": "int", "session_id": "string", "customer_query": "string", "summary": "string", "category": "string", "sentiment": "string", "priority": "string", "status": "string", "created_at": "datetime" } | null
}
```

**TicketResponse** (full SupportTicket model with `from_attributes=true`)

---

## 🧪 Sample Test Queries

### Pipeline A: RAG Self-Service (grounded answers with citations)

| Query | Expected Behavior |
|-------|-------------------|
| `"What is your return policy?"` | Answer cites `sample_company_policy.txt` with 14-day window |
| `"How long is the hardware warranty?"` | Answer cites 1-year limited warranty |
| `"When will I get my refund if I paid by UPI?"` | Answer cites 24-hour UPI refund processing |
| `"Can I cancel my order after it ships?"` | Answer cites order cancellation rules (cannot cancel after shipped) |

### Pipeline B: Auto-Triage Escalation (triggers ticket creation)

| Query | Why It Escalates |
|-------|------------------|
| `"I want to speak to a human agent right now"` | Explicit human request → `ESCALATE_REQUIRED` |
| `"This is ridiculous! I've been waiting for 3 weeks for my refund and nobody cares!"` | Strong frustration + urgency → `ESCALATE_REQUIRED` |
| `"My business is losing money because your API is down and I need this fixed immediately"` | Urgent sentiment + business impact → High priority ticket |
| `"I was charged twice for the same order and I want my money back now"` | Billing + frustrated → High priority Refund ticket |

**Verify escalation:**
1. Query appears in chat with amber escalation card showing Ticket ID, Priority, Category, Sentiment
2. Right panel auto-refreshes → new ticket appears in queue
3. Click **Mark Resolved** → status updates to "Resolved" with green badge

---

## 🐳 Backend Deployment (Render / Hugging Face Spaces)

### `backend/Dockerfile`
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for ChromaDB
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app ./app
COPY ./sample_company_policy.txt ./sample_company_policy.txt

# Create data directories for ChromaDB persistence
RUN mkdir -p /app/data/chroma_db /app/data/uploads

# Expose port
EXPOSE 8000

# Run with gunicorn for production
CMD ["gunicorn", "app.main:app", "--workers", "2", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

### `render.yaml` (Infrastructure as Code)
```yaml
# render.yaml
services:
  - type: web
    name: intellidesk-backend
    env: docker
    dockerfilePath: ./backend/Dockerfile
    dockerContext: ./backend
    plan: free
    region: oregon
    envVars:
      - key: GEMINI_API_KEY
        sync: false  # Set manually in Render dashboard
      - key: DATABASE_URL
        fromDatabase:
          name: intellidesk-db
          property: connectionString
      - key: CHROMA_PATH
        value: /app/data/chroma_db
      - key: UPLOAD_DIR
        value: /app/data/uploads
    disk:
      name: chroma-storage
      mountPath: /app/data
      sizeGB: 1

databases:
  - name: intellidesk-db
    plan: free
    databaseName: intellidesk
    user: intellidesk
    region: oregon
```

#### Deploy to Render
1. Push repo to GitHub
2. In Render dashboard → **New +** → **Blueprint** → connect repo
3. Render reads `render.yaml`, provisions:
   - Web service (Docker)
   - Free PostgreSQL database (Neon.tech compatible)
   - 1 GB persistent disk for ChromaDB
4. Add `GEMINI_API_KEY` in Render → Environment Variables
5. Deploy → get `https://intellidesk-backend.onrender.com`

#### Switch to Neon.tech PostgreSQL (Free Tier)
1. Create free Neon project → [neon.tech](https://neon.tech)
2. Copy connection string: `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require`
3. In Render → Environment Variables → set `DATABASE_URL` to Neon connection string
4. Redeploy — SQLAlchemy auto-creates tables on startup

---

## 🌐 Frontend Deployment (Vercel)

### `vercel.json` (optional, for SPA routing)
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Deploy Steps
```bash
cd frontend
npm run build
# Output: dist/
```
1. Push `frontend/` folder to GitHub (or full repo)
2. In Vercel → **Add New Project** → Import repo
3. Framework: **Vite** (auto-detected)
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Environment Variable: `VITE_API_URL=https://intellidesk-backend.onrender.com/api`
7. Deploy → get `https://intellidesk.vercel.app`

> **Note:** Update `vite.config.js` proxy only for local dev. In production, set `VITE_API_URL` and use it in `App.jsx`:
> ```js
> const API_BASE = import.meta.env.VITE_API_URL || '/api'
> ```

---

## 📁 Project Structure

```
intellidesk/
├── README.md
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   ├── Dockerfile
│   ├── render.yaml
│   ├── sample_company_policy.txt
│   └── app/
│       ├── config.py
│       ├── database.py
│       ├── models.py
│       ├── schemas.py
│       ├── main.py
│       ├── services/
│       │   ├── rag_engine.py
│       │   └── triage_agent.py
│       └── routers/
│           ├── chat.py
│           └── admin.py
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── vercel.json
    └── src/
        ├── main.jsx
        ├── index.css
        └── App.jsx
```

---

## 🎯 Viva / Portfolio Talking Points

| Topic | Key Points |
|-------|------------|
| **RAG Design** | ChromaDB persistence, 500/100 chunk split, top-3 retrieval, strict context-only prompt, `ESCALATE_REQUIRED` sentinel |
| **Structured LLM Output** | Pydantic `TicketExtraction` + `with_structured_output()` — no regex parsing, guaranteed schema compliance |
| **Two-Pipeline Architecture** | Clean separation: RAG for knowledge queries, Triage for escalation — each independently testable |
| **Production Considerations** | Async DB sessions, CORS config, persistent vector store disk, health endpoint, structured logging ready |
| **Cost Control** | `gemini-2.5-flash` (cheap), `text-embedding-004` (free tier), SQLite dev / PG prod, serverless Chroma |
| **Extensibility** | Add auth (JWT), multi-tenancy (session_id), analytics (LangSmith), eval harness (RAGAS) |

---

## 📄 License

MIT — free for learning, portfolio, and commercial use.

---

**Built with ❤️ for the AI engineering portfolio.**  
*Questions? Open an issue or reach out on LinkedIn.*