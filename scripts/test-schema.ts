import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const schema = {
  type: Type.OBJECT,
  properties: {
    gesamturteil: { type: Type.STRING },
    gesamtpunkte: { type: Type.NUMBER },
    maxPunkte: { type: Type.NUMBER },
    kriterien: {
      type: Type.OBJECT,
      properties: {
        aufgabenerfullung: {
          type: Type.OBJECT,
          properties: {
            stufe: { type: Type.STRING },
            punkte: { type: Type.NUMBER },
            max: { type: Type.NUMBER },
            begrundung: { type: Type.STRING },
          },
        },
        koherenz: {
          type: Type.OBJECT,
          properties: {
            stufe: { type: Type.STRING },
            punkte: { type: Type.NUMBER },
            max: { type: Type.NUMBER },
            begrundung: { type: Type.STRING },
          },
        },
        wortschatz: {
          type: Type.OBJECT,
          properties: {
            stufe: { type: Type.STRING },
            punkte: { type: Type.NUMBER },
            max: { type: Type.NUMBER },
            begrundung: { type: Type.STRING },
          },
        },
        strukturen: {
          type: Type.OBJECT,
          properties: {
            stufe: { type: Type.STRING },
            punkte: { type: Type.NUMBER },
            max: { type: Type.NUMBER },
            begrundung: { type: Type.STRING },
          },
        },
      },
    },
    staerken: { type: Type.ARRAY, items: { type: Type.STRING } },
    verbesserungen: { type: Type.ARRAY, items: { type: Type.STRING } },
    korrekturen: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          vorschlag: { type: Type.STRING },
          erklaerung: { type: Type.STRING },
        },
      },
    },
    musterloesung: { type: Type.STRING },
  },
  required: [
    "gesamturteil",
    "gesamtpunkte",
    "maxPunkte",
    "kriterien",
    "staerken",
    "verbesserungen",
    "korrekturen",
    "musterloesung"
  ]
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "hello",
      config: {
        responseMimeType: "application/json",
        responseSchema: schema as any,
      },
    });
    console.log(response.text);
  } catch (e: any) {
    if (e.status) {
      console.error(e.status, e.message);
    } else {
      console.error(e);
    }
  }
}
run();
