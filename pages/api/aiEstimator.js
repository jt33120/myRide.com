export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { make, model, year, mileage } = req.body;

  if (!make || !model || !year) {
    return res.status(400).json({ error: 'Make, model, and year are required.' });
  }

  try {
    const prompt = `
      Based on the current market trends, provide a reasonable and robust estimation of the value for the following vehicle:
      - Make: ${make}
      - Model: ${model}
      - Year: ${year}
      - Mileage: ${mileage || 'Unknown'}
      Consider factors such as depreciation, market trends, and mileage. Provide the estimated value in USD. You're answer should be:  "AI-based Value estimation : $..."
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      const estimation = data.choices?.[0]?.message?.content.trim() || '';
      res.status(200).json({ estimation });
    } else {
      res.status(response.status).json({ error: data.error?.message || 'Unknown error' });
    }
  } catch (error) {
    console.error('Error fetching AI estimation:', error);
    res.status(500).json({ error: 'Failed to fetch AI estimation.' });
  }
}
