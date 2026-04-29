"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";

const EXAMPLE_PROMPT = "Unsay Sakyan IT Park to Colon?";

// ─── Response Types ────────────────────────────────────────────────────────────

interface Chunk {
  id: string;
  text?: string;
  isSection?: boolean;
  emoji?: string;
  heading?: string;
  items?: string[];
  itemStyle?: "code" | "bullet";
}

interface DemoResponse {
  analyzingSteps: string[];
  chunks: Chunk[];
}

// ─── Default (unknown) Response ────────────────────────────────────────────────

const DEFAULT_RESPONSE: DemoResponse = {
  analyzingSteps: [
    "Analyzing your prompt...",
    "Searching route database...",
    "Computing fare...",
    "Ready!",
  ],
  chunks: [
    {
      id: "intro",
      text: "Pasensya, wala pa ko kaila sa maong rota. Pero pwede nimo i-try ang 'IT Park to Colon' para makita nimo kung unsaon nako pag-tabang nimo! 👋",
    },
  ],
};

// ─── Known Routes ──────────────────────────────────────────────────────────────

const DEMO_RESPONSES: Record<string, DemoResponse> = {
  "it park to colon": {
    analyzingSteps: [
      "Naka-detect: IT Park, Lahug",
      "Naka-detect: Colon Street, Downtown",
      "Nangita ug jeepney codes...",
      "Nakit-an: 17B, 17C",
      "Nag-compute ug fare estimate...",
      "Mao na!",
    ],
    chunks: [
      {
        id: "intro",
        text: "Kung gikan ka sa Cebu IT Park padulong Colon Street, mao ni ang pinakasayon:",
      },
      {
        id: "direct",
        isSection: true,
        emoji: "🚍",
        heading: "Direct nga sakyan",
        items: ["17B", "17C"],
        itemStyle: "code",
      },
      {
        id: "how",
        isSection: true,
        emoji: "👉",
        heading: "Unsaon",
        items: [
          "Sakay ka sulod or gawas IT Park (terminal or main road)",
          'Ingna lang ang driver: "Colon"',
          "Naog ka duol USC Main / Metro Colon / Colon mismo",
        ],
      },
      {
        id: "landmarks",
        isSection: true,
        emoji: "📍",
        heading: "Mga Landmark",
        items: [
          "USC Main Campus",
          "Metro Colon Shopping Center",
          "Colonnade Mall",
          "Colon Street (oldest street in PH)",
        ],
      },
      {
        id: "estimate",
        isSection: true,
        emoji: "⏱️",
        heading: "Estimate",
        items: ["Time: ~25–40 mins (depende sa traffic)", "Fare: ~₱13–₱20"],
      },
      {
        id: "alt",
        isSection: true,
        emoji: "🔄",
        heading: "Alternative Route",
        items: [
          "Kung walay 17B/17C, sakay pa-Ayala (04L o 17D)",
          "From Ayala, daghan na jeep pa-Colon (12L, 14D, 17B, 17C)",
        ],
      },
      {
        id: "tip",
        isSection: true,
        emoji: "💡",
        heading: "Tip",
        items: [
          "Pangutana kanunay sa driver kung malahutay ba sa Colon para sigurado.",
        ],
      },
    ],
  },
};

// ─── Helper ────────────────────────────────────────────────────────────────────

function matchResponse(query: string): DemoResponse {
  const q = query.toLowerCase();
  if (q.includes("it park") && q.includes("colon")) {
    return DEMO_RESPONSES["it park to colon"];
  }
  return DEFAULT_RESPONSE;
}

// ─── Phase type ────────────────────────────────────────────────────────────────

type Phase = "idle" | "typing" | "analyzing" | "streaming" | "done";

// ─── Component ─────────────────────────────────────────────────────────────────

export function DemoSection() {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [visibleChunks, setVisibleChunks] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [activeResponse, setActiveResponse] = useState<DemoResponse>(
    DEMO_RESPONSES["it park to colon"]
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-type the example prompt on mount
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let charIdx = 0;
    setPhase("typing");

    const typeNext = () => {
      charIdx++;
      setInput(EXAMPLE_PROMPT.slice(0, charIdx));
      if (charIdx < EXAMPLE_PROMPT.length) {
        timeout = setTimeout(typeNext, 55);
      } else {
        setPhase("idle");
        timeout = setTimeout(() => triggerSubmit(EXAMPLE_PROMPT), 700);
      }
    };
    timeout = setTimeout(typeNext, 1000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerSubmit = (query: string) => {
    if (!query.trim()) return;

    const match = matchResponse(query);
    setActiveResponse(match);
    setSubmitted(false);
    setVisibleChunks(0);
    setPhase("analyzing");
    setAnalyzeStep(0);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setAnalyzeStep(step);
      if (step >= match.analyzingSteps.length - 1) {
        clearInterval(interval);
        setTimeout(() => {
          setPhase("streaming");
          streamChunks(0, match.chunks);
        }, 400);
      }
    }, 500);
  };

  const streamChunks = (idx: number, chunks: Chunk[]) => {
    if (idx >= chunks.length) {
      setPhase("done");
      setSubmitted(true);
      return;
    }
    setVisibleChunks(idx + 1);
    timerRef.current = setTimeout(() => streamChunks(idx + 1, chunks), 700);
  };

  const handleSubmit = () => {
    if (!input.trim() || phase === "analyzing" || phase === "streaming") return;
    triggerSubmit(input);
  };

  const showResponse = phase === "streaming" || phase === "done";

  return (
    <section id="demo" className="py-16 sm:py-20 px-4 sm:px-6 bg-secondary/25">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-widest mb-2 sm:mb-3">
            See it in action
          </p>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-balance text-foreground mb-3 sm:mb-4">
            Tanawa kung unsaon
          </h2>
          <p className="text-muted-foreground text-sm sm:text-lg text-balance max-w-lg mx-auto leading-relaxed">
            Ask in Bisaya or English. RUTA mo-suggest dayon — jeepney codes,
            unsaon sakay, ug fare estimate.
          </p>
        </div>

        {/* Chat window */}
        <div className="bg-card rounded-2xl sm:rounded-3xl border border-border shadow-xl overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-secondary/50">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                RUTA AI
              </p>
              <p className="text-xs text-muted-foreground">
                Cebu Jeepney Guide
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Online
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 bg-background/50 min-h-48">
            {/* Welcome bubble */}
            <BotBubble>
              <p className="text-xs sm:text-sm leading-relaxed text-foreground/90">
                Kumusta! Ask me bisan asa ka paingon sa Cebu — jeepney codes,
                unsaon sakay, ug fare estimate. 👋
              </p>
            </BotBubble>

            {/* User message */}
            {(phase !== "idle" || submitted) && input && (
              <div className="flex gap-2 sm:gap-3 justify-end">
                <div
                  className="rounded-xl rounded-tr-sm px-3 sm:px-4 py-2.5 text-xs sm:text-sm max-w-xs text-primary-foreground font-medium break-words leading-relaxed"
                  style={{ background: "var(--primary)" }}
                >
                  {input}
                </div>
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>
            )}

            {/* Analyzing steps */}
            {phase === "analyzing" && (
              <BotBubble>
                <div className="space-y-1.5">
                  {activeResponse.analyzingSteps
                    .slice(0, analyzeStep + 1)
                    .map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {i === analyzeStep ? (
                          <Loader2 className="w-3 h-3 text-primary animate-spin flex-shrink-0" />
                        ) : (
                          <span className="w-3 h-3 text-accent text-[10px] flex-shrink-0">
                            ✓
                          </span>
                        )}
                        <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                          {s}
                        </span>
                      </div>
                    ))}
                </div>
              </BotBubble>
            )}

            {/* Streamed response */}
            {showResponse && visibleChunks > 0 && (
              <BotBubble>
                <div className="space-y-3 sm:space-y-4">
                  {activeResponse.chunks.slice(0, visibleChunks).map((chunk, idx) => {
                    const isLast = idx === visibleChunks - 1;
                    const stillStreaming = phase === "streaming";

                    if (!chunk.isSection) {
                      return (
                        <p
                          key={chunk.id}
                          className="text-xs sm:text-sm leading-relaxed text-foreground/90"
                        >
                          {chunk.text}
                          {isLast && stillStreaming && (
                            <span className="ml-0.5 inline-block w-0.5 h-3.5 bg-primary animate-pulse align-middle" />
                          )}
                        </p>
                      );
                    }

                    return (
                      <div key={chunk.id} className="space-y-1.5">
                        <p className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <span>{chunk.emoji}</span>
                          <span>{chunk.heading}</span>
                          {isLast && stillStreaming && (
                            <span className="inline-block w-0.5 h-3.5 bg-primary animate-pulse align-middle" />
                          )}
                        </p>
                        <ul className="space-y-1 pl-1">
                          {chunk.items!.map((item: string, j: number) =>
                            chunk.itemStyle === "code" ? (
                              <li key={j} className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md bg-primary/15 border border-primary/25 text-primary text-xs font-bold tracking-wider">
                                  {item}
                                </span>
                              </li>
                            ) : (
                              <li
                                key={j}
                                className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground leading-relaxed"
                              >
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                                {item}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </BotBubble>
            )}
          </div>

          {/* Input */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 border-t border-border bg-background/50">
            <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 sm:px-4 py-2.5 border border-border/50">
              <input
                id="demo-chat-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="e.g. Unsay sakyan IT Park to Colon?"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
              />
              <button
                id="demo-send-btn"
                onClick={handleSubmit}
                disabled={
                  phase === "analyzing" ||
                  phase === "streaming" ||
                  !input.trim()
                }
                aria-label="Send"
                className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-primary-foreground" />
              </button>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground text-center mt-2 sm:mt-3">
              Try:{" "}
              <button
                id="demo-example-btn"
                className="text-primary font-medium underline underline-offset-2 hover:text-primary/80 transition-colors"
                onClick={() => setInput(EXAMPLE_PROMPT)}
              >
                {EXAMPLE_PROMPT}
              </button>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function BotBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 sm:gap-3">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="bg-secondary rounded-xl rounded-tl-sm px-3 sm:px-4 py-2.5 sm:py-3 max-w-sm w-full">
        {children}
      </div>
    </div>
  );
}
