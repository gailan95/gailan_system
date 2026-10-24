import React from 'react';

interface Product3DIconProps {
  name: string;
  category?: string;
  className?: string;
  size?: number;
}

export const Product3DIcon: React.FC<Product3DIconProps> = ({
  name = '',
  className = 'w-12 h-12 sm:w-14 sm:h-14',
}) => {
  // Normalize text: lowercase and remove any diacritics / tashkeel marks
  const norm = (name || '')
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0651\u0652]/g, '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ە');

  // 1. Orange / Citrus (پرتقاڵ, پرتقال, پرتەقاڵ, پرتەقال, برتقال, نارنج, لیمۆ, orange, citrus, etc.)
  if (
    norm.includes('پرتقاڵ') ||
    norm.includes('پرتقال') ||
    norm.includes('پرتەقاڵ') ||
    norm.includes('پرتەقال') ||
    norm.includes('برتقال') ||
    norm.includes('برتقالة') ||
    norm.includes('orange') ||
    norm.includes('نارنج') ||
    norm.includes('نارەنج') ||
    norm.includes('ليمۆ') ||
    norm.includes('لیمۆ') ||
    norm.includes('ليمو') ||
    norm.includes('ليمون') ||
    norm.includes('لەمۆ') ||
    norm.includes('lemon') ||
    norm.includes('سندی') ||
    norm.includes('لالەنگی') ||
    norm.includes('لالنگی') ||
    norm.includes('مەندەرین') ||
    norm.includes('citrus') ||
    norm.includes('tangerine') ||
    norm.includes('mandarin')
  ) {
    return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} filter drop-shadow-md`}>
        <defs>
          {/* Main 3D Orange Sphere Gradient */}
          <radialGradient id="orangeBall" cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#FFF7ED" />
            <stop offset="15%" stopColor="#FED7AA" />
            <stop offset="45%" stopColor="#F97316" />
            <stop offset="85%" stopColor="#EA580C" />
            <stop offset="100%" stopColor="#9A3412" />
          </radialGradient>

          {/* Secondary Ambient Rim Light */}
          <linearGradient id="orangeRim" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#FFEDD5" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#FB923C" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#7C2D12" stopOpacity="0.9" />
          </linearGradient>

          {/* Leaf 3D Gradient */}
          <linearGradient id="leafGrad" x1="45" y1="10" x2="80" y2="35">
            <stop offset="0%" stopColor="#86EFAC" />
            <stop offset="50%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#14532D" />
          </linearGradient>

          {/* Stem Wood Gradient */}
          <linearGradient id="stemGrad" x1="50" y1="12" x2="55" y2="28">
            <stop offset="0%" stopColor="#A16207" />
            <stop offset="100%" stopColor="#451A03" />
          </linearGradient>

          {/* 3D Drop Shadow */}
          <filter id="fruitShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#7c2d12" floodOpacity="0.45" />
          </filter>
        </defs>

        <g filter="url(#fruitShadow)">
          {/* Stem */}
          <path d="M50,26 C51,18 53,12 58,10 C56,12 55,18 54,26 Z" fill="url(#stemGrad)" />

          {/* 3D Glossy Leaf */}
          <path
            d="M52,20 C62,12 76,14 84,24 C74,28 62,26 52,20 Z"
            fill="url(#leafGrad)"
            stroke="#BBF7D0"
            strokeWidth="0.8"
          />
          {/* Leaf Center Vein */}
          <path d="M54,20 Q68,20 80,24" stroke="#DCFCE7" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />

          {/* Little green calyx star at stem base */}
          <polygon points="50,25 54,23 53,27 57,28 53,29 53,33 50,30 47,33 48,29 44,27 48,26 47,22" fill="#15803D" />

          {/* Main 3D Sphere */}
          <circle cx="50" cy="58" r="36" fill="url(#orangeBall)" stroke="url(#orangeRim)" strokeWidth="1.5" />

          {/* Specular Glaze Highlight (Reflective curved shine) */}
          <ellipse cx="38" cy="42" rx="14" ry="7" transform="rotate(-30 38 42)" fill="white" opacity="0.5" />
          <circle cx="33" cy="38" r="3.5" fill="white" opacity="0.8" />

          {/* Bottom ambient bounce light glow */}
          <path d="M26,76 C32,86 64,88 74,76" stroke="#FEF08A" strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />

          {/* Subtle natural citrus skin pores */}
          <circle cx="48" cy="46" r="0.8" fill="#FFF7ED" opacity="0.6" />
          <circle cx="58" cy="52" r="0.8" fill="#FFF7ED" opacity="0.6" />
          <circle cx="42" cy="56" r="0.8" fill="#FFF7ED" opacity="0.6" />
          <circle cx="52" cy="64" r="0.8" fill="#FFF7ED" opacity="0.6" />
          <circle cx="36" cy="68" r="0.8" fill="#FFF7ED" opacity="0.6" />
          <circle cx="62" cy="70" r="0.8" fill="#FFF7ED" opacity="0.6" />
        </g>
      </svg>
    );
  }

  // 2. Apple / Pomegranate (سێو, ھەنار, تفاح, apple, pomegranate)
  if (norm.includes('سێو') || norm.includes('سیو') || norm.includes('تفاح') || norm.includes('apple') || norm.includes('هەنار') || norm.includes('ھەنار')) {
    return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} filter drop-shadow-md`}>
        <defs>
          <radialGradient id="appleBody" cx="36%" cy="34%" r="65%">
            <stop offset="0%" stopColor="#FECDD3" />
            <stop offset="20%" stopColor="#FB7185" />
            <stop offset="55%" stopColor="#E11D48" />
            <stop offset="85%" stopColor="#9F1239" />
            <stop offset="100%" stopColor="#4C0519" />
          </radialGradient>
          <linearGradient id="appleLeaf" x1="40" y1="8" x2="75" y2="28">
            <stop offset="0%" stopColor="#86EFAC" />
            <stop offset="100%" stopColor="#15803D" />
          </linearGradient>
          <filter id="appleShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#4c0519" floodOpacity="0.45" />
          </filter>
        </defs>
        <g filter="url(#appleShadow)">
          {/* Stem */}
          <path d="M50,28 C51,16 56,10 62,8 C60,11 55,17 52,28 Z" fill="#78350F" />
          {/* Leaf */}
          <path d="M52,20 C62,12 76,16 80,24 C70,28 58,26 52,20 Z" fill="url(#appleLeaf)" />
          {/* Apple Heart Shape */}
          <path
            d="M50,34 C44,26 28,26 20,38 C10,54 22,86 46,90 C49,90.5 51,90.5 54,90 C78,86 90,54 80,38 C72,26 56,26 50,34 Z"
            fill="url(#appleBody)"
            stroke="#FDA4AF"
            strokeWidth="1.2"
          />
          {/* Gloss Light Arc */}
          <ellipse cx="34" cy="44" rx="10" ry="6" transform="rotate(-35 34 44)" fill="white" opacity="0.6" />
          <circle cx="30" cy="40" r="2.5" fill="white" opacity="0.9" />
          {/* Bottom curve rim */}
          <path d="M30,82 C38,88 62,88 70,82" stroke="#FECDD3" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
        </g>
      </svg>
    );
  }

  // 3. Tomato / Watermelon / Melon (تەماتە, شووتی, کاڵەک, طماطم, بطيخ)
  if (norm.includes('تەماتە') || norm.includes('طماطم') || norm.includes('شووتی') || norm.includes('شوتی') || norm.includes('بطيخ') || norm.includes('کاڵەک')) {
    return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} filter drop-shadow-md`}>
        <defs>
          <radialGradient id="redFruit" cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#FFE4E6" />
            <stop offset="25%" stopColor="#F43F5E" />
            <stop offset="70%" stopColor="#E11D48" />
            <stop offset="100%" stopColor="#881337" />
          </radialGradient>
          <filter id="fruitSh" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="7" stdDeviation="4.5" floodColor="#881337" floodOpacity="0.45" />
          </filter>
        </defs>
        <g filter="url(#fruitSh)">
          {/* Tomato Crown Leaves */}
          <path d="M50,22 L52,14 L55,22 L64,16 L60,24 L70,26 L60,30 L66,38 L56,33 L54,42 L50,33 L44,40 L44,32 L34,35 L40,28 L30,24 L40,22 L36,15 Z" fill="#22C55E" stroke="#86EFAC" strokeWidth="0.8" />
          <circle cx="50" cy="58" r="35" fill="url(#redFruit)" stroke="#FDA4AF" strokeWidth="1.2" />
          {/* Plump Segments indentation */}
          <path d="M50,26 Q50,58 50,92" stroke="#9F1239" strokeWidth="1.5" opacity="0.25" />
          <path d="M50,26 Q32,54 32,86" stroke="#9F1239" strokeWidth="1.2" opacity="0.2" />
          <path d="M50,26 Q68,54 68,86" stroke="#9F1239" strokeWidth="1.2" opacity="0.2" />
          {/* Specular Highlight */}
          <ellipse cx="36" cy="42" rx="12" ry="6" transform="rotate(-30 36 42)" fill="white" opacity="0.65" />
        </g>
      </svg>
    );
  }

  // 4. Default: Magnificent 3D Isometric Wooden & Emerald Produce Crate with Gold Tape & Highlights
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} filter drop-shadow-md`}>
      <defs>
        {/* Top Lid Face */}
        <linearGradient id="crateTop" x1="50" y1="12" x2="50" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="50%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        {/* Left Side Face */}
        <linearGradient id="crateLeft" x1="12" y1="30" x2="50" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="70%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064E3B" />
        </linearGradient>

        {/* Right Side Face */}
        <linearGradient id="crateRight" x1="50" y1="48" x2="88" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="70%" stopColor="#065F46" />
          <stop offset="100%" stopColor="#022C22" />
        </linearGradient>

        {/* Gold Parcel Ribbon */}
        <linearGradient id="goldRibbon" x1="50" y1="16" x2="50" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="40%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>

        {/* 3D Drop Shadow */}
        <filter id="crateShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#064e3b" floodOpacity="0.45" />
        </filter>
      </defs>

      <g filter="url(#crateShadow)">
        {/* Top Face */}
        <polygon points="50,14 86,30 50,47 14,30" fill="url(#crateTop)" stroke="#A7F3D0" strokeWidth="1.8" />

        {/* Left Face */}
        <polygon points="14,30 50,47 50,86 14,68" fill="url(#crateLeft)" />

        {/* Right Face */}
        <polygon points="50,47 86,30 86,68 50,86" fill="url(#crateRight)" />

        {/* 3D Wooden Slat Grooves (Left Face) */}
        <line x1="14" y1="43" x2="50" y2="60" stroke="#022C22" strokeWidth="1.2" opacity="0.4" />
        <line x1="14" y1="56" x2="50" y2="73" stroke="#022C22" strokeWidth="1.2" opacity="0.4" />

        {/* 3D Wooden Slat Grooves (Right Face) */}
        <line x1="50" y1="60" x2="86" y2="43" stroke="#022C22" strokeWidth="1.2" opacity="0.5" />
        <line x1="50" y1="73" x2="86" y2="56" stroke="#022C22" strokeWidth="1.2" opacity="0.5" />

        {/* 3D Golden Sealing Ribbon Across Top and Sides */}
        <polygon points="44,22 56,27 56,44 44,39" fill="url(#goldRibbon)" stroke="#FEF9C3" strokeWidth="0.8" />
        <polygon points="45,47 55,51 55,85 45,80" fill="url(#goldRibbon)" stroke="#FEF9C3" strokeWidth="0.8" />

        {/* Specular Highlight on Top Edge */}
        <line x1="50" y1="14" x2="86" y2="30" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
        <line x1="50" y1="14" x2="14" y2="30" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
        <line x1="50" y1="47" x2="50" y2="86" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      </g>
    </svg>
  );
};
