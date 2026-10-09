const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

async function generateClinicalReasoning(prompt) {
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text; // important
  } catch (err) {
    console.error("Gemini error:", err);
    if (err.status === 429 || err.message?.includes("rate limit")) {
      throw {
        type: "RATE_LIMIT",
        message: "AI limit hit. Try again later adter 24 hr."
      };
    }
    throw new Error("LLM failed");
  }
}

module.exports = { generateClinicalReasoning };
