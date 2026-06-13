import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

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
          schweregrad: { type: Type.STRING },
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

const compareSchema = {
  type: Type.OBJECT,
  properties: {
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
          schweregrad: { type: Type.STRING },
        },
      },
    },
  },
  required: [
    "staerken",
    "verbesserungen",
    "korrekturen"
  ]
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.post("/api/compare", async (req, res) => {
    try {
      const { originalText, modifiedText, provider = "gemini", customApiKey } = req.body;

      if (!originalText || !modifiedText) {
        return res.status(400).json({ error: "Missing originalText or modifiedText." });
      }

      const prompt = `
        Du bist ein erfahrener Deutschlehrer und Prüfer für das Goethe-Zertifikat C1.
        Hier sind zwei Eingaben: das Original eines Schülers und eine korrigierte Version oder das Bewertungs-Feedback einer anderen KI.
        
        Deine Aufgabe:
        1. Analysiere das Original und die zweite Eingabe (die gesamte KI-Korrektur/Vorschläge), um alle tatsächlichen Verbesserungen (Fehlerkorrekturen, stilistische Anpassungen etc.) zu extrahieren.
        2. Erstelle für jede Änderung einen Eintrag im Array "korrekturen". 
           - "original" ist der falsche/suboptimale Textausschnitt (so wie er im Original steht).
           - "vorschlag" ist die verbesserte Version basierend auf dem KI-Feedback oder dem korrigierten Text.
           - "erklaerung" ist eine fachlich fundierte, aber verständliche Erklärung auf Deutsch (Grammatikregel, Vokabeltipp etc.).
           - "schweregrad" ist entweder "minor" oder "major".
        3. Erstelle eine Liste der wichtigsten "verbesserungen" (was generell verbessert wurde).
        4. Erstelle eine Liste der "staerken" des Originaltextes.
        
        Originaler Text:
        ${originalText}
        
        Korrigierter Text / KI-Vorschläge:
        ${modifiedText}
      `;

      let jsonResult = {};
      if (provider === "deepseek") {
        const openai = new OpenAI({
          baseURL: "https://api.deepseek.com",
          apiKey: customApiKey || process.env.DEEPSEEK_API_KEY,
        });
        const schemaStr = JSON.stringify(compareSchema, null, 2);
        const completion = await openai.chat.completions.create({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt + "\n\nAntworte NUR im validen JSON-Format, das genau diesem Schema entspricht:\n" + schemaStr }],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 4096,
        });
        let content = completion.choices[0].message.content || "{}";
        content = content.replace(/```[A-Za-z]*\s*([\s\S]*?)\s*```/g, '$1').trim();
        if (content.startsWith('```json')) content = content.replace(/^```json\s*/i, '');
        if (content.endsWith('```')) content = content.replace(/\s*```$/, '');
        jsonResult = JSON.parse(content);
      } else {
        const currentAi = customApiKey 
          ? new GoogleGenAI({ apiKey: customApiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } })
          : ai;
          
        const response = await currentAi.models.generateContent({
           model: "gemini-2.5-flash",
           contents: prompt,
           config: {
             responseMimeType: "application/json",
             responseSchema: compareSchema,
             temperature: 0.1,
           },
        });
        jsonResult = JSON.parse(response.text || "{}");
      }
      
      res.json(jsonResult);
    } catch (error: any) {
      console.error("Compare error:", error);
      res.status(500).json({ error: error.message || "Something went wrong" });
    }
  });

  app.post("/api/evaluate", async (req, res) => {
    try {
      const { text, teil, taskPrompt, provider = "gemini", customApiKey } = req.body;

      if (!text || !teil) {
        return res.status(400).json({ error: "Missing text or teil parameter." });
      }

      const prompt = `
        Bewerte ausschließlich auf Deutsch und orientiere dich am Bewertungsraster des Goethe-Zertifikats C1.
        
        Arbeitsablauf:
        1. Prüfungsteil: Teil ${teil} (Teil 1: max 60 Punkte, Teil 2: max 40 Punkte). Setze maxPunkte entsprechend auf 60 oder 40.
        2. Prüfe die Aufgabenerfüllung. Falls Thema oder Umfang (weniger als 50%) verfehlt sind, setze "Aufgabenerfüllung" auf E und Gesamtpunkte auf 0.
        3. Bewerte Aufgabenerfüllung, Kohärenz, Wortschatz und Strukturen jeweils auf Stufe A, B, C, D oder E und begründe mit Textbelegen.
           Nutze für die Punkte exakt folgende Werte je nach Teil:
           Teil 1:
           - Aufgabenerfüllung (max 14): A=14, B=10.5, C=7, D=3.5, E=0.
           - Kohärenz (max 14): A=14, B=10.5, C=7, D=3.5, E=0.
           - Wortschatz (max 16): A=16, B=12, C=8, D=4, E=0.
           - Strukturen (max 16): A=16, B=12, C=8, D=4, E=0.
           Teil 2:
           - Alle 4 Kriterien (max 10 jeweils): A=10, B=7.5, C=5, D=2.5, E=0.
           Setze in der JSON-Ausgabe bei jedem Kriterium das Feld "max" auf den jeweiligen Max-Wert.
           Die "gesamtpunkte" sind die exakte mathematische Summe der 4 Kriterien-Punkte.
        4. WICHTIG: Bewerte wirklich jeden einzelnen Satz des Schülertexts. Jeder Satz muss eine Korrektur haben, und wenn es nur Fehlerkorrekturen oder auch kleine stilistische Verbesserungen sind! Klassifiziere "schweregrad" als "minor" (kleine Fehler/Verbesserungen) oder "major" (große/viele Fehler in diesem Satz). Gib alle in das Array "korrekturen".
        5. Erstelle eine individuell auf den Text des Schülers abgestimmte Musterlösung (die absolute "Best-Practice" C1-Version seines eigenen Textes!). Diese soll die Gedanken des Schülers aufgreifen und unter strenger Berücksichtigung der Goethe-Zertifikat C1 Bewertungskriterien optimal, präzise und elegant formulieren, anstatt nur ein allgemeines, losgelöstes Beispiel zu präsentieren.

        Aufgabenstellung (optional, falls vorhanden berücksichtigen):
        ${taskPrompt || "Keine spezifische Aufgabenstellung übergeben. Bewerte allgemeine C1-Sprachrichtigkeit und Textsorte entsprechend Teil " + teil + "."}

        Text des Schülers:
        ${text}
      `;

      const results = [];
      const promises = Array(6).fill(null).map(async (_, i) => {
        // Wait staggered delays to spread out rate limits
        await new Promise(resolve => setTimeout(resolve, i * 2000));
        
        if (provider === "deepseek") {
          const openai = new OpenAI({
            baseURL: "https://api.deepseek.com",
            apiKey: customApiKey || process.env.DEEPSEEK_API_KEY,
          });
          const schemaStr = JSON.stringify(schema, null, 2);
          const completion = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt + "\n\nAntworte NUR im validen JSON-Format, das genau diesem Schema entspricht:\n" + schemaStr }],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 8192,
          });
          let content = completion.choices[0].message.content || "{}";
          content = content.replace(/```[A-Za-z]*\s*([\s\S]*?)\s*```/g, '$1').trim();
          if (content.startsWith('```json')) content = content.replace(/^```json\s*/i, '');
          if (content.endsWith('```')) content = content.replace(/\s*```$/, '');
          return JSON.parse(content);
        } else {
          const currentAi = customApiKey 
            ? new GoogleGenAI({ apiKey: customApiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } })
            : ai;
            
          const response = await currentAi.models.generateContent({
             model: "gemini-2.5-flash",
             contents: prompt,
             config: {
               responseMimeType: "application/json",
               responseSchema: schema,
               temperature: 0.1,
             },
          });
          return JSON.parse(response.text || "{}");
        }
      });

      const allResponses = await Promise.allSettled(promises);
      for (const res of allResponses) {
        if (res.status === "fulfilled" && res.value && Object.keys(res.value).length > 0) {
          results.push(res.value);
        } else if (res.status === "rejected") {
          console.error("AI iteration failed:", res.reason);
        }
      }

      if (results.length === 0) {
        throw new Error("Alle KI-Durchläufe sind fehlgeschlagen (Formatfehler oder Token-Limit). Bitte versuche es noch einmal oder kürze den Text.");
      }

      const validCount = results.length;
      const finalResult = { ...results[0] };
    
      let totalGesamt = 0;
      let totalAufgabe = 0;
      let totalKohaerenz = 0;
      let totalWortschatz = 0;
      let totalStrukturen = 0;

      for (const res of results) {
        totalGesamt += res.gesamtpunkte || 0;
        totalAufgabe += res.kriterien?.aufgabenerfullung?.punkte || 0;
        totalKohaerenz += res.kriterien?.koherenz?.punkte || 0;
        totalWortschatz += res.kriterien?.wortschatz?.punkte || 0;
        totalStrukturen += res.kriterien?.strukturen?.punkte || 0;
      }

      function getStufe(punkte: number, max: number): string {
        const ratio = punkte / max;
        if (ratio >= 0.875) return 'A';
        if (ratio >= 0.625) return 'B';
        if (ratio >= 0.375) return 'C';
        if (ratio >= 0.125) return 'D';
        return 'E';
      }

      const roundToHalf = (num: number) => Math.round(num * 2) / 2;

      finalResult.gesamtpunkte = roundToHalf(totalGesamt / validCount);
      
      const maxAufgabe = teil === 1 ? 14 : 10;
      const maxKoh = teil === 1 ? 14 : 10;
      const maxWort = teil === 1 ? 16 : 10;
      const maxStruk = teil === 1 ? 16 : 10;

      if (finalResult.kriterien?.aufgabenerfullung) {
        finalResult.kriterien.aufgabenerfullung.punkte = roundToHalf(totalAufgabe / validCount);
        finalResult.kriterien.aufgabenerfullung.max = maxAufgabe;
        finalResult.kriterien.aufgabenerfullung.stufe = getStufe(finalResult.kriterien.aufgabenerfullung.punkte, maxAufgabe);
      }
      if (finalResult.kriterien?.koherenz) {
        finalResult.kriterien.koherenz.punkte = roundToHalf(totalKohaerenz / validCount);
        finalResult.kriterien.koherenz.max = maxKoh;
        finalResult.kriterien.koherenz.stufe = getStufe(finalResult.kriterien.koherenz.punkte, maxKoh);
      }
      if (finalResult.kriterien?.wortschatz) {
        finalResult.kriterien.wortschatz.punkte = roundToHalf(totalWortschatz / validCount);
        finalResult.kriterien.wortschatz.max = maxWort;
        finalResult.kriterien.wortschatz.stufe = getStufe(finalResult.kriterien.wortschatz.punkte, maxWort);
      }
      if (finalResult.kriterien?.strukturen) {
        finalResult.kriterien.strukturen.punkte = roundToHalf(totalStrukturen / validCount);
        finalResult.kriterien.strukturen.max = maxStruk;
        finalResult.kriterien.strukturen.stufe = getStufe(finalResult.kriterien.strukturen.punkte, maxStruk);
      }
      
      finalResult.allScores = results.map((r: any) => r.gesamtpunkte || 0);

      res.json(finalResult);
    } catch (error: any) {
      console.error("Evaluation error:", error);
      res.status(500).json({ error: error.message || "Something went wrong" });
    }
  });

  app.post("/api/upgrade-sentence", async (req, res) => {
    try {
      const { sentence, context, provider = "gemini", customApiKey } = req.body;

      if (!sentence) {
        return res.status(400).json({ error: "Missing sentence parameter." });
      }

      const prompt = `Du bist ein hochqualifizierter Prüfer für das Goethe-Zertifikat C1/C2.
Bitte werte diesen einen Satz aus einer Musterlösung stilistisch, grammatikalisch und im Wortschatz auf ein noch eleganteres, treffenderes und prüfungsorientierteres Niveau auf ("C1+ / C2").

Satz: "${sentence}"

Gesamtkontext zur Orientierung (optional):
"${context || '-'}"

Mache genau EINEN besten Vorschlag und erkläre in 1-2 kurzen Sätzen, was daran besser ist.

Nutze für die Ausgabe strikt dieses JSON-Format:
{
  "upgraded": "Der verbesserte Satz",
  "explanation": "Kurze Erklärung"
}`;

      let resultText = "";

      if (provider === "deepseek") {
        if (!process.env.DEEPSEEK_API_KEY && !customApiKey) {
          throw new Error("Missing DeepSeek API Key");
        }
        const dsClient = new OpenAI({
          baseURL: 'https://api.deepseek.com',
          apiKey: customApiKey || process.env.DEEPSEEK_API_KEY
        });

        const resp = await dsClient.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            {"role": "system", "content": "You are a German language expert."},
            {"role": "user", "content": prompt}
          ],
          response_format: { type: "json_object" }
        });
        resultText = resp.choices[0].message.content || "{}";
      } else {
        const aiClient = customApiKey 
            ? new GoogleGenAI({ apiKey: customApiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } }) 
            : ai; 

        const resp = await aiClient.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.3,
          }
        });
        resultText = resp.text() || "{}";
      }

      res.json(JSON.parse(resultText));
    } catch (error: any) {
      console.error("Upgrade error:", error);
      res.status(500).json({ error: error.message || "Something went wrong during upgrade" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
