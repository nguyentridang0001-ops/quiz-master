// pages/api/generate-quiz.js
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function languageName(code) {
  const map = { vi: 'Vietnamese', en: 'English', es: 'Spanish', fr: 'French' }
  return map[code] || code
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { snippets, numQuestions = 10, types = ["mc"], lang = 'vi' } = req.body;

    if (!snippets || !Array.isArray(snippets) || snippets.length === 0) {
      return res.status(400).json({ error: "Provide an array of snippets" });
    }

    const langName = languageName(lang)

    const systemPrompt = `
You are an assistant that converts educational text into quizzes.
Return EXACTLY the structured JSON described below and ONLY the JSON.

Top-level JSON:
{
  "quizzes": [
    {
      "questions": [
        {
          "type": "mc" | "tf" | "short",
          "question": "string",
          "options": { "A": "...", "B": "...", "C": "...", "D": "..." }, // present for mc
          "answer": "A" or "B" or "C" or "D" for mc, "A" or "B" for tf (A=True,B=False), or a short text for short,
          "explanation": "short string"
        }
      ]
    }
  ]
}

Rules:
- For each input snippet produce exactly ${numQuestions} questions.
- Use only the requested types: ${types.join(', ')}.
- Answer language: produce questions, options, and explanations in ${langName}.
- If type is 'tf', use options A=True, B=False (include options object with A and B).
- For 'short' provide an expected short answer in 'answer' (a few words).
- Ensure correct answers can be determined from the snippet. Do not invent facts outside the snippet.
- Output must be valid JSON with no extra commentary or markdown.
`.trim();

    const userPrompt = `Create quizzes for the following snippets. Return ONLY the JSON described.\n\n` +
      snippets.map((s, i) => `--- SNIPPET ${i + 1} ---
${s}
`).join('\n');

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    const model = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

    const response = await ai.models.generateContent({
      model,
      contents: [
        { parts: [{ text: fullPrompt }] }
      ],
      temperature: 0.15,
      maxOutputTokens: 2000,
    });

    let text =
      response?.text ||
      response?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text ||
      "";

    if (!text && response?.candidates?.[0]) {
      try {
        const cand = response.candidates[0];
        const parts = [];
        for (const block of cand.content || []) {
          if (block?.parts) for (const p of block.parts) parts.push(p.text || "");
        }
        text = parts.join("\n");
      } catch (e) { /* ignore */ }
    }

    if (!text) return res.status(500).json({ error: "Empty response from Gemini", raw: response });

    let parsed = null;
    try { parsed = JSON.parse(text) } catch (e) {
      const cleaned = text.replace(/(^|\n)```[a-zA-Z]*\n?|```$/g, '').trim()
      try { parsed = JSON.parse(cleaned) } catch (e2) {
        return res.status(500).json({ error: "Could not parse model output as JSON", raw: text })
      }
    }

    if (!parsed || !Array.isArray(parsed.quizzes)) {
      return res.status(500).json({ error: "Model returned invalid JSON structure", raw: parsed })
    }

    parsed.quizzes = parsed.quizzes.map((qObj) => {
      const qarr = (qObj.questions || []).map((q) => {
        const type = q.type || 'mc';
        return {
          type,
          question: q.question || '',
          options: q.options || (type === 'tf' ? { A: 'True', B: 'False' } : { A: '', B: '', C: '', D: '' }),
          answer: q.answer || (type === 'tf' ? 'A' : 'A'),
          explanation: q.explanation || ''
        }
      })
      return { questions: qarr }
    });

    return res.status(200).json({ quizzes: parsed.quizzes });
  } catch (err) {
    console.error('Server error (Gemini):', err);
    return res.status(500).json({ error: 'Server error', detail: String(err) });
  }
}
