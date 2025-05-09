import React from 'react';
import Slider from 'react-slick';
import Image from 'next/image';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

export default function ImageCarousel({ imageUrls }) {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
  };
  return (
    <div className="my-6">
      <Slider {...settings}>
        {imageUrls.map((url, idx) => (
          <div key={idx} className="relative h-64">
            <Image
              src={url}
              alt={`Vehicle photo ${idx + 1}`}
              layout="fill"
              objectFit="cover"
            />
          </div>
        ))}
      </Slider>
    </div>
  );
}