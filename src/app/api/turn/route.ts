import { decideTurn } from "@/lib/jev/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type TurnBody = {
  transcript?: string;
  history?: Array<{ role: "user" | "agent"; text: string }>;
  sessionId?: string;
};

export async function POST(req: Request) {
  let body: TurnBody;
  try {
    body = (await req.json()) as TurnBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const transcript = body.transcript?.trim() ?? "";
  if (!transcript) {
    return NextResponse.json({ error: "transcript is required" }, { status: 400 });
  }

  try {
    const decision = await decideTurn({
      transcript,
      history: body.history,
      sessionId: body.sessionId,
    });
    return NextResponse.json(decision);
  } catch (err) {
    const message = err instanceof Error ? err.message : "decideTurn failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
