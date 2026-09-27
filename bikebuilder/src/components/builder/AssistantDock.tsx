"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Check, ChevronDown, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { AssistantReply } from "@/lib/assistant/engine";
import { getComponent } from "@/lib/catalog";
import { formatEurDelta, formatGramDelta } from "@/lib/format";
import type { Swap } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useBuilder, type ChatMessage } from "@/store/builder";

const PROMPTS = {
  mtb: ["I mainly ride trails.", "My budget is €5,000.", "Make it lighter.", "Is everything compatible?"],
  road: ["I race crits.", "My budget is €8,000.", "More comfortable for long rides.", "Is everything compatible?"],
};

export function AssistantDock() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const build = useBuilder((s) => s.build);
  const chat = useBuilder((s) => s.chat);
  const context = useBuilder((s) => s.assistantContext);
  const { pushChat, setAssistantContext, applySwaps, markChatApplied, clearChat, undo } = useBuilder.getState();
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [chat.length, busy, open]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    pushChat({ id: crypto.randomUUID(), role: "user", text: message });
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ discipline: build.discipline, selection: build.parts, message, context }),
      });
      if (!res.ok) throw new Error(await res.text());
      const reply: AssistantReply = await res.json();
      setAssistantContext(reply.context);
      pushChat({ id: crypto.randomUUID(), role: "assistant", text: reply.text, swaps: reply.swaps, understood: reply.understood });
    } catch {
      pushChat({ id: crypto.randomUUID(), role: "assistant", text: "Sorry — I couldn't reach the assistant service. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  function apply(m: ChatMessage, swaps: Swap[]) {
    applySwaps(swaps);
    markChatApplied(m.id);
    toast(`Applied ${swaps.length} change${swaps.length > 1 ? "s" : ""}`, { action: { label: "Undo", run: undo } });
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="mb-3 flex h-[min(620px,calc(100dvh-120px))] w-[min(420px,calc(100vw-32px))] flex-col overflow-hidden rounded-xl border border-line bg-paper shadow-2xl"
            role="dialog"
            aria-label="BikeBuilder AI assistant"
          >
            <div className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
              <span className="flex size-8 items-center justify-center rounded-md bg-ink text-accent-bright"><Sparkles className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold">Build assistant</p>
                <p className="truncate text-[11.5px] text-muted">Answers are computed from catalog data — no invented specs.</p>
              </div>
              {chat.length > 0 && (
                <button onClick={clearChat} className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink" aria-label="Clear conversation" title="Clear conversation">
                  <RotateCcw className="size-4" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink" aria-label="Minimize assistant">
                <ChevronDown className="size-4" />
              </button>
            </div>

            <div ref={scroller} className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {chat.length === 0 && (
                <div className="rounded-lg border border-line bg-white p-4 text-[13.5px] leading-relaxed text-ink-3">
                  Tell me how you ride, your budget, or what matters most — I&apos;ll suggest specific, compatible changes and explain why.
                </div>
              )}
              {chat.map((m) => (m.role === "user" ? <UserBubble key={m.id} text={m.text} /> : <AssistantBubble key={m.id} m={m} onApply={apply} />))}
              {busy && (
                <div className="flex gap-1 px-1 py-2" aria-label="Thinking">
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className="size-1.5 rounded-full bg-muted" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-line bg-white p-3">
              {chat.length === 0 && (
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {PROMPTS[build.discipline].map((p) => (
                    <button key={p} onClick={() => send(p)} className="rounded-full border border-line bg-paper px-3 py-1 text-[12.5px] text-ink-3 hover:border-ink/30 hover:text-ink">
                      {p}
                    </button>
                  ))}
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(input);
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send(input);
                    }
                  }}
                  rows={1}
                  placeholder="e.g. My budget is €3,000"
                  className="max-h-28 min-h-10 flex-1 resize-none rounded-md border border-line bg-paper px-3 py-2.5 text-[14px] outline-none placeholder:text-subtle focus:border-ink/40"
                  aria-label="Message the assistant"
                />
                <Button type="submit" size="icon" className="h-10 w-10" disabled={!input.trim() || busy} aria-label="Send">
                  <ArrowUp className="size-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn("flex items-center gap-2 rounded-full py-3 pl-4 pr-5 text-[14px] font-medium shadow-lift transition-colors", open ? "bg-white text-ink ring-1 ring-line" : "bg-ink text-white hover:bg-ink-3")}
        aria-expanded={open}
      >
        <Sparkles className={cn("size-4", open ? "text-accent" : "text-accent-bright")} />
        {open ? "Hide assistant" : "Ask BikeBuilder AI"}
      </button>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return <div className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-ink px-3.5 py-2 text-[14px] text-white">{text}</div>;
}

function AssistantBubble({ m, onApply }: { m: ChatMessage; onApply: (m: ChatMessage, swaps: Swap[]) => void }) {
  const lines = m.text.split("\n");
  return (
    <div className="max-w-[96%] space-y-2.5">
      {m.understood && m.understood.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {m.understood.map((u) => (
            <span key={u} className="rounded-sm bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent-strong">{u}</span>
          ))}
        </div>
      )}
      <div className="rounded-lg rounded-bl-sm border border-line bg-white px-3.5 py-3 text-[13.5px] leading-relaxed text-ink-3">
        {lines.map((l, i) => (
          <p key={i} className={cn(l.startsWith("•") && "mt-1.5 pl-3 -indent-3")}>{l}</p>
        ))}
      </div>
      {m.swaps && m.swaps.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-line bg-white">
          <ul className="divide-y divide-line">
            {m.swaps.map((s) => {
              const to = getComponent(s.toId);
              return (
                <li key={s.category + s.toId} className="flex items-center gap-3 px-3.5 py-2.5 text-[12.5px]">
                  <span className="w-16 shrink-0 capitalize text-muted">{s.category}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">{to?.brand} {to?.model}</span>
                  <span className="tabular shrink-0 text-muted">{formatEurDelta(s.deltaPriceEur)}</span>
                  <span className="tabular hidden w-14 shrink-0 text-right text-muted sm:block">{formatGramDelta(s.deltaWeightG)}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between gap-2 border-t border-line bg-paper px-3.5 py-2.5">
            <span className="tabular text-[12.5px] text-muted">
              Total {formatEurDelta(m.swaps.reduce((n, s) => n + s.deltaPriceEur, 0))} · {formatGramDelta(m.swaps.reduce((n, s) => n + s.deltaWeightG, 0))}
            </span>
            {m.applied ? (
              <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-strong"><Check className="size-3.5" /> Applied</span>
            ) : (
              <Button size="sm" onClick={() => onApply(m, m.swaps!)}>Apply {m.swaps.length > 1 ? "all" : "change"}</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
