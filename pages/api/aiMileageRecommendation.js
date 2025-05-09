import { Configuration, OpenAIApi } from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { mileage, engine, model, year } = req.body;
  if (!mileage || !engine || !model || !year) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    const prompt = `I own a ${year} ${model} with a ${engine} engine and ${mileage} km. Give me a personalized maintenance recommendation for this mileage.`;

    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    });

    const recommendation = completion.data.choices[0].message.content.trim();
    res.status(200).json({ recommendation });
  } catch (e) {
    res.status(500).json({ error: "AI error: " + e.message });
  }
}
