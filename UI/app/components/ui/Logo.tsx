import React from "react";

const Logo = ({ size = 40 }: { size?: number }) => {
  return (
    <div className="logo-wrapper">
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className="music-logo"
      >
        <defs>
          <linearGradient id="btGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff7e3a" />
            <stop offset="100%" stopColor="#73391a" />
          </linearGradient>
        </defs>

        {/* Lớp nền đĩa */}
        <circle cx="100" cy="100" r="95" fill="#1c0e06" />

        {/* Các đường rãnh đĩa than */}
        {[80, 70, 60].map((r) => (
          <circle
            key={r}
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke="#ffffff20"
            strokeWidth="1"
          />
        ))}

        {/* Biểu tượng chính */}
        <path d="M80 65 L140 100 L80 135 Z" fill="url(#btGradient)" />
        <path
          d="M75 65 Q60 65 60 82 L60 118 Q60 135 75 135"
          fill="none"
          stroke="url(#btGradient)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M55 65 L90 65"
          fill="none"
          stroke="url(#btGradient)"
          strokeWidth="10"
          strokeLinecap="round"
        />

        <circle cx="100" cy="100" r="10" fill="#ffffff" />
      </svg>

      <style jsx>{`
        .logo-wrapper {
          display: inline-block;
          cursor: pointer;
        }
        .music-logo {
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .logo-wrapper:hover .music-logo {
          transform: rotate(180deg);
        }
      `}</style>
    </div>
  );
};

export default Logo;
