import { valyu } from "@/lib/valyu";

// Fetch the full text of an open-access paper via the Contents API
export async function POST(req: Request) {
  const { url } = await req.json();

  const response = await valyu.contents([url], { responseLength: "max" });
  const result = "results" in response ? response.results?.[0] : undefined;
  const content =
    result && "content" in result && typeof result.content === "string"
      ? result.content
      : null;

  // A tiny result means no accessible full text (stub page) - report failure
  // so the client falls back to the search passages instead.
  return Response.json({
    fullContent: content && content.length > 1000 ? content : null,
  });
}
