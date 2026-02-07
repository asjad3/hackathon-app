/**
 * AI Rumor Analyzer - Comprehensive analysis using Google Gemini
 *
 * Features:
 * 1. Summarization for long rumors
 * 2. Time-bound classification with expiry detection
 * 3. Content censorship (profanity filtering)
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-1.5-flash";

export interface RumorAnalysis {
  summary: string | null;
  isTimeBound: boolean;
  expiryDate: string | null; // ISO 8601 format
  censoredContent: string | null;
  hasHarmfulContent: boolean;
  analysisMetadata: {
    processingTime: number;
    model: string;
    confidence: 'high' | 'medium' | 'low';
  };
}

/**
 * Main analysis function - processes rumor with all AI features
 */
export async function analyzeRumor(
  rumorContent: string,
  createdAt: string
): Promise<RumorAnalysis> {
  const startTime = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey?.trim()) {
    console.warn('[AI Analyzer] No Gemini API key found');
    return getDefaultAnalysis(rumorContent, startTime);
  }

  const prompt = buildAnalysisPrompt(rumorContent, createdAt);

  try {
    const response = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 512,
          temperature: 0.3,
          responseMimeType: "application/json", // Force JSON response
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[AI Analyzer] API error:', response.status, error.slice(0, 200));
      return getDefaultAnalysis(rumorContent, startTime);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!rawText) {
      console.warn('[AI Analyzer] Empty response from Gemini');
      return getDefaultAnalysis(rumorContent, startTime);
    }

    // Parse AI response
    const analysis = parseAIResponse(rawText, rumorContent, startTime);

    console.log('[AI Analyzer] ✅ Analysis complete:', {
      rumorLength: rumorContent.length,
      isTimeBound: analysis.isTimeBound,
      hasHarmful: analysis.hasHarmfulContent,
      processingTime: analysis.analysisMetadata.processingTime + 'ms'
    });

    return analysis;

  } catch (error) {
    console.error('[AI Analyzer] Request failed:', error instanceof Error ? error.message : error);
    return getDefaultAnalysis(rumorContent, startTime);
  }
}

/**
 * Build comprehensive analysis prompt
 */
function buildAnalysisPrompt(content: string, createdAt: string): string {
  return `You are an AI assistant analyzing campus rumors. Perform a comprehensive analysis and return ONLY valid JSON.

RUMOR CONTENT:
"""
${content.slice(0, 4000)}
"""

RUMOR CREATED AT: ${createdAt}
CURRENT DATE: ${new Date().toISOString()}

TASKS:
1. **Summarization**: Create a concise 1-2 sentence summary (max 200 chars). Write in third-person or passive voice (e.g., "The cafeteria will be closed" or "Someone reported seeing..."). DO NOT use phrases like "User says" or "User does" - write naturally as if reporting the rumor directly. If rumor is already short, return the original.

2. **Time-Bound Detection**: Determine if this rumor has temporal relevance that will expire.
   Examples of TIME-BOUND rumors:
   - "The cafeteria is closed today"
   - "There's a party this Friday night"
   - "Registration deadline is March 15th"
   - "Tomorrow's classes are cancelled"

   Examples of NON-TIME-BOUND rumors:
   - "The library 3rd floor is haunted"
   - "The cafeteria food is overpriced"
   - "Professor Smith is the best teacher"

   If TIME-BOUND, calculate expiry date based on:
   - "today" = createdAt + 1 day
   - "tomorrow" = createdAt + 2 days
   - "this week" = next Sunday 11:59 PM
   - "this Friday" = that Friday 11:59 PM
   - Specific dates = that date + 1 day
   - Events = event date + 1 day

3. **Content Censorship**: Detect and censor profanity/abusive language.
   - Replace offensive words with asterisks (e.g., "fuck" → "f**k", "shit" → "s**t")
   - Common profanity: fuck, shit, bitch, ass, damn, hell, bastard, dick, pussy, cunt, etc.
   - Return the censored version of the content
   - If no profanity, return null

4. **Harmful Content Flag**: Check for harassment, threats, hate speech, or serious harm.

RESPOND WITH THIS EXACT JSON STRUCTURE (no markdown, no code fences, just raw JSON):
{
  "summary": "concise summary here",
  "isTimeBound": true or false,
  "expiryDate": "ISO 8601 date or null",
  "censoredContent": "censored text or null if no profanity",
  "hasHarmfulContent": true or false,
  "confidence": "high, medium, or low",
  "reasoning": "brief explanation of time-bound decision"
}`;
}

/**
 * Parse AI response with robust error handling
 */
function parseAIResponse(rawText: string, originalContent: string, startTime: number): RumorAnalysis {
  try {
    // Remove markdown code fences if present
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const jsonString = jsonMatch ? jsonMatch[1] : rawText.trim();

    const parsed = JSON.parse(jsonString);

    return {
      summary: parsed.summary || null,
      isTimeBound: Boolean(parsed.isTimeBound),
      expiryDate: parsed.expiryDate || null,
      censoredContent: parsed.censoredContent || null,
      hasHarmfulContent: Boolean(parsed.hasHarmfulContent),
      analysisMetadata: {
        processingTime: Date.now() - startTime,
        model: MODEL,
        confidence: parsed.confidence || 'medium',
      },
    };
  } catch (error) {
    console.error('[AI Analyzer] JSON parsing failed:', error);
    // Fallback: basic analysis
    return getDefaultAnalysis(originalContent, startTime);
  }
}

/**
 * Fallback analysis when AI is unavailable
 */
function getDefaultAnalysis(content: string, startTime: number): RumorAnalysis {
  return {
    summary: content.length > 200 ? content.slice(0, 197) + '...' : null,
    isTimeBound: false,
    expiryDate: null,
    censoredContent: null,
    hasHarmfulContent: false,
    analysisMetadata: {
      processingTime: Date.now() - startTime,
      model: 'fallback',
      confidence: 'low',
    },
  };
}

/**
 * Manual profanity filter (backup if AI fails)
 */
export function censorProfanity(text: string): string | null {
  const profanityList = [
    'fuck', 'shit', 'bitch', 'ass', 'damn', 'hell', 'bastard',
    'dick', 'pussy', 'cunt', 'cock', 'whore', 'slut', 'fag',
    'nigger', 'nigga', 'retard', 'rape'
  ];

  let censored = text;
  let hasProfanity = false;

  profanityList.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(censored)) {
      hasProfanity = true;
      censored = censored.replace(regex, (match) => {
        return match[0] + '*'.repeat(match.length - 2) + match[match.length - 1];
      });
    }
  });

  return hasProfanity ? censored : null;
}
