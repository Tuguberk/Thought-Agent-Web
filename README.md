# ⚠️ Project Archived
This project is now **archived** and is no longer being actively developed. The journey continues in a new and improved form as an Obsidian plugin:

👉 **[Thought Agent Obsidian](https://github.com/Tuguberk/Thought-Agent-Obsidian)**

---

# Thought Agent

An agent-assisted note-taking app with knowledge graph visualization. This project was the original web-based prototype for an AI agent that manages a personal knowledge base.

## Technical Architecture

Thought Agent is built as a self-organizing knowledge system where notes are not just static text, but active nodes in a semantic network.

### 1. Semantic Engine
- **Embeddings**: Uses OpenAI's `text-embedding-3-small` to convert markdown notes into high-dimensional vectors.
- **Vector Database**: PostgreSQL with the `pgvector` extension is used for efficient similarity searches.
- **Similarity Logic**: Connections are proposed using Cosine Distance (`<=>`) with a threshold of `0.55` to ensure high relevance and reduce graph noise.

### 2. Agentic Workflow (Powered by Gemini)
When a note is saved or imported, an automated agent (`src/lib/agent.ts`) triggers a pipeline:
- **Phase 1: Analysis**: Extracting a 1-2 sentence summary, descriptive title, and key entities.
- **Phase 2: Inlining**: The agent identifies keywords and automatically wraps them in `[[wikilinks]]`.
- **Phase 3: Linking**: An LLM (Gemini 2.5 Flash Lite) evaluates the note against semantic candidates to create high-quality non-obvious connections.

### 3. Knowledge Graph
- **Dynamic Visualization**: Uses `react-force-graph-2d` to render a real-time interactive graph.
- **Link Types**:
  - `bracket`: Explicit `[[links]]` found in text.
  - `keyword`: Links to auto-generated topic nodes that summarize their child notes.
  - `semantic`: Deep discovery links proposed by the AI based on context.

## Tech Stack

- **Framework**: Next.js 15 (App Router - Standalone mode)
- **Database**: PostgreSQL (Prisma ORM) + pgvector
- **AI**: OpenRouter (Google Gemini & OpenAI Embeddings)
- **UI/UX**: TailwindCSS, Lucide Icons, React Resizable Panels
- **Graph**: React Force Graph

## Setup (Legacy)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Tuguberk/thought-agent.git
   cd thought-agent
   ```

2. **Environment Variables**:
   - Copy `.env.example` to `.env`.
   - Fill in `DATABASE_URL`, `OPENROUTER_API_KEY`, and `AUTH_SECRET`.

3. **Database**: 
   ```bash
   docker-compose up -d
   npm install
   npx prisma db push
   ```

4. **Run**:
   ```bash
   npm run dev
   ```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
