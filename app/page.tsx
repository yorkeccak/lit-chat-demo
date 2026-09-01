"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Paper = {
  title: string;
  url: string;
  doi?: string;
  source?: string;
  abstract?: string;
  content?: string;
  fullContent?: string;
};

const isWiley = (p: Paper) => p.source === "wiley/wiley-hls";
// content === abstract means we only have the abstract -> closed access
const isOpenAccess = (p: Paper) =>
  !!p.content && p.content.trim() !== (p.abstract ?? "").trim();

const favicon = (url: string) => {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;
  } catch {
    return "";
  }
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [searching, setSearching] = useState(false);
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<Paper | null>(null);

  const { messages, sendMessage, status } = useChat();

  async function runSearch() {
    setSearching(true);
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    setPapers(data.papers);
    setSelected(new Set());
    setSearching(false);
  }

  const [fetching, setFetching] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    const next = new Set(selected);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelected(next);

    // On select: open-access papers get their full text fetched
    // once via the Contents API. Paywalled journal sources are never fetched -
    // their abstract + relevant passages from search are used instead.
    const p = papers[i];
    if (next.has(i) && isOpenAccess(p) && !isWiley(p) && !p.fullContent) {
      setFetching((f) => new Set(f).add(i));
      fetch("/api/fullpaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: p.url }),
      })
        .then((r) => r.json())
        .then(({ fullContent }) => {
          if (fullContent)
            setPapers((ps) =>
              ps.map((x, j) => (j === i ? { ...x, fullContent } : x))
            );
        })
        .finally(() =>
          setFetching((f) => {
            const n = new Set(f);
            n.delete(i);
            return n;
          })
        );
    }
  }

  const openPreview = (p: Paper) => setPreview(p);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#fafaf8", color: "#1a1a1a" }}>
      {/* Left: quick search + paper selection */}
      <div style={{ width: 440, borderRight: "1px solid #e5e5e0", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 20px 12px" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 17 }}>Literature quick search</h2>
          <form onSubmit={(e) => { e.preventDefault(); runSearch(); }}>
            <input
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #d5d5d0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. flexible endoscope complications"
            />
          </form>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
          {searching && <p style={{ color: "#888" }}>Searching literature…</p>}
          {papers.map((p, i) => (
            <div
              key={i}
              style={{
                display: "flex", gap: 10, alignItems: "flex-start", padding: 10,
                marginBottom: 8, borderRadius: 8, cursor: "pointer",
                border: selected.has(i) ? "1px solid #2f6f4f" : "1px solid #e5e5e0",
                background: selected.has(i) ? "#eef5f0" : "#fff",
              }}
              onClick={() => toggle(i)}
            >
              <input type="checkbox" checked={selected.has(i)} readOnly style={{ marginTop: 3 }} />
              <img src={favicon(p.url)} alt="" width={16} height={16} style={{ marginTop: 3, borderRadius: 3 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: "#777", margin: "3px 0" }}>
                  {p.abstract?.slice(0, 140)}…
                </div>
                <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>
                  {isWiley(p)
                    ? "paywalled journal · search passages"
                    : fetching.has(i)
                      ? "fetching full text…"
                      : p.fullContent
                        ? "full text loaded"
                        : isOpenAccess(p)
                          ? "open access"
                          : "abstract only"}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); openPreview(p); }}
                  style={{ fontSize: 12, color: "#2f6f4f", background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}
                >
                  View result
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: chat scoped to the selection */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 860 }}>
        <div style={{ padding: "20px 24px 8px", fontSize: 14, color: "#666" }}>
          Chatting over <strong>{selected.size}</strong> selected paper{selected.size === 1 ? "" : "s"}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 24px" }}>
          {messages.map((m) => (
            <div
              key={m.id}
              className="msg"
              style={{
                marginBottom: 14, padding: "8px 13px", borderRadius: 10, fontSize: 14.5, lineHeight: 1.55,
                background: m.role === "user" ? "#2f6f4f" : "#fff",
                color: m.role === "user" ? "#fff" : "#1a1a1a",
                border: m.role === "user" ? "none" : "1px solid #e5e5e0",
                marginLeft: m.role === "user" ? "auto" : 0,
                maxWidth: "85%", width: "fit-content",
              }}
            >
              {m.parts.map((part, i) => {
                if (part.type === "text") return <Markdown key={i} remarkPlugins={[remarkGfm]}>{part.text}</Markdown>;
                if (part.type === "tool-searchLiterature")
                  return (
                    <div key={i} style={{ fontSize: 12.5, color: "#888", fontStyle: "italic", margin: "4px 0" }}>
                      🔎 searched Valyu for new papers
                    </div>
                  );
                return null;
              })}
            </div>
          ))}
          {status === "submitted" && <p style={{ color: "#888" }}>Thinking…</p>}
        </div>
        <form
          style={{ padding: "12px 24px 20px" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            sendMessage(
              { text: input },
              { body: { papers: [...selected].map((i) => papers[i]) } }
            );
            setInput("");
          }}
        >
          <input
            style={{ width: "100%", padding: "12px 14px", border: "1px solid #d5d5d0", borderRadius: 10, fontSize: 14.5, boxSizing: "border-box" }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the selected papers…"
          />
        </form>
      </div>

      {/* Paper detail overlay */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 680, width: "90%", maxHeight: "80vh", overflowY: "auto",
              background: "#fff", border: "1px solid #e5e5e0", borderRadius: 12, padding: 24, position: "relative",
            }}
          >
            <button
              onClick={() => setPreview(null)}
              aria-label="Close"
              style={{
                position: "absolute", top: 12, right: 12, width: 30, height: 30,
                borderRadius: 8, border: "1px solid #d5d5d0", background: "#fff",
                cursor: "pointer", fontSize: 15, lineHeight: 1,
              }}
            >
              ✕
            </button>
            <div style={{ display: "flex", gap: 8, alignItems: "center", paddingRight: 36 }}>
              <img src={favicon(preview.url)} alt="" width={18} height={18} />
              <h3 style={{ margin: 0, fontSize: 16 }}>{preview.title}</h3>
            </div>
            <p style={{ fontSize: 13 }}>
              <a href={preview.url} target="_blank" style={{ color: "#2f6f4f" }}>{preview.url}</a>
              {preview.doi && <span style={{ color: "#888" }}> · DOI {preview.doi}</span>}
            </p>
            {preview.abstract && (
              <>
                <h4 style={{ margin: "14px 0 6px", fontSize: 13.5 }}>Abstract</h4>
                <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>
                  <Markdown remarkPlugins={[remarkGfm]}>{preview.abstract}</Markdown>
                </div>
              </>
            )}
            {preview.content && (
              <>
                <h4 style={{ margin: "14px 0 6px", fontSize: 13.5 }}>Relevant passages (from search)</h4>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: "#444" }}>
                  <Markdown remarkPlugins={[remarkGfm]}>{preview.content.slice(0, 2500)}</Markdown>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
