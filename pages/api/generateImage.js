import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { vehicleDetails } = req.body;

  if (!vehicleDetails || !vehicleDetails.make || !vehicleDetails.year || !vehicleDetails.model || !vehicleDetails.color) {
    return res.status(400).json({ error: "Missing required vehicle details (make, year, model, color)." });
  }

  try {
    // Generate the prompt
    const prompt = `Create a packaging style image "Hot Wheels" like a collectible figure. The figurine is a ${vehicleDetails.color.toUpperCase()} ${vehicleDetails.make.toUpperCase()} ${vehicleDetails.model.toUpperCase()} from ${vehicleDetails.year}. 
    The box is made of molded transparent plastic, inserted in a cardboard background that is a hot-wheel like flames and packaging with a minimalist and clean look. The vehicle is represented in the form of a stylized 3D figurine, a cartoon but realistic style that is placed in a recess in the center-left, left-side view.
    The image should depict a figurine-like version of this vehicle.
    The vehicle is displayed in a left side view, perfectly centered so you can see the whole vehicle. The image should be well-reproduced in a professional style, making it look like a real miniature figurine of the vehicule.`;

    console.log("Generated prompt for OpenAI:", prompt);

    // Call OpenAI API using axios
    const aiResponse = await axios.post(
      "https://api.openai.com/v1/images/generations",
      {
        prompt,
        n: 1, // Generate one image
        size: "1024x1024", // Set the image size
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // Use the OpenAI API key
        },
      }
    );

    const aiImageUrl = aiResponse.data.data[0].url; // Extract the image URL
    console.log("AI-generated image URL:", aiImageUrl);

    res.status(200).json({ aiImageUrl });
  } catch (error) {
    console.error("Error generating AI image:", error.message);

    // Log the full error for debugging
    console.error("Full error details:", error);

    res.status(500).json({ error: `Failed to generate AI image: ${error.message}` });
  }
}
