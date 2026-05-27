"use client";

import "@/app/styles/banner-category.css";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const BANNERS = [
  { id: 0, src: "/images/Banner/bringmusictolife.jpg", alt: "Bring Music To Life" },
  { id: 1, src: "/images/Banner/banner_music_premium.png", alt: "Premium Music Stream" },
  { id: 2, src: "/images/Banner/banner_music_chill.png", alt: "Chill Lo-Fi Vibes" },
  { id: 3, src: "/images/Banner/banner_music_trending.png", alt: "Trending Pop Hits" },
];

function Banner() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNERS.length);
    }, 7000); // Tự động chuyển sau 5s
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="banner-section">
      {/* Banner chính */}

      <div className="banner-container" style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>
        {BANNERS.map((banner, index) => (
          <div 
            key={banner.id}
            className="banner-item"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: index === currentSlide ? 1 : 0,
              transition: 'opacity 0.8s ease-in-out, transform 4s ease-out',
              transform: index === currentSlide ? 'scale(1)' : 'scale(1.05)',
              zIndex: index === currentSlide ? 1 : 0,
            }}
          >
            <img
              src={banner.src}
              alt={banner.alt}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ))}
        {/* Navigation Dots */}
        <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 2 }}>
          {BANNERS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              style={{
                width: index === currentSlide ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: index === currentSlide ? '#fff' : 'rgba(255,255,255,0.4)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              title={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Category Section */}
      <div className="category-grid">
        <div className="category-card" style={{ backgroundColor: "#b87933" }}>
          <h3>Indie Việt</h3>
          <img src="/images/Banner/indieViet.png" alt="" />
        </div>

        <div className="category-card" style={{ backgroundColor: "#d94a5b" }}>
          <h3>Yêu</h3>
          <img src="/images/Banner/yeu.png" alt="" />
        </div>

        <div className="category-card" style={{ backgroundColor: "#43b144" }}>
          <h3>Nhạc Dance</h3>
          <img src="/images/Banner/nhacdance.png" alt="" />
        </div>

        <div className="category-card" style={{ backgroundColor: "#692f98" }}>
          <h3>Nhạc Pop</h3>
          <img src="/images/Banner/nhacpop.png" alt="" />
        </div>

        <div className="category-card" style={{ backgroundColor: "#2b7b77" }}>
          <h3>Ngủ Ngon</h3>
          <img src="/images/Banner/ngungon.jpg" alt="" />
        </div>

        <div className="category-card" style={{ backgroundColor: "#e39a78" }}>
          <h3>Chill</h3>
          <img src="/images/Banner/chill.png" alt="" />
        </div>

        <div className="category-card" style={{ backgroundColor: "#3e3e3e" }}>
          <h3>Hip-Hop/R&B</h3>
          <img src="/images/Banner/hip-hop.png" alt="" />
        </div>

        <div className="category-card" style={{ backgroundColor: "#da6c34" }}>
          <h3>Nhạc Trung</h3>
          <img src="/images/Banner/nhacTrung.jpg" alt="" />
        </div>

        <div className="category-card" style={{ backgroundColor: "#345061" }}>
          <h3>Tập Luyện</h3>
          <img src="/images/Banner/tapluyen.png" alt="" />
        </div>

        <div className="category-card" style={{ backgroundColor: "#c38d53" }}>
          <h3>Acoustic Việt</h3>
          <img src="/images/Banner/acousticViet.png" alt="" />
        </div>
      </div>
    </div>
  );
}

export default Banner;
