
import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "h-8" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 140 110" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Fact Bubble (Green) */}
      <path 
        d="M10 10C4.47715 10 0 14.4772 0 20V65C0 70.5228 4.47715 75 10 75H18L10 100L35 75H75C80.5228 75 85 70.5228 85 65V20C85 14.4772 80.5228 10 75 10H10Z" 
        fill="#88d43c"
      />
      <text 
        x="13" 
        y="50" 
        fill="white" 
        style={{ font: 'bold 22px sans-serif', letterSpacing: '1px' }}
      >
        FACT
      </text>

      {/* Check Bubble (Red) */}
      <path 
        d="M50 40C44.4772 40 40 44.4772 40 50V90C40 95.5228 44.4772 100 50 100H105L130 110L122 100H130C135.523 100 140 95.5228 140 90V50C140 44.4772 135.523 40 130 40H50Z" 
        fill="#e42424"
      />
      <text 
        x="48" 
        y="78" 
        fill="white" 
        style={{ font: 'bold 20px sans-serif', letterSpacing: '1px' }}
      >
        CHECK
      </text>
    </svg>
  );
};

export default Logo;
