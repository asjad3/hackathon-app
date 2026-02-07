/**
 * AI Rumor Analyzer - Comprehensive analysis using Google Gemini API
 *
 * Features:
 * 1. Summarization for long rumors
 * 2. Time-bound classification with expiry detection
 * 3. Content censorship (profanity filtering)
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-2.5-flash";

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
 * Build comprehensive analysis prompt
 */
function buildAnalysisPrompt(content: string, createdAt: string): string {
  const currentDate = new Date();
  return `You are an AI assistant analyzing campus rumors. Perform comprehensive analysis and return ONLY valid raw JSON.

Your job is to:
1. **Summarization**: Create a concise 1-2 sentence summary (max 200 chars). Write in third-person or passive voice (e.g., "The cafeteria will be closed" or "Someone reported seeing..."). DO NOT use phrases like "User says" or "User does" - write naturally as if reporting the rumor directly. If rumor is already short, return the original.

2. **Time-Bound Detection & Expiry Date Calculation**: 
   Determine if this rumor has temporal relevance that will expire.
   
   **CRITICAL RULE**: If isTimeBound is true, you MUST provide a valid ISO 8601 expiryDate. Never set isTimeBound to true with a null expiryDate.
   
   Examples of TIME-BOUND rumors WITH their expiry dates:
   - "The cafeteria is closed today" → isTimeBound: true, expiryDate: tomorrow at 11:59 PM
   - "There's a party this Friday night" → isTimeBound: true, expiryDate: this Saturday at 11:59 PM
   - "Registration deadline is March 15th" → isTimeBound: true, expiryDate: March 16th at 11:59 PM
   - "Tomorrow's classes are cancelled" → isTimeBound: true, expiryDate: day after tomorrow at 11:59 PM
   - "The exam is on February 20th" → isTimeBound: true, expiryDate: February 21st at 11:59 PM
   
   Examples of NON-TIME-BOUND rumors:
   - "The library 3rd floor is haunted" → isTimeBound: false, expiryDate: null
   - "The cafeteria food is overpriced" → isTimeBound: false, expiryDate: null
   - "Professor Smith is the best teacher" → isTimeBound: false, expiryDate: null
   
   **Expiry Date Calculation Rules** (use these EXACTLY):
   - "today" → RUMOR_CREATED_AT + 1 day at 23:59:59
   - "tomorrow" → RUMOR_CREATED_AT + 2 days at 23:59:59
   - "this week" → Next Sunday at 23:59:59
   - "this Friday" → That Friday at 23:59:59
   - "this weekend" → Next Sunday at 23:59:59
   - Specific date mentioned (e.g., "March 15") → That date + 1 day at 23:59:59
   - Events with time ("party tonight", "meeting at 3pm") → Event time + 6 hours
   
   **Current Context**:
   - Rumor created at: ${createdAt}
   - Current date: ${currentDate.toISOString()}
   - Current day of week: ${currentDate.toLocaleDateString('en-US', { weekday: 'long' })}

3. **Content Censorship**: Detect and censor profanity/abusive language.
   - Replace offensive words with asterisks (e.g., "fuck" → "f**k", "shit" → "s**t")
   - Common profanity: fuck, shit, bitch, ass, damn, hell, bastard, dick, pussy, cunt, etc.
   - Return the censored version of the content
   - If no profanity, return null

4. **Harmful Content Flag**: Check for harassment, threats, hate speech, or serious harm.

RUMOR CONTENT:
"""
${content.slice(0, 4000)}
"""

RESPOND WITH THIS EXACT JSON STRUCTURE (no markdown, no code fences, just raw JSON):
{
  "summary": "Short summary of the rumor",
  "isTimeBound": false,
  "expiryDate": null,
  "censoredContent": null,
  "hasHarmfulContent": false,
  "confidence": "high",
  "reasoning": "Brief explanation of why this is/isn't time-bound"
}

CRITICAL VALIDATION RULES:
1. If isTimeBound is true, expiryDate MUST be a valid ISO 8601 date string, NEVER null
2. If isTimeBound is false, expiryDate MUST be null
3. expiryDate must be in the future relative to the creation date
4. Use ISO 8601 format with timezone: "2026-02-09T23:59:59.999Z"

IMPORTANT:
- Respond with *only* valid raw JSON.
- Do NOT include markdown, code fences, comments, or any extra formatting.
- The format must be a raw JSON object.
- NEVER set isTimeBound to true without providing a valid expiryDate.

Repeat: Do not wrap your output in markdown or code fences.`;
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
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[AI Analyzer] API error:', response.status, error.slice(0, 200));
      return getDefaultAnalysis(rumorContent, startTime);
    }

    const data = await response.json();

    // Debug: Log the full API response structure
    console.log('[AI Analyzer] Full API response structure:', JSON.stringify(data, null, 2).slice(0, 500));

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!rawText) {
      console.warn('[AI Analyzer] Empty response from Gemini');
      console.warn('[AI Analyzer] Response data:', JSON.stringify(data));
      return getDefaultAnalysis(rumorContent, startTime);
    }

    // Debug: Log the raw text length
    console.log('[AI Analyzer] Raw text length:', rawText.length);
    console.log('[AI Analyzer] Raw text preview:', rawText.slice(0, 100) + '...');
    console.log('[AI Analyzer] Raw text end:', '...' + rawText.slice(-100));

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
 * Parse AI response with robust error handling
 */
function parseAIResponse(rawText: string, originalContent: string, startTime: number): RumorAnalysis {
  try {
    // Try to extract JSON from the response
    // Handle markdown code fences if present
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const jsonString = jsonMatch ? jsonMatch[1] : rawText.trim();

    console.log('[AI Analyzer] Attempting to parse JSON (length:', jsonString.length, ')');

    const parsed = JSON.parse(jsonString);

    // CRITICAL VALIDATION: Enforce time-bound expiry date rule
    let isTimeBound = Boolean(parsed.isTimeBound);
    let expiryDate = parsed.expiryDate || null;

    if (isTimeBound && !expiryDate) {
      console.warn('[AI Analyzer] ⚠️ VALIDATION ERROR: isTimeBound is true but expiryDate is null. Forcing isTimeBound to false.');
      isTimeBound = false;
    }

    // Additional validation: check if expiryDate is a valid date string
    if (isTimeBound && expiryDate) {
      const expiryDateObj = new Date(expiryDate);
      if (isNaN(expiryDateObj.getTime())) {
        console.warn('[AI Analyzer] ⚠️ VALIDATION ERROR: Invalid expiryDate format. Forcing isTimeBound to false.');
        isTimeBound = false;
        expiryDate = null;
      } else {
        // Ensure expiry date is in the future
        const now = new Date();
        if (expiryDateObj <= now) {
          console.warn('[AI Analyzer] ⚠️ VALIDATION WARNING: expiryDate is in the past or present. This rumor may be already expired.');
        }
      }
    }

    console.log('[AI Analyzer] Successfully parsed JSON:', {
      hasSummary: !!parsed.summary,
      summaryLength: parsed.summary?.length,
      isTimeBound: isTimeBound,
      expiryDate: expiryDate,
      hasHarmful: parsed.hasHarmfulContent,
      confidence: parsed.confidence,
    });

    return {
      summary: parsed.summary || null,
      isTimeBound: isTimeBound,
      expiryDate: expiryDate,
      censoredContent: parsed.censoredContent || null,
      hasHarmfulContent: Boolean(parsed.hasHarmfulContent),
      analysisMetadata: {
        processingTime: Date.now() - startTime,
        model: MODEL,
        confidence: parsed.confidence || 'medium',
      },
    };
  } catch (error) {
    console.error('[AI Analyzer] JSON parsing failed:', error instanceof Error ? error.message : error);
    console.error('[AI Analyzer] Failed JSON string (first 200 chars):', rawText?.slice(0, 200));
    console.error('[AI Analyzer] Failed JSON string (last 200 chars):', rawText?.slice(-200));
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
