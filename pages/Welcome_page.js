import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from 'next/link';

export default function WelcomePage() {
  const router = useRouter();

  const slides = [
    { 
      title: "🚗 Keep track of your vehicle maintenance", 
      text: "Do you know that having a receipt book can increase your resale value up to 20%? Thanks to our AI guidelines, gather your receipts in your vehicle book and never miss a maintenance!"
    },
    { 
      title: "💭 The safest marketplace for used vehicles", 
      text: "Tired of blocking lowballers? Tired of driving hours to see lemons? Tired of dealerships offering peanuts for your car? We're here for you! 👌"
    },
    { 
      title: "⚙️ Beta Version, coming soon :", 
      text: `
        - 💰 Smart Transactions
        - 🔎 AI-Powered Car Search
        - 🛠️ AI-Powered Maintenance Advice
        - 🛡️ Trusted Community
        - 💎 Crypto Ready
      `
    }
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-slide effect every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length]);

  // Handle click on a specific dot
  const handleDotClick = (index) => {
    setCurrentSlide(index);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">

      {/* Slider Section */}
      <div className="relative w-full max-w-2xl mx-auto mt-10 h-60 overflow-hidden text-center">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute w-full transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <h2 className="text-3xl font-semibold text-purple-700">{slide.title}</h2>
            <p className="mt-4 text-lg px-4 whitespace-pre-line">{slide.text}</p>
          </div>
        ))}
      </div>

      {/* Carousel Dots */}
      <div className="flex justify-center mt-4">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`w-4 h-4 mx-2 rounded-full ${index === currentSlide ? 'bg-purple-700' : 'bg-gray-300'}`}
            onClick={() => handleDotClick(index)}
          />
        ))}
      </div>

      {/* Sign-Up Button */}
      <div className="mt-10 text-center">
        <Link href="/signup_page">
          <button className="btn w-60">Sign Up 🚀</button>
        </Link>
      </div>

      {/* Already a member? Sign in Link */}
      <div className="mt-4 text-center text-sm text-gray-500">
        <p>
          Already a member?{" "}
          <span 
            className="text-purple-700 cursor-pointer" 
            onClick={() => router.push("/login_page")}
          >
            Sign In
          </span>
        </p>
      </div>
    </div>
  );
}