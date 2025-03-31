import axios from "axios";

function chunkText(text, maxTokens = 2000) {
  const words = text.split(" ");
  let chunks = [];
  let chunk = [];

  for (let word of words) {
    if (chunk.join(" ").length + word.length > maxTokens) {
      chunks.push(chunk.join(" "));
      chunk = [];
    }
    chunk.push(word);
  }
  if (chunk.length > 0) chunks.push(chunk.join(" "));

  return chunks;
}

async function callOpenAI(payload, headers) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      payload,
      { headers }
    );

    // Extract JSON safely
    const content = response.data.choices[0].message.content.trim();
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    return jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(content);
  } catch (error) {
    console.error("OpenAI Error:", error.response?.data || error.message);
    throw new Error("Failed to process AI request");
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { parsedText, url } = req.body;
  if (!parsedText || !url) {
    return res.status(400).json({ error: "Missing parsed text or URL" });
  }

  try {
    console.log("Splitting parsed text...");
    const chunks = chunkText(parsedText);

    console.log(`Sending ${chunks.length} chunks to GPT-4...`);
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    };

    let tables = [];
    for (let chunk of chunks) {
      console.log("Processing chunk...");
      const payload = {
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: "Extract a JSON table of maintenance schedules." },
          {
            role: "user",
            content: `Here is the maintenance schedule section from a vehicle manual:\n\n${chunk}\n\nExtract only a JSON table with columns: "name" (task) and "frequency" (how often). Format it as JSON:`,
          },
        ],
      };

      const table = await callOpenAI(payload, headers);
      tables.push(...table); // Combine tables
    }

    res.status(200).json({ table: tables });
  } catch (error) {
    console.error("Table Generation Error:", error);
    res.status(500).json({ error: `Failed to generate table: ${error.message}` });
  }
}
