const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateClinicalReasoning(prompt) {
  try {
    const response = await ai.models.generateContent({
    //  model: "gemini-3-flash-preview",
      model: "gemini-2.5-flash",
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