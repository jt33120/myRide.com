export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, vehicleDetails } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  if (!vehicleDetails || !vehicleDetails.make || !vehicleDetails.model || !vehicleDetails.year) {
    return res.status(400).json({ error: 'Vehicle details (make, model, year) are required.' });
  }

  try {
    const vehicleContext = `
      Vehicle Details:
      - Make: ${vehicleDetails.make}
      - Model: ${vehicleDetails.model}
      - Year: ${vehicleDetails.year}
      - Mileage: ${vehicleDetails.mileage || 'Unknown'}

    `;

    const fullPrompt = `
      ${vehicleContext}
      User Question: ${prompt}
      You are a maintenance helper for this vehicle owner. Answer the user question as accurately as posible.
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: 1500,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      const answer = data.choices?.[0]?.message?.content.trim() || '';
      res.status(200).json({ answer });
    } else {
      res.status(response.status).json({ error: data.error?.message || 'Unknown error' });
    }
  } catch (error) {
    console.error('Error processing AI maintenance prompt:', error);
    res.status(500).json({ error: 'Failed to process the AI maintenance prompt.' });
  }
}
