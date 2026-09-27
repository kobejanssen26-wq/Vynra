import { getAssistantProvider } from "@/lib/assistant/provider";
import type { AssistantRequest } from "@/lib/assistant/engine";

export async function POST(request: Request) {
  let body: AssistantRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || (body.discipline !== "mtb" && body.discipline !== "road") || typeof body.message !== "string") {
    return Response.json({ error: "Expected { discipline, selection, message }" }, { status: 400 });
  }
  const message = body.message.slice(0, 1000);
  const reply = await getAssistantProvider().respond({ ...body, message, selection: body.selection ?? {} });
  return Response.json(reply);
}
