"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send, Loader2, Bot, User, ArrowRight,
  Clock, Wallet, Bus, Zap, Plus, X,
  GitFork,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

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
  routeCard?: {
    from: string;
    to: string;
    codes: string[];
    time: string;
    fare: string;
    stops: string[];
  };
}

// ─── Responses ─────────────────────────────────────────────────────────────────

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
    routeCard: {
      from: "IT Park",
      to: "Colon Street",
      codes: ["17B", "17C"],
      time: "25–40 min",
      fare: "₱13–₱20",
      stops: ["IT Park", "Gorordo", "Capitol", "Fuente", "Colon"],
    },
  },
};

function matchResponse(query: string): DemoResponse {
  const q = query.toLowerCase();
  if (q.includes("it park") && q.includes("colon")) {
    return DEMO_RESPONSES["it park to colon"];
  }
  return DEFAULT_RESPONSE;
}

type Phase = "idle" | "analyzing" | "streaming" | "done";

interface Message {
  role: "user" | "bot";
  content: React.ReactNode;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function DemoSection() {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [visibleChunks, setVisibleChunks] = useState(0);
  const [activeResponse, setActiveResponse] = useState<DemoResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userHasTyped, setUserHasTyped] = useState(false);
  const [showAttach, setShowAttach] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);

  // Close attach menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) {
        setShowAttach(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, visibleChunks, analyzeStep]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!userHasTyped) setUserHasTyped(true);
    if (e.target.value === "") setUserHasTyped(false);
  };

  const triggerSubmit = (query: string) => {
    if (!query.trim() || phase === "analyzing" || phase === "streaming") return;

    const match = matchResponse(query);
    setActiveResponse(match);
    setVisibleChunks(0);
    setPhase("analyzing");
    setAnalyzeStep(0);
    setUserHasTyped(false);

    // Add user message
    setMessages((prev) => [
      ...prev,
      { role: "user", content: query },
    ]);
    setInput("");

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setAnalyzeStep(step);
      if (step >= match.analyzingSteps.length - 1) {
        clearInterval(interval);
        setTimeout(() => {
          setPhase("streaming");
          streamChunks(0, match.chunks, match);
        }, 400);
      }
    }, 500);
  };

  const streamChunks = (idx: number, chunks: Chunk[], match: DemoResponse) => {
    if (idx >= chunks.length) {
      setPhase("done");
      // Add final bot message to history
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: <BotResponseContent chunks={chunks} routeCard={match.routeCard} />,
        },
      ]);
      setActiveResponse(null);
      setVisibleChunks(0);
      return;
    }
    setVisibleChunks(idx + 1);
    timerRef.current = setTimeout(() => streamChunks(idx + 1, chunks, match), 700);
  };

  const handleSubmit = () => {
    if (!input.trim() || phase === "analyzing" || phase === "streaming") return;
    triggerSubmit(input);
  };

  const handleChipClick = (text: string) => {
    setInput(text);
    setUserHasTyped(true);
  };

  const isProcessing = phase === "analyzing" || phase === "streaming";
  const showChips = !userHasTyped && input === "" && phase === "idle";

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

        {/* ── Chat Panel ──────────────────────────────────────────────────── */}
        <div className="bg-card rounded-2xl sm:rounded-3xl border border-border shadow-xl overflow-hidden flex flex-col" style={{ height: 560 }}>

          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-secondary/50 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-foreground">RUTA AI</p>
              <p className="text-xs text-muted-foreground">Cebu Jeepney Guide</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-muted-foreground hidden sm:inline">Online</span>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 bg-background/50">

            {/* Welcome */}
            <BotBubble>
              <p className="text-xs sm:text-sm leading-relaxed text-foreground/90">
                Kumusta! Ask me bisan asa ka paingon sa Cebu — jeepney codes,
                unsaon sakay, ug fare estimate. 👋
              </p>
            </BotBubble>

            {/* History messages */}
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <UserBubble key={i}>{msg.content as string}</UserBubble>
              ) : (
                <BotBubble key={i}>{msg.content}</BotBubble>
              )
            )}

            {/* Live: user message just sent (before it goes to history) */}
            {isProcessing && (
              <>
                {/* analyzing bubble */}
                {phase === "analyzing" && activeResponse && (
                  <BotBubble>
                    <div className="space-y-1.5">
                      {activeResponse.analyzingSteps
                        .slice(0, analyzeStep + 1)
                        .map((s, i) => (
                          <div key={i} className="flex items-center gap-2">
                            {i === analyzeStep ? (
                              <Loader2 className="w-3 h-3 text-primary animate-spin flex-shrink-0" />
                            ) : (
                              <Zap className="w-3 h-3 text-accent flex-shrink-0" />
                            )}
                            <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                              {s}
                            </span>
                          </div>
                        ))}
                    </div>
                  </BotBubble>
                )}

                {/* streaming bubble */}
                {phase === "streaming" && activeResponse && visibleChunks > 0 && (
                  <BotBubble>
                    <LiveChunks
                      chunks={activeResponse.chunks}
                      visible={visibleChunks}
                      streaming
                    />
                  </BotBubble>
                )}
              </>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Suggestion chips — hide when user types ─────────────────── */}
          {showChips && (
            <div className="px-4 sm:px-5 pt-3 pb-1 flex gap-2 flex-wrap flex-shrink-0 bg-background/50 border-t border-border/30">
              {[
                "How do I get from IT Park to Colon?",
                "Unsay sakyan IT Park to Colon?",
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChipClick(chip)}
                  className="px-3 py-1.5 rounded-full bg-secondary border border-border text-xs text-muted-foreground font-medium hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 border-t border-border bg-background/50 flex-shrink-0 relative" ref={attachRef}>

            {/* ── + Attach Menu ────────────────────────────────────────── */}
            {showAttach && (
              <div className="absolute bottom-full left-3 right-3 mb-2 z-50">
                <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-2">
                  <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Quick filters</p>
                    <button onClick={() => setShowAttach(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        icon: <Wallet className="w-5 h-5 text-emerald-400" />,
                        label: "Clear fares",
                        sub: "Budget before you ride",
                        tag: " — show me the fare",
                      },
                      {
                        icon: <Clock className="w-5 h-5 text-emerald-400" />,
                        label: "Travel time",
                        sub: "Spot slower fallback routes",
                        tag: " — include travel time",
                      },
                      {
                        icon: <GitFork className="w-5 h-5 text-emerald-400" />,
                        label: "Transfer count",
                        sub: "Avoid confusing handoffs",
                        tag: " — how many transfers?",
                      },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => {
                          setInput((prev) => (prev.trim() ? prev.trim() + opt.tag : opt.label));
                          setUserHasTyped(true);
                          setShowAttach(false);
                        }}
                        className="flex flex-col items-start gap-2 p-3 rounded-xl bg-secondary hover:bg-primary/10 hover:border-primary/20 border border-transparent transition-all text-left group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          {opt.icon}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground leading-tight">{opt.label}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{opt.sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 sm:px-4 py-2.5 border border-border/50 focus-within:border-primary/40 transition-colors">
              {/* + button */}
              <button
                id="demo-attach-btn"
                onClick={() => setShowAttach((v) => !v)}
                aria-label="Quick filters"
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  showAttach
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-primary/15 hover:text-primary"
                }`}
              >
                <Plus className="w-4 h-4" />
              </button>
              <input
                id="demo-chat-input"
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Ask about a jeepney route..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
                autoComplete="off"
              />
              <button
                id="demo-send-btn"
                onClick={handleSubmit}
                disabled={isProcessing || !input.trim()}
                aria-label="Send"
                className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-primary-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

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

function UserBubble({ children }: { children: string }) {
  return (
    <div className="flex gap-2 sm:gap-3 justify-end">
      <div
        className="rounded-xl rounded-tr-sm px-3 sm:px-4 py-2.5 text-xs sm:text-sm max-w-xs text-primary-foreground font-medium break-words leading-relaxed"
        style={{ background: "var(--primary)" }}
      >
        {children}
      </div>
      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
        <User className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}

function LiveChunks({
  chunks,
  visible,
  streaming,
}: {
  chunks: Chunk[];
  visible: number;
  streaming?: boolean;
}) {
  return (
    <div className="space-y-3 sm:space-y-4">
      {chunks.slice(0, visible).map((chunk, idx) => {
        const isLast = idx === visible - 1;

        if (!chunk.isSection) {
          return (
            <p key={chunk.id} className="text-xs sm:text-sm leading-relaxed text-foreground/90">
              {chunk.text}
              {isLast && streaming && (
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
              {isLast && streaming && (
                <span className="inline-block w-0.5 h-3.5 bg-primary animate-pulse align-middle" />
              )}
            </p>
            <ul className="space-y-1 pl-1">
              {chunk.items!.map((item, j) =>
                chunk.itemStyle === "code" ? (
                  <li key={j} className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md bg-primary/15 border border-primary/25 text-primary text-xs font-bold tracking-wider">
                      {item}
                    </span>
                  </li>
                ) : (
                  <li key={j} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
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
  );
}

function BotResponseContent({
  chunks,
  routeCard,
}: {
  chunks: Chunk[];
  routeCard?: DemoResponse["routeCard"];
}) {
  return (
    <div className="space-y-4">
      <LiveChunks chunks={chunks} visible={chunks.length} />

      {routeCard && (
        <div className="mt-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 space-y-4">
          {/* Route header */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bus className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0 text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
              <span>{routeCard.from}</span>
              <ArrowRight className="w-3 h-3 text-primary flex-shrink-0" />
              <span>{routeCard.to}</span>
            </div>
          </div>

          {/* Codes */}
          <div className="flex gap-2">
            {routeCard.codes.map((code) => (
              <span key={code} className="px-3 py-1 rounded-lg bg-primary/15 border border-primary/25 text-primary text-sm font-bold tracking-widest">
                {code}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-secondary px-3 py-2.5">
              <div className="flex items-center gap-1 mb-0.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide">Time</p>
              </div>
              <p className="text-sm font-bold text-foreground">{routeCard.time}</p>
            </div>
            <div className="rounded-xl bg-secondary px-3 py-2.5">
              <div className="flex items-center gap-1 mb-0.5">
                <Wallet className="w-3 h-3 text-muted-foreground" />
                <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide">Fare</p>
              </div>
              <p className="text-sm font-bold text-accent">{routeCard.fare}</p>
            </div>
          </div>

          {/* Stops */}
          <div>
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Stops</p>
            <div className="flex items-start gap-0">
              {routeCard.stops.map((stop, i) => (
                <div key={i} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full ${i === 0 || i === routeCard.stops.length - 1 ? "bg-primary" : "bg-muted-foreground/40"}`} />
                    <span className="text-[9px] text-muted-foreground mt-0.5 max-w-[44px] text-center leading-tight">{stop}</span>
                  </div>
                  {i < routeCard.stops.length - 1 && <div className="w-6 h-px bg-border mb-3 mx-0.5" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
