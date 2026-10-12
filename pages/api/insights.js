import OpenAI from "openai";

const openai = new OpenAI(); // reads OPENAI_API_KEY from the environment

const SYSTEM =
  "You are the AI analyst inside a data visualization app. " +
  "Answer ONLY from the dataset and chart data provided in the context. " +
  "Be concise: at most 3 short bullet points or 2 sentences, under 60 words total. " +
  "Use plain text with '•' bullets, no Markdown symbols. Quote real numbers from the data. " +
  "If the context doesn't contain the answer, say so briefly and suggest which chart to look at. " +
  "Remember that survey or observational data shows patterns, not proven causes.";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { messages = [], context = {} } = req.body || {};
  if (!messages.length) return res.status(400).json({ error: "Please ask a question." });

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      max_tokens: 200,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "system", content: `Context (JSON): ${JSON.stringify(context).slice(0, 12000)}` },
        ...messages.slice(-8),
      ],
    });
    res.status(200).json({ result: completion.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: "AI error: " + err.message });
  }
}
