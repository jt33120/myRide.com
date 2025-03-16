import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    console.log("Received request:", req.body); // Debugging log

    const { userEmail, topic, message } = req.body;

    // Check if the email exists (sent from frontend)
    if (!userEmail) {
      console.error("Error: No user email provided!");
      return res.status(400).json({ message: 'No user email provided!' });
    }

    try {
      // Configure Nodemailer
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'julian.talou33@gmail.com',
          pass: 'tbjg agdv jvso djyt', // Use your generated App Password
        },
      });

      // Email options
      const mailOptions = {
        from: userEmail, // Set user's email as sender
        to: 'frenchy.bikerusa@gmail.com', // Recipient email
        subject: topic || "No Subject", // Use topic or default
        text: message || "No message provided", // Ensure message is not empty
      };

      console.log("Sending email:", mailOptions); // Debugging log

      // Send email
      await transporter.sendMail(mailOptions);
      console.log("Email sent successfully!");

      res.status(200).json({ message: 'Email sent successfully!' });

    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ message: 'Failed to send email', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
