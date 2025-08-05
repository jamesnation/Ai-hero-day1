## Features

### Deep Search with Streamlined Planning
This application implements an intelligent search system that:
- **Plans research strategy** using chain-of-thought prompting to break down complex questions
- **Generates targeted queries** based on strategic research plans
- **Always searches and summarizes** before deciding if enough information is gathered
- Searches the web for relevant information using multiple parallel queries
- Scrapes the content of search results
- **Summarizes scraped content** to reduce context window usage while maintaining information diversity
- Uses AI to generate comprehensive answers based on the summarized information

### Key Components
- **Planning & Query Generation**: Strategic research planning with chain-of-thought prompting
- **Search & Scrape**: Uses Serper API for search and custom scraper for content extraction
- **Summarization**: AI-powered summarization using Gemini 2.0 Flash Lite for fast, large-context processing
- **Caching**: Redis-based caching for search results and summaries to improve performance
- **Telemetry**: Langfuse integration for monitoring and tracing
- **Context Management**: Intelligent system context that uses summaries instead of raw scraped content
- **Modular Architecture**: Separated planning, query generation, and action selection for better optimization

## TODO

Do related followup questions.

Handle anonymous requests to the API, rate limit by IP.

Use a chunking system on the crawled information.

Add 'edit' button, and 'rerun from here' button.

Add evals.

Handle conversations longer than the context window by summarizing.

How do you get the LLM to ask followup questions?

## Setup

1. Install dependencies with `pnpm`

```bash
pnpm install
```

2. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)

3. Run `./start-database.sh` to start the database.

4. Run `./start-redis.sh` to start the Redis server.
