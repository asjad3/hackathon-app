/**
 * Google Gemini AI — rumor summarization + harmful content flag (optional add-on).
 * Uses free tier: https://aistudio.google.com/apikey
 * AI never decides truth; only assists with readability and safety (proposal §7).
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-1.5-flash"; // Free tier, fast

export interface SummarizeResult {
  summary: string | null;
  contentWarning: boolean;
}

export async function summarizeAndCheckSafety(rumorContent: string): Promise<SummarizeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    return { summary: null, contentWarning: false };
  }

  const prompt = `You are a neutral assistant for a campus rumor board. Do two things:

1. Summarize the following rumor in 1-2 short sentences (max 2 lines). Be factual and neutral. Output only the summary, no labels.
2. Then on a new line write exactly "SAFE" or "WARNING" if the content appears to contain harassment, threats, hate speech, or serious harm. If unsure, say SAFE.

Rumor text:
"""
${rumorContent.slice(0, 4000)}
"""

Reply with the 1-2 sentence summary, then a newline, then either SAFE or WARNING.`;

  try {
    const res = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 256,
          temperature: 0.3,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn("[Gemini] API error:", res.status, err?.slice(0, 200));
      return { summary: null, contentWarning: false };
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      };
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return { summary: null, contentWarning: false };

    const lines = text.split(/\n/).map((s) => s.trim()).filter(Boolean);
    const lastLine = lines[lines.length - 1]?.toUpperCase() ?? "";
    const contentWarning = lastLine === "WARNING";
    const summaryLines = lastLine === "SAFE" || lastLine === "WARNING" ? lines.slice(0, -1) : lines;
    const summary = summaryLines.join(" ").trim().slice(0, 300) || null;

    return { summary, contentWarning };
  } catch (e) {
    console.warn("[Gemini] Request failed:", e instanceof Error ? e.message : e);
    return { summary: null, contentWarning: false };
  }
}
