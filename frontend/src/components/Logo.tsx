import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 40 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer rounded square border */}
      <rect 
        x="5" 
        y="5" 
        width="90" 
        height="90" 
        rx="15" 
        ry="15" 
        fill="currentColor"
        stroke="none"
      />
      
      {/* Inner white background */}
      <rect 
        x="12" 
        y="12" 
        width="76" 
        height="76" 
        rx="8" 
        ry="8" 
        fill="white"
      />
      
      {/* Letter 'B' */}
      {/* Vertical line of B */}
      <rect 
        x="25" 
        y="30" 
        width="8" 
        height="40" 
        fill="currentColor"
      />
      
      {/* Top curve of B */}
      <path 
        d="M33 30 L55 30 Q65 30 65 40 Q65 45 60 47.5 Q65 50 65 55 Q65 70 55 70 L33 70 L33 62 L55 62 Q58 62 58 55 Q58 52 55 52 L33 52 L33 45 L55 45 Q58 45 58 40 Q58 37 55 37 L33 37 Z" 
        fill="currentColor"
      />
    </svg>
  );
};

export default Logo;
