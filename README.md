# Lit Chat Demo

Minimal literature search + chat demo built with Next.js, the Vercel AI SDK, and the [Valyu API](https://docs.valyu.ai).

**Flow:** quick search over PubMed + Wiley HLS → select papers → chat grounded in exactly those papers. The model can also call Valyu search mid-conversation to pull new evidence.

How selected papers reach the model:

- Open-access paper → full text fetched via the Contents API and pinned into context
- Closed-access paper → abstract only
- Wiley HLS paper → abstract + the licensed passages returned by search (never scraped)

## Setup

```bash
pnpm install
```

Create `.env.local`:

```
VALYU_API_KEY=your_valyu_key      # platform.valyu.ai
OPENAI_API_KEY=your_openai_key
```

Run:

```bash
pnpm dev
```

Open http://localhost:3000, search a topic, tick some papers, and chat.

## Structure

- `app/api/search/route.ts` - literature search (PubMed + Wiley HLS, 100 results)
- `app/api/fullpaper/route.ts` - full-text fetch for open-access papers
- `app/api/chat/route.ts` - streaming chat: pinned papers + Valyu as a tool call
- `app/page.tsx` - the whole UI

Model is `gpt-4o-mini` - swap it in `app/api/chat/route.ts`.
