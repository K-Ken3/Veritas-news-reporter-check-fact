import { GoogleGenAI } from "@google/genai";
import { FactCheckResult, Source } from "../types";

/**
 * Enhanced retry logic specifically for Gemini Free Tier.
 * If a 429 (Rate Limit) occurs, we wait 62 seconds to guarantee
 * we've crossed into the next 1-minute quota window.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  const QUOTA_RESET_DELAY = 62000; // 62 seconds

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const errorStr = JSON.stringify(error).toLowerCase();
      const errorMsg = (error.message || "").toLowerCase();

      const isQuotaError =
        error.status === 429 ||
        errorStr.includes("429") ||
        errorStr.includes("resource_exhausted") ||
        errorStr.includes("quota_exceeded") ||
        errorMsg.includes("429") ||
        errorMsg.includes("quota");

      if (isQuotaError && i < maxRetries - 1) {
        console.warn(
          `Veritas Service: Rate limit hit. Attempt ${i + 1}/${maxRetries}. Waiting 62s for quota window reset...`
        );
        await new Promise((resolve) => setTimeout(resolve, QUOTA_RESET_DELAY));
        continue;
      }
      throw error;
    }
  }
  return await fn();
}

export const performFactCheck = async (text: string): Promise<FactCheckResult> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing API Key. Please ensure VITE_GEMINI_API_KEY is set in your .env file."
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  // Use a model that supports Google Search grounding.
  // If "gemini-2.5-flash" is not valid, replace with, e.g., "gemini-1.5-flash" or "gemini-2.0-flash-exp".
  const modelName = "gemini-2.5-flash";

  const systemInstruction = `
    You are a professional investigative journalist and senior fact-checker.
    Your goal is to perform EVIDENCE DISCOVERY on user claims.

    GUIDELINES:
    1. Identify check-worthy factual assertions.
    2. Use Google Search to find high-credibility sources (.gov, .edu, reputable global news).
    3. Categorize claims: "verified", "refuted", "unclear", "partially_true".
    4. Provide neutral, objective reasoning for each verdict.
    5. **Your response must be a single, valid JSON object** that exactly matches the following schema:
       {
         "summary": "string",
         "confidenceScore": number,
         "sources": [
           {
             "title": "string",
             "uri": "string",
             "snippet": "string (optional)",
             "publisher": "string (optional)",
             "publishedDate": "string (optional)",
             "category": "news" | "government" | "academic" | "ngo" | "other"
           }
         ],
         "claims": [
           {
             "text": "string",
             "verdict": "verified" | "refuted" | "unclear" | "partially_true",
             "reasoning": "string",
             "sourceIndices": [number],
             "evidenceStrength": "high" | "medium" | "low"
           }
         ]
       }
    6. Do not include any additional text before or after the JSON.
  `;

  const executeRequest = async () => {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analyze the following for factual accuracy and evidence, and return the JSON response as described: "${text}"`,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }], // Grounding enabled, no forced JSON mime type
      },
    });

    const rawText = response.text || "";

    // Extract JSON from the response (the model should output only JSON)
    const jsonStart = rawText.indexOf("{");
    const jsonEnd = rawText.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error("Raw response (non-JSON):", rawText);
      throw new Error(
        "The verification engine returned an invalid response format. Please try again."
      );
    }

    let result: FactCheckResult;
    try {
      result = JSON.parse(rawText.substring(jsonStart, jsonEnd + 1)) as FactCheckResult;
    } catch (parseError) {
      console.error("JSON parse error. Raw text:", rawText);
      throw new Error("Failed to parse verification result. The response was not valid JSON.");
    }

    // EXTRACTION: Always extract web URLs from grounding metadata to ensure all citations are present
    const groundingMetadata = (response as any).candidates?.[0]?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks || [];

    const groundingSources: Source[] = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "External Evidence",
        uri: chunk.web.uri,
        category: "other" as const,
        snippet: "Verified via Google Search grounding.",
      }));

    // Merge grounding sources into the final list, preventing duplicates
    const existingUris = new Set(result.sources.map((s) => s.uri.toLowerCase()));
    groundingSources.forEach((gs) => {
      if (!existingUris.has(gs.uri.toLowerCase())) {
        result.sources.push(gs);
      }
    });

    return result;
  };

  try {
    return await retryWithBackoff(executeRequest);
  } catch (error: any) {
    const errorStr = JSON.stringify(error).toLowerCase();
    if (errorStr.includes("429") || errorStr.includes("resource_exhausted")) {
      throw new Error(
        "QUOTA_EXCEEDED: The verification engine is at maximum capacity. A 60-second cooldown is required."
      );
    }
    throw new Error(error.message || "An unexpected error occurred during investigation.");
  }
};