import { respond, type AssistantReply, type AssistantRequest } from "./engine";

/**
 * Seam for plugging in a language model.
 *
 * A future LLM provider should:
 *  1. use the model to extract intent (budget, style, priorities) from the message,
 *  2. call the deterministic engine for the actual swaps and numbers, and
 *  3. let the model phrase the reply — never let it invent prices or specs.
 */
export interface AssistantProvider {
  id: AssistantReply["provider"];
  respond(req: AssistantRequest): Promise<AssistantReply>;
}

export const rulesProvider: AssistantProvider = {
  id: "rules",
  respond: async (req) => respond(req),
};

export function getAssistantProvider(): AssistantProvider {
  // No LLM provider is configured yet; the rule engine is the only provider.
  return rulesProvider;
}
