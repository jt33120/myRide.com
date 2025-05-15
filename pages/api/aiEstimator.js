import { db } from '../../lib/firebase'; // Ensure you have Firebase initialized
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { make, model, year, mileage, city, state, zip, color, title, vehicleId } = req.body;

  if (!make || !model || !year || !mileage || !city || !state || !zip || !color || !title || !vehicleId) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const vehicleRef = doc(db, 'listing', vehicleId); // Replace 'listing' with your Firestore collection name
    const vehicleDoc = await getDoc(vehicleRef);

    if (!vehicleDoc.exists()) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    // Generate the AI estimation
    const prompt = `
      Based on the current market trends, provide a reasonable and robust estimation of the value for the following vehicle:
            - Make: ${make}
            - Model: ${model}
            - Year: ${year}
            - Mileage: ${mileage || 'Unknown'}
            - Color: ${color || 'Unknown'}
            - Title Status: ${title || 'Unknown'}
            - Location: ${city || 'Unknown'}, ${state || 'Unknown'}, ${zip || 'Unknown'}
      Consider factors such as depreciation, market trends, and mileage, and current data online to provide the most accurate estimated value for this vehicle, in US number format. Your answer should be: "AI-powered valuation : $..."
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
      const estimationText = data.choices?.[0]?.message?.content.trim() || '';
      const estimationMatch = estimationText.match(/\$([\d,]+)/); // Extract the numeric value
      const estimation = estimationMatch ? estimationMatch[1].replace(/,/g, '') : null;

      if (!estimation) {
        console.error('Failed to parse AI estimation.');
        return res.status(400).json({ error: 'Failed to parse AI estimation.' });
      }

      // Format the new element for `ai_estimated_value`
      const currentDate = new Date();
      const formattedDate = `${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}-${currentDate.getFullYear()}`;
      const newElement = `${estimation}-${formattedDate}`;

      // Ensure only valid strings are saved and replace the same day's value
      const existingData = vehicleDoc.data().ai_estimated_value || [];
      const filteredData = existingData.filter((item) => !item.endsWith(`-${formattedDate}`)); // Remove existing value for today
      const updatedData = [...filteredData, newElement]; // Add the new value

      // Update Firestore
      await updateDoc(vehicleRef, {
        ai_estimated_value: updatedData,
      });

      // Return the new element
      res.status(200).send(newElement);
    } else {
      console.error('Error from OpenAI API:', data.error?.message || 'Unknown error');
      return res.status(response.status).json({ error: data.error?.message || 'Unknown error' });
    }
  } catch (error) {
    console.error('Error fetching AI estimation:', error);
    res.status(500).json({ error: 'Failed to fetch AI estimation.' });
  }
}