import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseServiceRole } from "@/lib/supabase-server";
import Anthropic from "@anthropic-ai/sdk";

const UX_PROMPT = `You are a senior UX/UI consultant with expertise across the disciplines in "Don't Make Me Think" (Krug), "Refactoring UI" (Wathan & Schoger), "Laws of UX" (Yablonski), "The Design of Everyday Things" (Norman), "Influence" (Cialdini), and "Building a StoryBrand" (Miller).

Analyse the provided webpage screenshot. Be strict and evidence-based — a score above 8/10 requires strong visible evidence.

REQUIREMENTS:
- Rate each of the 10 categories out of 10
- For each category: one clear observation, one specific issue if present, one actionable fix
- Cite the source when referencing a principle (e.g. "Nielsen heuristic #6 — Recognition over Recall", "WCAG 2.2 criterion 1.4.3", "Krug's trunk test", "Cialdini — social proof", "Fitts's Law")
- No filler or compliments without evidence
- Temperature is low — this is a professional audit, not a pep talk

CATEGORIES (rate each /10):
1. First Impressions — value prop clarity within 5 seconds, trust signals, primary CTA visibility (Krug's trunk test)
2. Navigation & Information Architecture — menu visibility, label clarity, depth, current-page indicator
3. Content Hierarchy & Readability — font size (≥16px body), line-height (1.5–1.7), contrast ratio (WCAG 4.5:1 AA), scannability
4. Visual Design & Layout — grid consistency, whitespace, colour contrast, imagery relevance (Refactoring UI principles)
5. Calls to Action — prominence, specificity, competing CTAs, button affordance (Norman's affordances)
6. Forms & Interactions — label placement, inline validation, error clarity, tap targets ≥44×44px (WCAG 2.5.5)
7. Mobile & Responsive Design — horizontal scroll at 320px, text legibility without zoom, touch target sizing
8. Performance Indicators — visible loading states, absence of layout shift, meaningful content render
9. Accessibility (WCAG 2.2) — keyboard navigability, alt text, focus states, colour contrast
10. Emotional & Brand Fit — value proposition clarity, tone/copy alignment, visual mood vs audience (Norman's visceral/reflective levels)

OUTPUT FORMAT — follow exactly:

## Overall Score: X/10

## 1. First Impressions — X/10
**Observation:** …
**Issue:** … *(cite principle)*
**Fix:** …

## 2. Navigation & Information Architecture — X/10
**Observation:** …
**Issue:** … *(cite principle)*
**Fix:** …

## 3. Content Hierarchy & Readability — X/10
**Observation:** …
**Issue:** … *(cite principle)*
**Fix:** …

## 4. Visual Design & Layout — X/10
**Observation:** …
**Issue:** … *(cite principle)*
**Fix:** …

## 5. Calls to Action — X/10
**Observation:** …
**Issue:** … *(cite principle)*
**Fix:** …

## 6. Forms & Interactions — X/10
**Observation:** …
**Issue:** … *(cite principle)*
**Fix:** …

## 7. Mobile & Responsive Design — X/10
**Observation:** …
**Issue:** … *(cite principle)*
**Fix:** …

## 8. Performance Indicators — X/10
**Observation:** …
**Issue:** … *(cite principle)*
**Fix:** …

## 9. Accessibility — X/10
**Observation:** …
**Issue:** … *(cite principle)*
**Fix:** …

## 10. Emotional & Brand Fit — X/10
**Observation:** …
**Issue:** … *(cite principle)*
**Fix:** …

## Priority Fixes
1. **[Title]** — [Why this has the highest impact on conversion/retention]
2. **[Title]** — [Impact rationale]
3. **[Title]** — [Impact rationale]`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const auth = await createSupabaseServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pageId } = await params;
  const body = await req.json().catch(() => ({}));
  const device = (body.device as string) || "mobile";

  const db = createSupabaseServiceRole();

  const { data: screenshot } = await db
    .from("screenshots")
    .select("storage_path, viewport_width, page_height")
    .eq("page_id", pageId)
    .eq("device_type", device)
    .maybeSingle();

  if (!screenshot?.storage_path) {
    return NextResponse.json({ error: "no_screenshot" }, { status: 400 });
  }

  const publicUrl = db.storage
    .from("screenshots")
    .getPublicUrl(screenshot.storage_path).data.publicUrl;

  const imgRes = await fetch(publicUrl);
  if (!imgRes.ok) {
    return NextResponse.json({ error: "Failed to fetch screenshot" }, { status: 500 });
  }
  const imgBuffer = await imgRes.arrayBuffer();
  const base64 = Buffer.from(imgBuffer).toString("base64");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const client = new Anthropic({ apiKey });

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const stream = client.messages.stream({
          model: "claude-sonnet-5-20251101",
          max_tokens: 4096,
          temperature: 0.2,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: base64,
                  },
                },
                {
                  type: "text",
                  text: UX_PROMPT,
                },
              ],
            },
          ],
        });
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[ux-analysis] stream error:", msg);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
