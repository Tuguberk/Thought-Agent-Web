# Thought Agent

An agent-assisted note-taking app with knowledge graph visualization.

## Features

- **Markdown Notes**: Write notes in Markdown.
- **AI Agent**: Automatically summarizes notes and generates embeddings.
- **Knowledge Graph**: Visualizes connections between notes.
- **Auto-Linking**: Finds relevant notes and creates links automatically using Vector Search and LLM reasoning.

## Setup

1. **Database**: Ensure you have a PostgreSQL database with `pgvector` extension enabled.
2. **Environment Variables**:

   - Copy `.env.example` to `.env` (if not already done).
   - Set `DATABASE_URL` to your Postgres connection string.
   - Set `OPENROUTER_API_KEY` to your OpenRouter API key.

3. **Install Dependencies**:

   ```bash
   npm install
   ```

4. **Initialize Database**:

   ```bash
   npx prisma db push
   ```

5. **Run Development Server**:
   ```bash
   npm run dev
   ```

## Tech Stack

- Next.js 15 (App Router)
- TailwindCSS
- Prisma ORM
- PostgreSQL + pgvector
- Vercel AI SDK
- OpenRouter (LLMs)
- React Force Graph
