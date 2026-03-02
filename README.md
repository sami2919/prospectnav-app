# ProspectNav

> AI-powered B2B sales intelligence — researches any company and generates a full account brief in minutes.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11+-yellow.svg)
![Node](https://img.shields.io/badge/node-22+-green.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg)
![CrewAI](https://img.shields.io/badge/CrewAI-multi--agent-orange.svg)

ProspectNav replaces hours of manual account research with a multi-agent AI pipeline. Enter a company name and your sales context — a CrewAI Researcher scours the web for real intelligence, an Analyst maps it to your value proposition, then 8 specialized sections generate in parallel and stream back to your screen in real time.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Frontend Setup](#frontend-setup)
  - [Python Backend Setup](#python-backend-setup)
  - [Supabase Setup](#supabase-setup)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Real web research** — CrewAI Researcher agent uses DuckDuckGo + LlamaIndex web reader to gather live company intelligence before generating anything
- **Multi-agent pipeline** — Researcher → Analyst → parallel Writer, each building on the last
- **8 intel sections generated in parallel** — Company Overview, Business Objectives, Competitive Analysis, Email Sequences, Cold Call Script, MEDDPICC Qualification, LinkedIn Strategy, Industry Insights
- **Live streaming UI** — Sections appear as they complete via SSE, no waiting for the full batch
- **Supabase backend** — Auth (email/password), PostgreSQL persistence, Row Level Security
- **API key stays server-side** — Anthropic key never touches the browser

---

## Architecture

```
Browser (React)
    │
    │  POST /generate  (SSE stream)
    ▼
FastAPI Backend (Python)
    │
    ├── CrewAI Pipeline
    │     ├── Researcher Agent
    │     │     ├── WebSearchTool  (DuckDuckGo)
    │     │     └── WebPageReaderTool  (LlamaIndex)
    │     └── Analyst Agent
    │           └── Strategic sales analysis
    │
    └── Parallel Section Generation (asyncio)
          └── 8x Anthropic Claude calls with research context
                │
                └── SSE events streamed back to browser

Supabase
    ├── Auth (JWT sessions)
    ├── PostgreSQL (accounts + sections)
    └── Edge Function (legacy direct Claude calls)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS |
| AI Backend | Python 3.11, FastAPI, CrewAI, LlamaIndex |
| LLM | Anthropic Claude (claude-sonnet-4-20250514) |
| Web Research | DuckDuckGo Search, LlamaIndex SimpleWebPageReader |
| Auth & DB | Supabase (PostgreSQL, Row Level Security) |
| Streaming | Server-Sent Events (SSE) |
| Deployment | Supabase Edge Functions (Deno), local FastAPI |

---

## Getting Started

### Prerequisites

- Node.js 22+
- Python 3.11+
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://console.anthropic.com) API key

### Frontend Setup

```bash
# Clone the repo
git clone https://github.com/sami2919/prospectnav-app.git
cd prospectnav-app

# Install dependencies
npm install

# Create your environment file
cp .env.example .env.local
```

Add these values to `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
```

```bash
# Start the frontend
npm run dev
```

### Python Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create your environment file
cp .env.example .env
```

Add to `backend/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

```bash
# Start the backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at `http://localhost:8000`. Check `http://localhost:8000/health` to confirm it's running.

### Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/20260228000000_initial.sql` via the Supabase SQL editor
3. Copy your project URL and anon key into `.env.local`

---

## Usage

1. Open `http://localhost:5173`
2. Sign up with your email — fill in your company name, role, and value proposition
3. Click **New Account** and enter a target company
4. Watch the pipeline run:
   - **Researching** — agents search the web for real company data
   - **Generating** — 8 sections stream in as they complete
5. Navigate between tabs to review the full intel brief

### Example generation request

```json
POST http://localhost:8000/generate
Content-Type: application/json

{
  "companyName": "Salesforce",
  "contactName": "Marc Benioff",
  "contactRole": "CEO",
  "industry": "CRM / SaaS",
  "ourCompany": "Acme Corp",
  "userRole": "Account Executive",
  "valueProposition": "We cut CRM data entry time by 60% using AI automation"
}
```

The endpoint returns an SSE stream. Each event looks like:

```
data: {"type": "progress", "stage": "researching", "message": "Researching Salesforce using web intelligence..."}

data: {"type": "section", "sectionType": "overview", "content": "# Salesforce Company Overview\n\n..."}

data: {"type": "complete"}
```

---

## Project Structure

```
prospectnav-app/
├── src/
│   ├── ProspectNav.jsx          # Main app component
│   ├── components/
│   │   └── AuthProvider.jsx     # Supabase auth context
│   ├── hooks/
│   │   ├── useAuth.js           # Auth state management
│   │   └── useAccounts.js       # Account CRUD + generation
│   └── lib/
│       ├── api.js               # Python backend SSE client
│       ├── supabase.js          # Supabase client
│       └── types.js             # Section type definitions
├── backend/
│   ├── main.py                  # FastAPI app + SSE endpoint
│   ├── crew.py                  # CrewAI agents (Researcher + Analyst)
│   ├── sections.py              # Async Claude section generation
│   ├── requirements.txt
│   └── .env.example
├── supabase/
│   ├── migrations/              # PostgreSQL schema
│   └── functions/
│       └── generate-section/    # Deno edge function (legacy)
└── .env.example
```

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

[MIT](LICENSE)
