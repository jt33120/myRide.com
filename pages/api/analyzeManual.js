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
      prompt = ` You are an maintenance expert.
        Based on the owner manual, that you can find at thir url : ${url}.
        The history of what has been done to the vehicle (to know what is mising, or to adjust the frequency of some maintenance tasks) : 
        ${JSON.stringify(receipts.map((r) => ({ title: r.title, mileage: r.mileage })), null, 2)},
        And the current mileage of the vehicle : ${mileage} miles.
        You need to tell the owner what he is gonna have to do next, to be sure that his vehicle is safe, and completely up-to-date with the owner manual.
        Your primary tool is the user manual, what should be done at this stage, then you can adjust with the real history of maintenance of the vehicle 
        (to adjust mileage of regular maintenance task for example). Obviously, you can't recommend a task at mileage inferior to the current one!
        Your output should follow this exact format:
      "- To do: [Task name other than oil change] ([Mileage] miles). Recommended (check/inspect): [Task name] at [Mileage] miles.
      - Next oil change: at [Mileage] miles" (based on current mileage, last known oil change, and the frequency specified in the owner's manual).
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

