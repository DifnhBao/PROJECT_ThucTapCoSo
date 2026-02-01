"use client";
import React, { useRef, useEffect } from "react";

interface HorizontalScrollProps {
  children: React.ReactNode;
  scrollAmount?: number;
  onReachEnd?: () => void;
}

const HorizontalScroll: React.FC<HorizontalScrollProps> = ({
  children,
  scrollAmount = 1000,
  onReachEnd,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  useEffect(() => {
    if (!onReachEnd || !scrollRef.current) return;

    const el = scrollRef.current;

    const handleScroll = () => {
      const threshold = 200; 
      const isNearEnd =
        el.scrollLeft + el.clientWidth >= el.scrollWidth - threshold;

      if (isNearEnd) {
        onReachEnd();
      }
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [onReachEnd]);

  return (
    <div
      className="horizontal-scroll-container"
      style={{ position: "relative" }}
    >
      <button className="banner-btn left" onClick={scrollLeft}>
        <i className="fa-solid fa-chevron-left"></i>
      </button>

      {/* Nội dung cuộn ngang */}
      <div
        ref={scrollRef}
        className="scroll-content"
        style={{
          display: "flex",
          overflowX: "auto",
          scrollBehavior: "smooth",
          gap: "1rem",
        }}
      >
        {children}
      </div>
      <button className="banner-btn right" onClick={scrollRight}>
        <i className="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  );
};

export default HorizontalScroll;
