// pages/api/hint.js
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function langName(code) {
  const map = { vi: 'Vietnamese', en: 'English', es: 'Spanish', fr: 'French' }
  return map[code] || code
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { question, snippet, lang = 'vi' } = req.body
    if (!question || !snippet) return res.status(400).json({ error: 'Missing question or snippet' })

    const fullPrompt = `
You are a helpful tutor. Given a question and its source text (snippet), produce 1 short hint (1-2 short sentences) in ${langName(lang)} that helps the student think toward the answer without revealing the correct answer explicitly.
Question:
${question}

Source text:
${snippet}

Return ONLY the hint as plain text.
`.trim()

    const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview'

    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: fullPrompt }] }],
      temperature: 0.2,
      maxOutputTokens: 200
    })

    let text = response?.text || response?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text || ''
    if (!text && response?.candidates?.[0]) {
      try {
        const cand = response.candidates[0]
        const parts = []
        for (const block of cand.content || []) {
          if (block?.parts) for (const p of block.parts) parts.push(p.text || '')
        }
        text = parts.join('\n')
      } catch (e) {}
    }
    text = (text || '').trim()
    // strip code fences
    text = text.replace(/(^|\n)```[a-zA-Z]*\n?|```$/g, '').trim()
    return res.status(200).json({ hint: text })
  } catch (err) {
    console.error('hint err', err)
    return res.status(500).json({ error: 'Server error', detail: String(err) })
  }
}
