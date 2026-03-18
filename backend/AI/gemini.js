const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateClinicalReasoning(prompt) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text; // important
  } catch (err) {
    console.error("Gemini error:", err);
    throw new Error("LLM failed");
  }
}

module.exports = { generateClinicalReasoning };