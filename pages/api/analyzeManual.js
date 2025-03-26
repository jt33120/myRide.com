export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, receipts, mileage } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    let prompt;

    if (!receipts || !Array.isArray(receipts) || receipts.length === 0) {
      // Handle case with no receipts
      prompt = `
        Analyze the owner's manual available at the following URL: ${url}.
        There are no maintenance receipts provided. Based on the vehicle's mileage (${mileage} miles):
        - If the mileage is less than 1000, assume the vehicle is new and recommend starting with the initial maintenance tasks from the owner's manual.
        - If the mileage is higher than 1000, assume the vehicle has just been purchased recently and recommend an appropriate checkup for the vehicle's mileage.
        Your output should be concise and informative, no more than 200 characters. For example: "Vehicle just purchased, recommend to check...".
      `;
    } else {
      // Handle case with receipts
      prompt = ` In 100 characters output.
        Compare the owner's manual maintenance schedule, available at the following URL: ${url}.
        with the maintenance history available through the receipts provided by the vehicle owner:
        ${JSON.stringify(receipts.map((r) => ({ title: r.title, mileage: r.mileage })), null, 2)},
        These receipts are what the owner did and at which mileage he did it. The current vehicle mileage is : ${mileage} miles.
        From this comparison, provide recommendations for the upcoming maintenance tasks, as such :
        - Mandatory  : ... at ... miles. Recommended : ... at ... miles. Check (Inspect/Adjust) : ... at ...
        - Next oil change at ... miles (ajust based on the receipts from last time it has been done and the frequency provided by the user manual)
      `;
    }

    console.log('Constructed Prompt:', prompt);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
      }),
    });

    const data = await response.json();
    console.log('OpenAI API Response:', data);

    if (response.ok) {
      const recommendations = data.choices?.[0]?.message?.content.trim() || '';
      res.status(200).json({ recommendations });
    } else {
      res.status(response.status).json({ error: data.error?.message || 'Unknown error' });
    }
  } catch (error) {
    console.error('Error analyzing manual:', error);
    res.status(500).json({ error: 'Failed to analyze the owner manual.' });
  }
}

