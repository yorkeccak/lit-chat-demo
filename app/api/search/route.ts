import { valyu } from "@/lib/valyu";

// Quick literature search - returns papers the user can select to chat over
export async function POST(req: Request) {
  const { query } = await req.json();

  const response = await valyu.search(query, {
    maxNumResults: 100,
    // Open-access PubMed + paywalled journal content (Wiley HLS, if your account has access)
    includedSources: ["valyu/valyu-pubmed", "wiley/wiley-hls"],
    includeAbstracts: true, // search the full PubMed abstract corpus
  });

  const papers = (response.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    doi: r.doi,
    source: r.source,
    abstract: r.abstract,
    // `content` = the most relevant full-text passages for this query
    content: typeof r.content === "string" ? r.content : JSON.stringify(r.content),
  }));

  return Response.json({ papers });
}
