# Fabric PPT Generator

AI-powered PowerPoint slide generator using OpenAI API. Generate slides from text prompts in Fabric.js format and convert them to PowerPoint files.

## Project Structure

```
fabric-ppt/
├── web/          # React Router 7 + Fabric.js 7.0 Frontend
└── py/           # FastAPI Backend (Fabric JSON → PPTX Conversion)
```

## Installation & Setup

### 1. Python Backend (FastAPI)

```bash
cd py

# Install dependencies and run using UV
uv run uvicorn main:app --reload --port 8731

# Or use the start script
./start.sh
```

### 2. Web Frontend (React Router 7)

```bash
cd web

# Install packages
npm install

# Run dev server
npm run dev
```

### 3. Environment Variables

Create `web/.env` file and set your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key_here
```

## Usage

1. Open browser at `http://localhost:5173`
2. Enter slide content as text (e.g., "Title slide - 2025 Business Plan")
3. Click "Generate" button to create slide
4. After creating multiple slides, click "Download PPT" to export PowerPoint file
