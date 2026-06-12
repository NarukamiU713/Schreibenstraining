import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const schema = {
  type: "INVALID_TYPE",
  properties: { x: { type: "INVALID_FIELD" } }
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: "hello",
      config: {
        responseMimeType: "application/json",
        responseSchema: schema as any,
      },
    });
    console.log(response.text);
  } catch (e: any) {
    console.log("Error status:", e.status);
    console.log("Error details:", e.message);
  }
}
run();
