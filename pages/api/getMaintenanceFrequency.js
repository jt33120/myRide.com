import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { year, make, model, type, url } = req.body;

  if (!year || !make || !model || !type || !url) {
    return res.status(400).json({ error: "Missing year, make, type, model, or URL" });
  }

  try {
    console.log("Sending data to OpenAI...");

    // Define prompts for MOTORCYCLE and CAR
    const prompts = {
      motorcycle: `You are an API for a maintenance planner, creating tables. Given the following motorcycle details:
- Year: ${year}
- Make: ${make}
- Model: ${model}
- URL of owner manual: ${url}

Please build a JSON table with four columns (the two last are empty): Task | Frequency | LastTimeDone | NextTimeToDo
Fill the first column with the name of the following tasks:
- Oil Change
- Oil Filter Replacement
- Spark Plug
- Air Filter
- Tire
- Brake Pad
- Brake Fluid Flush
- Coolant
- Battery
- Chain
- Fork & Suspension
- Throttle & Clutch

Please fill the second column with the frequency in miles or years (just write the number 15000 or 2Y for years, be systematic). Your output should be the JSON table, nothing else.`,

      car: `You are an API for a maintenance planner, creating tables. Given the following car details:
- Year: ${year}
- Make: ${make}
- Model: ${model}
- URL of owner manual: ${url}

Please build a JSON table with four columns (the two last are empty): Task | Frequency | LastTimeDone | NextTimeToDo
Fill the first column with the name of the following tasks:
- Oil Change
- Oil Filter Replacement
- Spark Plug Replacement
- Engine Air Filter Replacement
- Cabin Air Filter Replacement
- Tire Rotation
- Brake Pad Replacement
- Brake Fluid Flush
- Coolant Replacement
- Battery Check/Replacement
- Transmission Fluid Change
- Power Steering Fluid Check
- Timing Belt/Chain Inspection
- Suspension & Shocks Inspection
- Wheel Alignment

Please fill the second column with the frequency in miles or years (just write the number, e.g., 15000 for miles or 2Y for years, be systematic). Your output should be the JSON table, nothing else.`,
    };

    // Select the appropriate prompt based on the type
    const prompt = prompts[type];
    if (!prompt) {
      return res.status(400).json({ error: "Invalid type. Must be 'MOTORCYCLE' or 'CAR'." });
    }

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const aiResponse = response.data.choices[0].message.content.trim();
    console.log("AI Response:", aiResponse);

    res.status(200).json({ response: aiResponse });
  } catch (error) {
    console.error("Error during OpenAI request:", error);
    res.status(500).json({ error: `Failed to get AI response: ${error.message}` });
  }
}
