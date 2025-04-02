export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { year, make, model, color } = req.body;

  if (!year || !make || !model || !color) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const prompts = [
      `A front view of a ${color} ${year} ${make} ${model} car, taken in a professional photoshoot style on a plain white background.`,
      `A right side view of a ${color} ${year} ${make} ${model} car, taken in a professional photoshoot style on a plain white background.`,
      `A front 3/4 view of a ${color} ${year} ${make} ${model} car, taken in a professional photoshoot style on a plain white background.`,
    ];

    const images = [];

    for (const prompt of prompts) {
      console.log("Generating image with prompt:", prompt); // Debug log

      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // Ensure this is set in your .env.local file
        },
        body: JSON.stringify({
          prompt,
          n: 1,
          size: "512x512",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || "Failed to generate image");
      }

      const data = await response.json();
      images.push(data.data[0].url);
    }

    console.log("Images generated successfully:", images); // Debug log
    res.status(200).json({ images });
  } catch (error) {
    console.error("Error generating images:", error.message); // Log error message
    res.status(500).json({ error: error.message || "Failed to generate images" });
  }
}
