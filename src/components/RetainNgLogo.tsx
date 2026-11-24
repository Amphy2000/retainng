import React from 'react';

interface Props {
  className?: string;
}

export function RetainNgLogo({ className = 'w-7 h-7' }: Props) {
  return (
    <svg viewBox="0 0 600 600" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="logoBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0f2e22" />
          <stop offset="60%" stopColor="#06120e" />
          <stop offset="100%" stopColor="#030707" />
        </radialGradient>
        <linearGradient id="logoEmerald" x1="100" y1="120" x2="480" y2="480" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="logoCyan" x1="220" y1="100" x2="500" y2="380" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
      </defs>
      {/* Background Medallion */}
      <circle cx="300" cy="300" r="280" fill="url(#logoBg)" stroke="#10B981" strokeWidth="6" strokeOpacity="0.4" />
      
      {/* Master "R" Retention Loop */}
      <path
        d="M 185 140 L 245 140 C 250 140 254 144 254 149 L 254 445 C 254 453 247 460 239 460 L 190 460 C 182 460 176 453 176 445 L 176 149 Z"
        fill="url(#logoEmerald)"
      />
      <path
        d="M 235 140 L 345 140 C 410 140 455 178 455 242 C 455 305 408 344 340 344 L 235 344 Z"
        fill="url(#logoCyan)"
      />
      <path
        d="M 254 200 L 335 200 C 368 200 392 216 392 242 C 392 268 368 284 335 284 L 254 284 Z"
        fill="#040C08"
        stroke="#34D399"
        strokeWidth="4"
        strokeOpacity="0.5"
      />
      <path
        d="M 310 325 L 380 325 C 395 325 408 333 416 345 L 472 436 C 479 448 471 460 457 460 L 398 460 C 388 460 378 454 372 444 L 326 372 C 320 363 313 358 300 358 L 254 358 L 254 325 Z"
        fill="url(#logoEmerald)"
      />
      {/* Clinical Health Cross Indicator */}
      <circle cx="445" cy="180" r="26" fill="#061A12" stroke="#34D399" strokeWidth="4" />
      <path d="M 445 168 L 445 192 M 433 180 L 457 180" stroke="#34D399" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
