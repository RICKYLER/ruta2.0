"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send, Loader2, Bot, User, ArrowRight,
  Clock, Wallet, Bus, Zap, Plus, X, GitFork,
  AlertCircle,
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
  kind: "ok" | "error";
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

const FETCH_FAILED: DemoResponse = {
  kind: "error",
  analyzingSteps: [
    "Analyzing your prompt...",
    "Searching route database...",
    "No results found.",
  ],
  chunks: [{ id: "err", text: "fetch failed" }],
};

const DEMO_RESPONSES: Record<string, DemoResponse> = {
  "it park to colon": {
    kind: "ok",
    analyzingSteps: [
      "Naka-detect: IT Park, Lahug",
      "Naka-detect: Colon Street, Downtown",
      "Nangita ug jeepney codes...",
      "Nakit-an: 17B, 17C",
      "Nag-compute ug fare estimate...",
      "Mao na!",
    ],
    chunks: [
      { id: "intro", text: "Kung gikan ka sa Cebu IT Park padulong Colon Street, mao ni ang pinakasayon:" },
      { id: "direct", isSection: true, emoji: "🚍", heading: "Direct nga sakyan", items: ["17B", "17C"], itemStyle: "code" },
      { id: "how", isSection: true, emoji: "👉", heading: "Unsaon", items: [
        "Sakay ka sulod or gawas IT Park (terminal or main road)",
        'Ingna lang ang driver: "Colon"',
        "Naog ka duol USC Main / Metro Colon / Colon mismo",
      ]},
      { id: "estimate", isSection: true, emoji: "⏱️", heading: "Estimate", items: ["Time: ~25–40 mins (depende sa traffic)", "Fare: ~₱13–₱20"] },
      { id: "alt", isSection: true, emoji: "🔄", heading: "Alternative Route", items: [
        "Kung walay 17B/17C, sakay pa-Ayala (04L o 17D)",
        "From Ayala, daghan na jeep pa-Colon (12L, 14D, 17B, 17C)",
      ]},
      { id: "tip", isSection: true, emoji: "💡", heading: "Tip", items: ["Pangutana kanunay sa driver kung malahutay ba sa Colon para sigurado."] },
    ],
    routeCard: {
      from: "IT Park", to: "Colon Street",
      codes: ["17B", "17C"], time: "25–40 min", fare: "₱13–₱20",
      stops: ["IT Park", "Gorordo", "Capitol", "Fuente", "Colon"],
    },
  },
};

function matchResponse(query: string): DemoResponse {
  const q = query.toLowerCase();
  if (q.includes("it park") && q.includes("colon")) return DEMO_RESPONSES["it park to colon"];
  return FETCH_FAILED;
}

type Phase = "idle" | "analyzing" | "streaming" | "done";

interface Message {
  role: "user" | "bot";
  content: React.ReactNode;
  isError?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function DemoSection({ standalone = false }: { standalone?: boolean }) {
  const [input, setInput]             = useState("");
  const [phase, setPhase]             = useState<Phase>("idle");
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [visibleChunks, setVisibleChunks] = useState(0);
  const [activeResponse, setActiveResponse] = useState<DemoResponse | null>(null);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [showAttach, setShowAttach]   = useState(false);

  const timerRef             = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesContainerRef  = useRef<HTMLDivElement>(null);
  const attachRef             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) setShowAttach(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, visibleChunks, analyzeStep]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const triggerSubmit = (query: string) => {
    if (!query.trim() || phase === "analyzing" || phase === "streaming") return;

    const match = matchResponse(query);
    setActiveResponse(match);
    setVisibleChunks(0);
    setPhase("analyzing");
    setAnalyzeStep(0);
    setMessages(prev => [...prev, { role: "user", content: query }]);
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
      setMessages(prev => [...prev, {
        role: "bot",
        isError: match.kind === "error",
        content: match.kind === "error"
          ? <FetchFailed />
          : <BotResponseContent chunks={chunks} routeCard={match.routeCard} />,
      }]);
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

  const isProcessing = phase === "analyzing" || phase === "streaming";

  return (
    <section id="demo" className={standalone ? "h-full w-full" : "py-16 sm:py-20 px-4 sm:px-6 bg-secondary/25"}>
      <div className={standalone ? "h-full flex flex-col" : "max-w-2xl mx-auto"}>

        {/* Section label - hidden in standalone mode */}
        {!standalone && (
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
        )}

        {/* ── Dark Chat Panel ─────────────────────────────────────────────── */}
        <div
          className={standalone ? "rounded-none sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl w-full h-full" : "rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl"}
          style={{ height: standalone ? "100%" : 580, background: "#0d1424", border: standalone ? "none" : "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-center gap-3.5 px-5 py-5 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(to bottom, rgba(255,255,255,0.03), transparent)" }}
          >
            <div className="relative">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(20,184,166,0.3)]"
                style={{ background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.2)" }}
              >
                <Bot className="w-5.5 h-5.5" style={{ color: "#14b8a6" }} />
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0d1424]" />
            </div>
            
            <div className="text-left">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-black text-white tracking-[0.1em] uppercase">RUTA BOT</p>
              </div>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Dedicated commuter assistant</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">

            {/* Welcome */}
            <DarkBotBubble>
              <p className="text-sm leading-relaxed text-white/90">
                Hi! Tell me where you are starting and where you need to go, and I will guide you step by step.
              </p>
            </DarkBotBubble>

            {/* History */}
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <DarkUserBubble key={i}>{msg.content as string}</DarkUserBubble>
              ) : (
                <DarkBotBubble key={i} isError={msg.isError}>{msg.content}</DarkBotBubble>
              )
            )}

            {/* Live analyzing */}
            {phase === "analyzing" && activeResponse && (
              <DarkBotBubble>
                <div className="space-y-1.5">
                  {activeResponse.analyzingSteps.slice(0, analyzeStep + 1).map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {i === analyzeStep
                        ? <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" style={{ color: "#14b8a6" }} />
                        : <Zap className="w-3 h-3 flex-shrink-0" style={{ color: "#14b8a6" }} />
                      }
                      <span className="text-[11px] sm:text-xs font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>{s}</span>
                    </div>
                  ))}
                </div>
              </DarkBotBubble>
            )}

            {/* Live streaming */}
            {phase === "streaming" && activeResponse && visibleChunks > 0 && (
              <DarkBotBubble>
                <LiveChunks chunks={activeResponse.chunks} visible={visibleChunks} streaming />
              </DarkBotBubble>
            )}


          </div>

          {/* Input area */}
          <div className="px-4 pb-4 pt-3 flex-shrink-0 relative" ref={attachRef}>

            {/* + Attach popup */}
            {showAttach && (
              <div className="absolute bottom-full left-4 right-4 mb-2 z-50">
                <div
                  className="rounded-2xl shadow-2xl overflow-hidden p-2"
                  style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-center justify-between px-2 py-1.5 mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Quick filters</p>
                    <button onClick={() => setShowAttach(false)} style={{ color: "rgba(255,255,255,0.3)" }} className="hover:opacity-70 transition-opacity">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: <Wallet className="w-5 h-5" style={{ color: "#4ade80" }} />, label: "Clear fares", sub: "Budget before you ride", query: "How much is the fare from IT Park to Colon?" },
                      { icon: <Clock className="w-5 h-5" style={{ color: "#4ade80" }} />, label: "Travel time", sub: "Spot slower fallback routes", query: "How long does it take from IT Park to Colon?" },
                      { icon: <GitFork className="w-5 h-5" style={{ color: "#4ade80" }} />, label: "Transfer count", sub: "Avoid confusing handoffs", query: "How many transfers from IT Park to Colon?" },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => {
                          setInput(opt.query);
                          setShowAttach(false);
                        }}
                        className="flex flex-col items-start gap-2 p-3 rounded-xl transition-all text-left"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)" }}
                        >
                          {opt.icon}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white leading-tight">{opt.label}</p>
                          <p className="text-[10px] leading-tight mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{opt.sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Input row */}
            <div
              className="flex items-center gap-2 rounded-2xl px-4 py-3 transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {/* + button */}
              <button
                id="demo-attach-btn"
                onClick={() => setShowAttach(v => !v)}
                aria-label="Quick filters"
                suppressHydrationWarning
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: showAttach ? "#14b8a6" : "rgba(255,255,255,0.07)",
                  color: showAttach ? "#fff" : "rgba(255,255,255,0.4)",
                }}
              >
                <Plus className="w-4 h-4" />
              </button>

              <input
                id="demo-chat-input"
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="Try: How do I get from IT Park to Colon?"
                suppressHydrationWarning
                className="flex-1 bg-transparent text-sm outline-none min-w-0"
                style={{ color: "rgba(255,255,255,0.85)", caretColor: "#14b8a6" }}
                autoComplete="off"
              />

              <button
                id="demo-send-btn"
                onClick={handleSubmit}
                disabled={isProcessing || !input.trim()}
                aria-label="Send"
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30"
                style={{ background: "#14b8a6" }}
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

// ─── Dark Bubble components ─────────────────────────────────────────────────────

function DarkBotBubble({ children, isError }: { children: React.ReactNode; isError?: boolean }) {
  return (
    <div className="flex gap-3 items-start">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.2)" }}
      >
        <Bot className="w-4 h-4" style={{ color: "#14b8a6" }} />
      </div>
      <div
        className="rounded-2xl rounded-tl-sm px-4 py-3 max-w-sm"
        style={{
          background: isError ? "rgba(239,68,68,0.08)" : "rgba(20,184,166,0.1)",
          border: isError ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(20,184,166,0.15)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function DarkUserBubble({ children }: { children: string }) {
  return (
    <div className="flex gap-3 items-start justify-end">
      <div
        className="rounded-2xl rounded-tr-sm px-4 py-3 max-w-xs text-sm font-medium break-words leading-relaxed"
        style={{ background: "#14b8a6", color: "#fff" }}
      >
        {children}
      </div>
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <User className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
      </div>
    </div>
  );
}

function FetchFailed() {
  return (
    <div className="flex items-center gap-2">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#ef4444" }} />
      <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>fetch failed</span>
    </div>
  );
}

// ─── Shared Chunk Renderer ──────────────────────────────────────────────────────

function LiveChunks({ chunks, visible, streaming }: { chunks: Chunk[]; visible: number; streaming?: boolean }) {
  return (
    <div className="space-y-3 sm:space-y-4">
      {chunks.slice(0, visible).map((chunk, idx) => {
        const isLast = idx === visible - 1;

        if (!chunk.isSection) {
          return (
            <p key={chunk.id} className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
              {chunk.text}
              {isLast && streaming && <span className="ml-0.5 inline-block w-0.5 h-3.5 align-middle animate-pulse" style={{ background: "#14b8a6" }} />}
            </p>
          );
        }

        return (
          <div key={chunk.id} className="space-y-1.5">
            <p className="text-xs font-bold flex items-center gap-1.5 text-white">
              <span>{chunk.emoji}</span><span>{chunk.heading}</span>
              {isLast && streaming && <span className="inline-block w-0.5 h-3.5 align-middle animate-pulse" style={{ background: "#14b8a6" }} />}
            </p>
            <ul className="space-y-1 pl-1">
              {chunk.items!.map((item, j) =>
                chunk.itemStyle === "code" ? (
                  <li key={j} className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-xs font-bold tracking-wider"
                      style={{ background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.3)", color: "#14b8a6" }}
                    >
                      {item}
                    </span>
                  </li>
                ) : (
                  <li key={j} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "rgba(20,184,166,0.5)" }} />
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

function BotResponseContent({ chunks, routeCard }: { chunks: Chunk[]; routeCard?: DemoResponse["routeCard"] }) {
  return (
    <div className="space-y-4">
      <LiveChunks chunks={chunks} visible={chunks.length} />
      {routeCard && (
        <div
          className="rounded-2xl p-4 space-y-4 mt-3"
          style={{ background: "rgba(20,184,166,0.06)", border: "1px solid rgba(20,184,166,0.15)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(20,184,166,0.12)" }}>
              <Bus className="w-4 h-4" style={{ color: "#14b8a6" }} />
            </div>
            <div className="flex-1 min-w-0 text-xs font-semibold text-white flex items-center gap-1.5 flex-wrap">
              <span>{routeCard.from}</span>
              <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: "#14b8a6" }} />
              <span>{routeCard.to}</span>
            </div>
          </div>
          {/* Codes */}
          <div className="flex gap-2">
            {routeCard.codes.map(code => (
              <span key={code} className="px-3 py-1 rounded-lg text-sm font-bold tracking-widest" style={{ background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.25)", color: "#14b8a6" }}>{code}</span>
            ))}
          </div>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-1 mb-0.5">
                <Clock className="w-3 h-3" style={{ color: "rgba(255,255,255,0.3)" }} />
                <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>Time</p>
              </div>
              <p className="text-sm font-bold text-white">{routeCard.time}</p>
            </div>
            <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-1 mb-0.5">
                <Wallet className="w-3 h-3" style={{ color: "rgba(255,255,255,0.3)" }} />
                <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>Fare</p>
              </div>
              <p className="text-sm font-bold" style={{ color: "#14b8a6" }}>{routeCard.fare}</p>
            </div>
          </div>
          {/* Stops */}
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Stops</p>
            <div className="flex items-start">
              {routeCard.stops.map((stop, i) => (
                <div key={i} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full" style={{ background: (i === 0 || i === routeCard.stops.length - 1) ? "#14b8a6" : "rgba(255,255,255,0.2)" }} />
                    <span className="text-[9px] mt-0.5 max-w-[44px] text-center leading-tight" style={{ color: "rgba(255,255,255,0.4)" }}>{stop}</span>
                  </div>
                  {i < routeCard.stops.length - 1 && <div className="w-6 h-px mb-3 mx-0.5" style={{ background: "rgba(255,255,255,0.1)" }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
