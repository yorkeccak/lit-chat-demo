import {
  streamText,
  tool,
  isStepCount,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { valyu, type Paper } from "@/lib/valyu";

// Anthropic (Sonnet 5) when a key is provided, otherwise OpenAI
const model = process.env.ANTHROPIC_API_KEY
  ? anthropic("claude-sonnet-5")
  : openai("gpt-5.6-luna");

export async function POST(req: Request) {
  const { messages, papers }: { messages: UIMessage[]; papers: Paper[] } =
    await req.json();

  // 1. The user's selected papers are PINNED into context. Per-paper rules:
  //    - Wiley HLS: abstract + relevant passages from search (never fetched -
  //      full-text scraping is against licence terms)
  //    - Open access with fetched full text: the full paper (capped)
  //    - Closed access (content === abstract): abstract only
  const pinnedPapers = papers
    .map((p, i) => {
      const isWiley = p.source === "wiley/wiley-hls";
      let body = p.abstract ? `Abstract: ${p.abstract}\n` : "";
      if (p.fullContent && !isWiley) {
        body += `Full text: ${p.fullContent.slice(0, 15000)}\n`;
      } else if (p.content && p.content.trim() !== (p.abstract ?? "").trim()) {
        body += `Relevant passages: ${p.content.slice(0, 4000)}\n`;
      }
      return (
        `<paper index="${i + 1}" title="${p.title}" url="${p.url}">\n` +
        body +
        `</paper>`
      );
    })
    .join("\n\n");

  const result = streamText({
    model,
    system:
      `You are a medical literature assistant. The user has selected the ` +
      `following papers. Answer questions using ONLY these papers unless the ` +
      `user asks you to look for new evidence - then use the searchLiterature ` +
      `tool. Always cite paper titles when making claims.\n\n${pinnedPapers}`,
    messages: await convertToModelMessages(messages),
    tools: {
      // 2. Valyu as a tool call - the model can pull NEW evidence
      //    mid-conversation when a question outgrows the selection.
      searchLiterature: tool({
        description:
          "Search PubMed literature for new papers not in the current selection.",
        inputSchema: z.object({
          query: z.string().describe("Natural language search query"),
        }),
        execute: async ({ query }) => {
          const response = await valyu.search(query, {
            maxNumResults: 5,
            includedSources: ["valyu/valyu-pubmed", "wiley/wiley-hls"],
            includeAbstracts: true,
          });
          return (response.results ?? []).map((r) => ({
            title: r.title,
            url: r.url,
            abstract: r.abstract,
          }));
        },
      }),
    },
    stopWhen: isStepCount(5),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
