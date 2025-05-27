import React, { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MagnifyingGlassIcon,
  WrenchIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import { CarFront } from "lucide-react";

const SLIDE_DATA = [
  {
    key: "INTRO",
    title: "WELCOME",
    graphic: "/welcome.png",
    headline: "MyRideYour all-in-one garage & marketplace.",
    desc: "Your vehicle is one of your most important assets. Unlike other assets, it depreciates. Limiting that depreciation is challenging — even professionals struggle with it. At MyRide, we make it easy for everyone.",
  },
  {
    key: "TRACK",
    title: "TRACK",
    graphic: "/track.png",
    headline: "Save all your receipts related to all your vehicles",
    desc: "The AI tracks your spending on repairs, modifications, and regular maintenance — and guides you on exactly what maintenance task to perform next.",
  },
  {
    key: "OPTIMISE",
    title: "OPTIMIZE",
    graphic: "/optimise.png",
    headline: "AI-support car valuation and tracking over time",
    desc: "Our AI gives you an accurate, real-time estimate of your car’s value based on its condition, maintenance, and usage. Track it over time and get tips to boost it — no more lowball offers.",
  },
  {
    key: "SELL",
    title: "SELL",
    graphic: "/sell.png",
    headline: "Add a vehicle in 30sec. List it in 10sec.",
    desc: "We’re building the safest vehicle marketplace ever. With full maintenance records, invite-only access, and crypto-enabled smart transactions, we ensure a trusted community of serious buyers and sellers.",
  },
];

export default function WelcomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const containerRef = useRef(null);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setCurrentSlide(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <>
      {/* MOBILE ONLY */}
      <section className="relative h-screen bg-[url(/fond-mobil.png)] bg-cover bg-center md:hidden">
        {/* Overlay sombre */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Barre de progression */}
        <div className="absolute left-0 right-0 flex px-6 space-x-2 top-6">
          {SLIDE_DATA.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-2xl transition-colors ${
                i === currentSlide ? "bg-purple-500" : "bg-gray-700/40"
              }`}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col h-full px-6 pt-16 pb-8">
          {/* Logo */}
          <div className="flex items-center mb-4">
            <Image
              src="/logoWB.png"
              alt="MyRide"
              width={94}
              height={94}
              className="w-12 h-auto" // Tailwind fixes width, height auto
              style={{ height: "auto" }} // ensure aspect ratio
            />
            <span className="ml-3 text-2xl font-bold text-white">MyRide</span>
          </div>
          <h1 className="mb-4 text-5xl font-bold text-white">
            Track. Optimize.
            <br />
            Sell for more.
          </h1>
          {/* Carousel */}
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex flex-1 overflow-x-auto snap-x snap-mandatory no-scrollbar"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {SLIDE_DATA.map((slide) => {
              const Icon = {
                INTRO: CarFront,
                TRACK: MagnifyingGlassIcon,
                OPTIMISE: WrenchIcon,
                SELL: ArrowTrendingUpIcon,
              }[slide.key];
              return (
                <div
                  key={slide.key}
                  className="flex flex-col items-center flex-shrink-0 w-full px-4 text-center snap-start"
                >
                  <h2 className="w-full mt-10 mb-4 text-3xl font-semibold text-center text-white uppercase border-b-2 rounded-3xl">
                    {slide.title}
                  </h2>
                  <div className="flex flex-col items-center gap-2 mx-auto mt-2">
                    <div className="p-4 rounded-lg bg-zinc-500 bg-opacity-70">
                      <Icon className="w-8 h-8 mx-auto mb-2 " />
                      <p className="text-white">{slide.headline}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-zinc-500 bg-opacity-70">
                      <p className="text-white">{slide.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Link
            href="/signup_page"
            className="absolute inset-x-0 w-3/4 py-3 mx-auto text-center text-white bg-purple-600 rounded-xl bottom-16"
          >
            Get Started
          </Link>
        </div>
      </section>
      {/* FIN HOME MOBILE */}
    </>
  );
}
