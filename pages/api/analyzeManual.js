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
      prompt = ` You are an maintenance expert. You need to do this tasks in order: 
        -Based on the owner manual, that you can find here :  url_ownermanual = ${url}.
        Extract the maintenance schedule, and create a table of maintenance with columns Categories | Frequency (in miles, 1 year = 15000 miles) | LastMileageDone | NextMileageComing.
        -Fill the columns 'Categories', 'Frequency' with the maintenance schedule. Be very exhaustive.
        Now , the current mileage for the vehicle is currentMileage =  ${mileage} miles.

        -Your output is a global checkup adapted to the currentMileage for this vehicle (url_ownermanual) as such:
        "No maintenance history yet. Global checkup for your mileage : [action + category adapted to this mileage]". The output should be anything else, the table is for you to get the right information. The output is a snapshot for the vehicle's owner
      `;
    } else {
      // Handle case with receipts
      prompt = ` You are an maintenance expert. You need to do this tasks in order: 
        -Based on the owner manual, that you can find here :  url_ownermanual = ${url}.
        Extract the maintenance schedule, and create a table of maintenance with columns Categories | Frequency (in miles, 1 year = 15000 miles) | LastMileageDone | NextMileageComing.
        -Fill the columns 'Categories', 'Frequency' with the maintenance schedule. Be very exhaustive.
        -Now, we gonna fill the column 'LastMileageDone' by interpreting the maintenance history from the receipts : 
        ${JSON.stringify(receipts.map((r) => ({ title: r.title, mileage: r.mileage })), null, 2)}. If you don't find any information for a category, you can leave it blank.
        -Finally, fill the column 'NextMileageComing' by calculating the next mileage by adding the corresponding frequency to the 'LastMileageDone'. Again, if 'LastMileageDone' is blank, leave this blank as well.
        Now , the current mileage for the vehicle is currentMileage =  ${mileage} miles.
        -Your output is this three information (don't display anything else,; it's a snapshot ofr the owner):
        1. Select one category that is the closest superior to currentMileage (compare column 'NextMileageComing' with 'currentMileage'). Like this : "Most urgent to come : [Category] at [value in 'NextMileageComing'] miles."
        2. Add a warning for all maintenance missing history : list of all categories with blank value in column 'NextMileageComing (so called blank_categories). Like this "Caution, no history found for : [list of blank_categories]. We recommend checking them"
        3. Maintenance grade. grade =  count of non empty categories in 'NextMileageComing' / count of all categories . Like this "Maintenance Grade : [grade]" as a percentage.
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

