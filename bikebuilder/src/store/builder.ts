"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AssistantContext } from "@/lib/assistant/engine";
import { PRESETS } from "@/lib/presets";
import type { Build, CategoryId, Comment, Discipline, PartSelection, Swap } from "@/lib/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  swaps?: Swap[];
  understood?: string[];
  applied?: boolean;
}

interface BuilderState {
  build: Build;
  /** Previous selections, for undo after applying suggestions. */
  history: PartSelection[];
  saved: Build[];
  liked: string[];
  bookmarked: string[];
  following: string[];
  comments: Comment[];
  chat: ChatMessage[];
  assistantContext: AssistantContext;

  setPart: (category: CategoryId, componentId: string) => void;
  removePart: (category: CategoryId) => void;
  applySwaps: (swaps: Swap[]) => void;
  undo: () => void;
  rename: (name: string) => void;
  newBuild: (discipline: Discipline) => void;
  loadBuild: (source: Pick<Build, "name" | "discipline" | "parts" | "id">, opts?: { copy?: boolean }) => void;
  saveBuild: (opts?: { publish?: boolean }) => Build;
  deleteSaved: (id: string) => void;
  toggleLike: (buildId: string) => void;
  toggleBookmark: (buildId: string) => void;
  toggleFollow: (userId: string) => void;
  addComment: (buildId: string, body: string) => void;
  pushChat: (m: ChatMessage) => void;
  markChatApplied: (id: string) => void;
  setAssistantContext: (c: AssistantContext) => void;
  clearChat: () => void;
}

const now = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

function freshBuild(discipline: Discipline): Build {
  const preset = PRESETS[discipline];
  return {
    id: uid("draft"),
    name: preset.name,
    discipline,
    parts: { ...preset.parts },
    createdAt: now(),
    updatedAt: now(),
    visibility: "private",
  };
}

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

export const CURRENT_USER_ID = "u-you";

export const useBuilder = create<BuilderState>()(
  persist(
    (set, get) => {
      const edit = (parts: PartSelection) =>
        set((s) => ({
          history: [...s.history, s.build.parts].slice(-30),
          build: { ...s.build, parts, updatedAt: now() },
        }));

      return {
        build: freshBuild("mtb"),
        history: [],
        saved: [],
        liked: [],
        bookmarked: [],
        following: [],
        comments: [],
        chat: [],
        assistantContext: {},

        setPart: (category, componentId) => edit({ ...get().build.parts, [category]: componentId }),
        removePart: (category) => {
          const parts = { ...get().build.parts };
          delete parts[category];
          edit(parts);
        },
        applySwaps: (swaps) => {
          const parts = { ...get().build.parts };
          for (const s of swaps) parts[s.category] = s.toId;
          edit(parts);
        },
        undo: () =>
          set((s) => {
            const prev = s.history[s.history.length - 1];
            return prev ? { build: { ...s.build, parts: prev, updatedAt: now() }, history: s.history.slice(0, -1) } : s;
          }),
        rename: (name) => set((s) => ({ build: { ...s.build, name, updatedAt: now() } })),
        newBuild: (discipline) => set({ build: freshBuild(discipline), history: [], chat: [], assistantContext: {} }),
        loadBuild: (source, opts) =>
          set({
            build: {
              id: opts?.copy ? uid("draft") : source.id,
              name: opts?.copy ? `${source.name} (copy)` : source.name,
              discipline: source.discipline,
              parts: { ...source.parts },
              createdAt: now(),
              updatedAt: now(),
              visibility: "private",
              copiedFrom: opts?.copy ? source.id : undefined,
            },
            history: [],
            chat: [],
            assistantContext: {},
          }),
        saveBuild: (opts) => {
          const b: Build = {
            ...get().build,
            id: get().build.id.startsWith("draft") ? uid("build") : get().build.id,
            authorId: CURRENT_USER_ID,
            updatedAt: now(),
            visibility: opts?.publish ? "public" : get().build.visibility,
          };
          set((s) => ({ build: b, saved: [b, ...s.saved.filter((x) => x.id !== b.id)] }));
          return b;
        },
        deleteSaved: (id) => set((s) => ({ saved: s.saved.filter((b) => b.id !== id) })),
        toggleLike: (id) => set((s) => ({ liked: toggle(s.liked, id) })),
        toggleBookmark: (id) => set((s) => ({ bookmarked: toggle(s.bookmarked, id) })),
        toggleFollow: (id) => set((s) => ({ following: toggle(s.following, id) })),
        addComment: (buildId, body) =>
          set((s) => ({ comments: [...s.comments, { id: uid("c"), buildId, authorId: CURRENT_USER_ID, body, createdAt: now() }] })),
        pushChat: (m) => set((s) => ({ chat: [...s.chat, m].slice(-40) })),
        markChatApplied: (id) => set((s) => ({ chat: s.chat.map((m) => (m.id === id ? { ...m, applied: true } : m)) })),
        setAssistantContext: (assistantContext) => set({ assistantContext }),
        clearChat: () => set({ chat: [], assistantContext: {} }),
      };
    },
    {
      name: "bikebuilder-ai",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

/** True once persisted state has been loaded in the browser. */
export function useStoreHydrated() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (useBuilder.persist.hasHydrated()) setDone(true);
    return useBuilder.persist.onFinishHydration(() => setDone(true));
  }, []);
  return done;
}
