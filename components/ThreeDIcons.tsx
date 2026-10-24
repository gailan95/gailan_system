import React from 'react';

interface Icon3DProps {
  className?: string;
  size?: number;
}

// 1. 3D Emerald Cargo Box (کاڵاکان)
export const Box3DIcon: React.FC<Icon3DProps> = ({ className = 'w-9 h-9 sm:w-10 sm:h-10' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="boxTop" x1="50" y1="12" x2="50" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#86EFAC" />
        <stop offset="100%" stopColor="#22C55E" />
      </linearGradient>
      <linearGradient id="boxRight" x1="50" y1="48" x2="88" y2="78" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#16A34A" />
        <stop offset="100%" stopColor="#14532D" />
      </linearGradient>
      <linearGradient id="boxLeft" x1="12" y1="30" x2="50" y2="88" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#22C55E" />
        <stop offset="100%" stopColor="#15803D" />
      </linearGradient>
      <linearGradient id="tapeGrad" x1="50" y1="20" x2="50" y2="70" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
      <filter id="boxShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#052e16" floodOpacity="0.4" />
      </filter>
    </defs>
    <g filter="url(#boxShadow)">
      {/* Top Face */}
      <polygon points="50,14 86,30 50,47 14,30" fill="url(#boxTop)" stroke="#BBF7D0" strokeWidth="1.5" />
      {/* Left Face */}
      <polygon points="14,30 50,47 50,86 14,68" fill="url(#boxLeft)" />
      {/* Right Face */}
      <polygon points="50,47 86,30 86,68 50,86" fill="url(#boxRight)" />
      
      {/* 3D Parcel Tape & Seam */}
      <path d="M42,20 L58,27 L58,43 L42,36 Z" fill="url(#tapeGrad)" opacity="0.9" />
      <path d="M46,45 L54,49 L54,85 L46,81 Z" fill="url(#tapeGrad)" opacity="0.85" />

      {/* Gloss Highlight on Edges */}
      <line x1="50" y1="14" x2="86" y2="30" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="50" y1="14" x2="14" y2="30" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="50" y1="47" x2="50" y2="86" stroke="white" strokeWidth="1.2" opacity="0.4" />
    </g>
  </svg>
);

// 2. 3D Warm Orange Users Group (قەرزەکان)
export const Users3DIcon: React.FC<Icon3DProps> = ({ className = 'w-9 h-9 sm:w-10 sm:h-10' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="userGradMain" x1="35" y1="10" x2="65" y2="90" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FED7AA" />
        <stop offset="30%" stopColor="#FB923C" />
        <stop offset="100%" stopColor="#C2410C" />
      </linearGradient>
      <linearGradient id="userGradBack" x1="15" y1="15" x2="45" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FDBA74" />
        <stop offset="100%" stopColor="#9A3412" />
      </linearGradient>
      <filter id="userShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="5" stdDeviation="3.5" floodColor="#7c2d12" floodOpacity="0.45" />
      </filter>
    </defs>
    <g filter="url(#userShadow)">
      {/* Background Avatar Left */}
      <circle cx="34" cy="36" r="14" fill="url(#userGradBack)" opacity="0.75" />
      <path d="M16,74 C16,58 24,54 34,54 C44,54 52,58 52,74 Z" fill="url(#userGradBack)" opacity="0.75" />

      {/* Main Foreground Avatar Right */}
      <circle cx="60" cy="38" r="16" fill="url(#userGradMain)" stroke="#FFEDD5" strokeWidth="1.5" />
      {/* Sphere Gloss */}
      <ellipse cx="56" cy="30" rx="6" ry="3" fill="white" opacity="0.6" />
      <path d="M38,82 C38,64 48,58 60,58 C72,58 82,64 82,82 Z" fill="url(#userGradMain)" stroke="#FFEDD5" strokeWidth="1.2" />
      
      {/* Depth Highlights */}
      <path d="M42,78 C45,68 52,62 60,62 C68,62 75,68 78,78" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </g>
  </svg>
);

// 3. 3D Growth Chart & Upward Arrow (قازانج و زیان)
export const Trending3DIcon: React.FC<Icon3DProps> = ({ className = 'w-9 h-9 sm:w-10 sm:h-10' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="arrow3D" x1="15" y1="80" x2="85" y2="15" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#E879F9" />
        <stop offset="50%" stopColor="#C084FC" />
        <stop offset="100%" stopColor="#FFFFFF" />
      </linearGradient>
      <linearGradient id="bar1" x1="20" y1="55" x2="36" y2="85" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#A855F7" />
        <stop offset="100%" stopColor="#581C87" />
      </linearGradient>
      <linearGradient id="bar2" x1="42" y1="40" x2="58" y2="85" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#C084FC" />
        <stop offset="100%" stopColor="#6B21A8" />
      </linearGradient>
      <linearGradient id="bar3" x1="64" y1="25" x2="80" y2="85" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#E879F9" />
        <stop offset="100%" stopColor="#7E22CE" />
      </linearGradient>
      <filter id="trendShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#3b0764" floodOpacity="0.5" />
      </filter>
    </defs>
    <g filter="url(#trendShadow)">
      {/* 3D Cylindrical Pillars */}
      <rect x="20" y="58" width="16" height="26" rx="6" fill="url(#bar1)" />
      <rect x="42" y="44" width="16" height="40" rx="6" fill="url(#bar2)" />
      <rect x="64" y="30" width="16" height="54" rx="6" fill="url(#bar3)" />

      {/* Pillar Tops Highlight */}
      <ellipse cx="28" cy="60" rx="7" ry="3" fill="#E9D5FF" opacity="0.8" />
      <ellipse cx="50" cy="46" rx="7" ry="3" fill="#F3E8FF" opacity="0.8" />
      <ellipse cx="72" cy="32" rx="7" ry="3" fill="#FAF5FF" opacity="0.9" />

      {/* 3D Swooping Glowing Arrow */}
      <path 
        d="M18,72 Q42,56 64,34 L62,44 L78,20 L54,26 L64,34 Q42,56 18,72 Z" 
        fill="url(#arrow3D)" 
        stroke="#FFFFFF" 
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

// 4. 3D Shopping Cart & Register (خاڵی فرۆشتن)
export const ShoppingCart3DIcon: React.FC<Icon3DProps> = ({ className = 'w-9 h-9 sm:w-10 sm:h-10' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="cartBody" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#93C5FD" />
        <stop offset="40%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#1D4ED8" />
      </linearGradient>
      <linearGradient id="wheelGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#94A3B8" />
      </linearGradient>
      <filter id="cartShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="5" stdDeviation="3.5" floodColor="#1e3a8a" floodOpacity="0.45" />
      </filter>
    </defs>
    <g filter="url(#cartShadow)">
      {/* Cart Basket 3D Shape */}
      <path 
        d="M18,22 L28,22 L40,60 L76,60 L86,32 L34,32" 
        stroke="url(#cartBody)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Front Basket Wall Grid */}
      <line x1="42" y1="42" x2="80" y2="42" stroke="#BFDBFE" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="46" y1="52" x2="74" y2="52" stroke="#BFDBFE" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="52" y1="34" x2="48" y2="58" stroke="#BFDBFE" strokeWidth="2.5" />
      <line x1="64" y1="34" x2="62" y2="58" stroke="#BFDBFE" strokeWidth="2.5" />
      <line x1="76" y1="34" x2="74" y2="58" stroke="#BFDBFE" strokeWidth="2.5" />

      {/* Floating Goods Inside Cart */}
      <rect x="42" y="16" width="18" height="18" rx="4" fill="#FBBF24" stroke="#FEF08A" strokeWidth="1" transform="rotate(-12 42 16)" />
      <rect x="58" y="14" width="16" height="20" rx="4" fill="#34D399" stroke="#A7F3D0" strokeWidth="1" transform="rotate(8 58 14)" />

      {/* 3D Wheels with Hubs */}
      <circle cx="44" cy="76" r="8" fill="#1E293B" stroke="#60A5FA" strokeWidth="2" />
      <circle cx="44" cy="76" r="3.5" fill="url(#wheelGrad)" />

      <circle cx="72" cy="76" r="8" fill="#1E293B" stroke="#60A5FA" strokeWidth="2" />
      <circle cx="72" cy="76" r="3.5" fill="url(#wheelGrad)" />
    </g>
  </svg>
);

// 5. 3D User Identity & Rotating Gear (هەژمارەکان)
export const Account3DIcon: React.FC<Icon3DProps> = ({ className = 'w-9 h-9 sm:w-10 sm:h-10' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="accGrad" x1="20" y1="15" x2="70" y2="85" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#C7D2FE" />
        <stop offset="40%" stopColor="#818CF8" />
        <stop offset="100%" stopColor="#4338CA" />
      </linearGradient>
      <linearGradient id="gearGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="100%" stopColor="#CA8A04" />
      </linearGradient>
      <filter id="accShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="5" stdDeviation="3.5" floodColor="#312e81" floodOpacity="0.45" />
      </filter>
    </defs>
    <g filter="url(#accShadow)">
      {/* 3D Avatar Body */}
      <circle cx="46" cy="34" r="16" fill="url(#accGrad)" stroke="#E0E7FF" strokeWidth="1.5" />
      <ellipse cx="42" cy="26" rx="6" ry="3" fill="white" opacity="0.6" />
      <path d="M22,78 C22,60 32,54 46,54 C60,54 70,60 70,78 Z" fill="url(#accGrad)" stroke="#E0E7FF" strokeWidth="1.2" />

      {/* 3D Orbiting Golden Shield/Gear */}
      <g transform="translate(62, 54)">
        <circle cx="12" cy="12" r="14" fill="url(#gearGrad)" stroke="#FEF08A" strokeWidth="1.5" />
        <path d="M12,4 L14,7 L17,6 L17,9 L20,10 L19,13 L21,15 L18,17 L19,20 L16,19 L14,22 L12,19 L10,22 L8,19 L5,20 L6,17 L3,15 L5,13 L4,10 L7,9 L7,6 L10,7 Z" fill="#EAB308" />
        <circle cx="12" cy="12" r="5" fill="#78350F" />
      </g>
    </g>
  </svg>
);

// 6. 3D Golden Medallions & Coin Stack (عمولە)
export const Commission3DIcon: React.FC<Icon3DProps> = ({ className = 'w-9 h-9 sm:w-10 sm:h-10' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="goldCoin1" x1="20" y1="15" x2="70" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="40%" stopColor="#FACC15" />
        <stop offset="100%" stopColor="#A16207" />
      </linearGradient>
      <linearGradient id="goldCoin2" x1="40" y1="35" x2="85" y2="90" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFBEB" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#78350F" />
      </linearGradient>
      <filter id="goldShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#713f12" floodOpacity="0.5" />
      </filter>
    </defs>
    <g filter="url(#goldShadow)">
      {/* Background Coin */}
      <g transform="translate(18, 20)">
        <ellipse cx="24" cy="24" rx="22" ry="16" fill="url(#goldCoin1)" stroke="#FEF9C3" strokeWidth="2" />
        <ellipse cx="24" cy="24" rx="16" ry="11" fill="#CA8A04" stroke="#FEF08A" strokeWidth="1" />
        <text x="24" y="29" fill="#FEF9C3" fontSize="16" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">%</text>
      </g>

      {/* Foreground Overlapping Shiny 3D Coin */}
      <g transform="translate(42, 38)">
        <ellipse cx="24" cy="24" rx="24" ry="18" fill="url(#goldCoin2)" stroke="#FFFBEB" strokeWidth="2.5" />
        {/* Rim Edge Highlight */}
        <ellipse cx="24" cy="24" rx="18" ry="13" fill="#D97706" stroke="#FEF08A" strokeWidth="1.2" />
        {/* Embossed Symbol */}
        <text x="24" y="30" fill="#FFFBEB" fontSize="18" fontWeight="black" textAnchor="middle" fontFamily="sans-serif">$</text>
        {/* Top Gloss Refraction */}
        <path d="M12,18 Q24,10 36,18" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </g>
    </g>
  </svg>
);

// 7. 3D Vault Leather Wallet with Cash (سەرمایە)
export const Capital3DIcon: React.FC<Icon3DProps> = ({ className = 'w-9 h-9 sm:w-10 sm:h-10' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="walletGrad" x1="15" y1="25" x2="85" y2="85" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#7DD3FC" />
        <stop offset="40%" stopColor="#0284C7" />
        <stop offset="100%" stopColor="#0369A1" />
      </linearGradient>
      <linearGradient id="cashGrad" x1="30" y1="10" x2="70" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#86EFAC" />
        <stop offset="100%" stopColor="#16A34A" />
      </linearGradient>
      <filter id="walletShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="5" stdDeviation="3.5" floodColor="#0c4a6e" floodOpacity="0.45" />
      </filter>
    </defs>
    <g filter="url(#walletShadow)">
      {/* Green Cash Bills Popping Out */}
      <rect x="26" y="16" width="46" height="22" rx="4" fill="url(#cashGrad)" stroke="#BBF7D0" strokeWidth="1" transform="rotate(-6 26 16)" />
      <circle cx="48" cy="24" r="4" fill="#14532D" opacity="0.3" />
      
      {/* 3D Wallet Main Fold */}
      <rect x="16" y="28" width="68" height="52" rx="14" fill="url(#walletGrad)" stroke="#BAE6FD" strokeWidth="2" />
      
      {/* Front Flap & Stitching */}
      <path d="M16,46 C34,46 44,40 84,40 L84,80 C84,84 80,88 76,88 L24,88 C20,88 16,84 16,80 Z" fill="#0369A1" opacity="0.6" />
      
      {/* 3D Metallic Clasp */}
      <g transform="translate(60, 52)">
        <rect x="0" y="0" width="22" height="16" rx="6" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.5" />
        <circle cx="8" cy="8" r="3" fill="#FFFFFF" />
      </g>
      
      {/* Leather Bevel Gloss */}
      <line x1="22" y1="32" x2="78" y2="32" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </g>
  </svg>
);

// 8. 3D Floating Receipt & Currency Seal (خەرجییەکان)
export const Expense3DIcon: React.FC<Icon3DProps> = ({ className = 'w-9 h-9 sm:w-10 sm:h-10' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="receiptGrad" x1="20" y1="12" x2="80" y2="88" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="70%" stopColor="#FFE4E6" />
        <stop offset="100%" stopColor="#FDA4AF" />
      </linearGradient>
      <linearGradient id="receiptBorder" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FB7185" />
        <stop offset="100%" stopColor="#E11D48" />
      </linearGradient>
      <filter id="receiptShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#881337" floodOpacity="0.45" />
      </filter>
    </defs>
    <g filter="url(#receiptShadow)">
      {/* 3D Tilted Receipt Paper */}
      <path 
        d="M24,14 L76,14 L76,82 L68,77 L60,82 L52,77 L44,82 L36,77 L28,82 L24,78 Z" 
        fill="url(#receiptGrad)" 
        stroke="url(#receiptBorder)" 
        strokeWidth="2.5" 
        strokeLinejoin="round" 
      />
      
      {/* Printed Transaction Lines */}
      <line x1="34" y1="26" x2="66" y2="26" stroke="#BE123C" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="34" y1="36" x2="54" y2="36" stroke="#FB7185" strokeWidth="2" strokeLinecap="round" />
      <line x1="34" y1="44" x2="60" y2="44" stroke="#FB7185" strokeWidth="2" strokeLinecap="round" />
      
      {/* 3D Currency Dollar Badge Stamp */}
      <circle cx="50" cy="58" r="12" fill="#E11D48" stroke="#FFE4E6" strokeWidth="1.5" />
      <text x="50" y="63" fill="#FFFFFF" fontSize="14" fontWeight="black" textAnchor="middle" fontFamily="sans-serif">$</text>
      
      {/* Corner Gloss Accent */}
      <path d="M26,16 L44,16" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    </g>
  </svg>
);

// 9. Authentic 3D iOS Settings Gear (ڕێکخستن)
export const Settings3DIcon: React.FC<Icon3DProps> = ({ className = 'w-9 h-9 sm:w-10 sm:h-10' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      {/* Outer Gear Metallic Gradient */}
      <linearGradient id="iosGearBody" x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="25%" stopColor="#E2E8F0" />
        <stop offset="60%" stopColor="#94A3B8" />
        <stop offset="90%" stopColor="#64748B" />
        <stop offset="100%" stopColor="#334155" />
      </linearGradient>

      {/* Teeth Bevel Highlight Gradient */}
      <linearGradient id="teethHighlight" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
        <stop offset="50%" stopColor="#CBD5E1" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#475569" stopOpacity="0.8" />
      </linearGradient>

      {/* Inner Recessed Hole Gradient */}
      <radialGradient id="centerHole" cx="50%" cy="45%" r="50%">
        <stop offset="0%" stopColor="#1E293B" />
        <stop offset="70%" stopColor="#0F172A" />
        <stop offset="100%" stopColor="#020617" />
      </radialGradient>

      {/* Concentric Groove Metallic Ring */}
      <linearGradient id="innerRingGrad" x1="30" y1="30" x2="70" y2="70" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F8FAFC" />
        <stop offset="50%" stopColor="#94A3B8" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>

      {/* 3D Depth Drop Shadow */}
      <filter id="iosGearShadow" x="-15%" y="-15%" width="135%" height="135%">
        <feDropShadow dx="0" dy="6" stdDeviation="4.5" floodColor="#0f172a" floodOpacity="0.55" />
      </filter>
    </defs>

    <g filter="url(#iosGearShadow)">
      {/* 8-Teeth 3D iOS Settings Cog Shape */}
      <path 
        d="
          M43,14 L57,14 L58,22 C61.5,23.2 64.7,25 67.5,27.2 L74.5,22.5 L84,32 L79.5,39 C81.7,41.8 83.5,45 84.7,48.5 L92.7,49.5 L92.7,63.5 L84.7,64.5 C83.5,68 81.7,71.2 79.5,74 L84,81 L74.5,90.5 L67.5,85.8 C64.7,88 61.5,89.8 58,91 L57,99 L43,99 L42,91 C38.5,89.8 35.3,88 32.5,85.8 L25.5,90.5 L16,81 L20.5,74 C18.3,71.2 16.5,68 15.3,64.5 L7.3,63.5 L7.3,49.5 L15.3,48.5 C16.5,45 18.3,41.8 20.5,39 L16,32 L25.5,22.5 L32.5,27.2 C35.3,25 38.5,23.2 42,22 L43,14 Z
        "
        fill="url(#iosGearBody)"
        stroke="url(#teethHighlight)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      {/* Outer Raised Ring Bevel */}
      <circle cx="50" cy="56.5" r="30" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.4" fill="none" />
      <circle cx="50" cy="56.5" r="28" stroke="#475569" strokeWidth="1" strokeOpacity="0.3" fill="none" />

      {/* Concentric Decorative Groove (Apple Watch / iOS Detail) */}
      <circle cx="50" cy="56.5" r="23" stroke="url(#innerRingGrad)" strokeWidth="1.8" fill="none" opacity="0.8" />

      {/* 3D Deep Center Hole (Axle) */}
      <circle cx="50" cy="56.5" r="16" fill="url(#centerHole)" stroke="#64748B" strokeWidth="2" />
      <circle cx="50" cy="56.5" r="14.5" stroke="#000000" strokeWidth="1" strokeOpacity="0.6" fill="none" />

      {/* Center Metal Core Bearing */}
      <circle cx="50" cy="56.5" r="6.5" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.2" />
      <circle cx="48.5" cy="54.5" r="2.5" fill="#FFFFFF" opacity="0.9" />

      {/* Crisp Specular Light Reflection Sweep on Top-Left Teeth */}
      <path 
        d="M25,32 C31,24 40,19 50,19 C60,19 69,24 75,32" 
        stroke="#FFFFFF" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        opacity="0.8" 
      />
    </g>
  </svg>
);

// 10. 3D Holographic 4-Tile Dashboard Matrix (داشبۆرد)
export const Dashboard3DIcon: React.FC<Icon3DProps> = ({ className = 'w-9 h-9 sm:w-10 sm:h-10' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="tile1" x1="16" y1="16" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#5EEAD4" />
        <stop offset="100%" stopColor="#0D9488" />
      </linearGradient>
      <linearGradient id="tile2" x1="56" y1="16" x2="84" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#2DD4BF" />
        <stop offset="100%" stopColor="#0F766E" />
      </linearGradient>
      <linearGradient id="tile3" x1="16" y1="56" x2="44" y2="84" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#99F6E4" />
        <stop offset="100%" stopColor="#14B8A6" />
      </linearGradient>
      <linearGradient id="tile4" x1="56" y1="56" x2="84" y2="84" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#67E8F9" />
        <stop offset="100%" stopColor="#0891B2" />
      </linearGradient>
      <filter id="dashShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#042f2e" floodOpacity="0.5" />
      </filter>
    </defs>
    <g filter="url(#dashShadow)">
      {/* 4 Isometric 3D Floating Glass Tiles */}
      <rect x="18" y="18" width="28" height="28" rx="8" fill="url(#tile1)" stroke="#CCFBF1" strokeWidth="1.5" />
      <rect x="54" y="18" width="28" height="28" rx="8" fill="url(#tile2)" stroke="#CCFBF1" strokeWidth="1.5" />
      <rect x="18" y="54" width="28" height="28" rx="8" fill="url(#tile3)" stroke="#CCFBF1" strokeWidth="1.5" />
      <rect x="54" y="54" width="28" height="28" rx="8" fill="url(#tile4)" stroke="#CCFBF1" strokeWidth="1.5" />

      {/* Gloss Bevels on Top of Tiles */}
      <line x1="22" y1="22" x2="38" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="58" y1="22" x2="74" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="22" y1="58" x2="38" y2="58" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="58" y1="58" x2="74" y2="58" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </g>
  </svg>
);

// 11. 3D Overdue Debt Alert Shield (قەرزی دواکەوتوو)
export const Overdue3DIcon: React.FC<Icon3DProps> = ({ className = 'w-9 h-9 sm:w-10 sm:h-10' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="shieldGrad" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FCA5A5" />
        <stop offset="40%" stopColor="#EF4444" />
        <stop offset="100%" stopColor="#7F1D1D" />
      </linearGradient>
      <filter id="shieldShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#450a0a" floodOpacity="0.5" />
      </filter>
    </defs>
    <g filter="url(#shieldShadow)">
      <path d="M50,12 L84,26 L84,52 C84,70 68,84 50,90 C32,84 16,70 16,52 L16,26 Z" fill="url(#shieldGrad)" stroke="#FEE2E2" strokeWidth="2" strokeLinejoin="round" />
      <path d="M50,30 L50,56" stroke="white" strokeWidth="6" strokeLinecap="round" />
      <circle cx="50" cy="70" r="4" fill="white" />
    </g>
  </svg>
);

// 12. 3D Currency Stack / Wallet (کۆی گشتی قەرز)
export const DebtCoin3DIcon: React.FC<Icon3DProps> = ({ className = 'w-9 h-9 sm:w-10 sm:h-10' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="coinGrad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6EE7B7" />
        <stop offset="40%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
      <filter id="coinShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#064e3b" floodOpacity="0.5" />
      </filter>
    </defs>
    <g filter="url(#coinShadow)">
      <ellipse cx="50" cy="30" rx="30" ry="14" fill="#A7F3D0" stroke="#059669" strokeWidth="2" />
      <path d="M20,30 L20,50 C20,58 34,64 50,64 C66,64 80,58 80,50 L80,30" fill="url(#coinGrad)" stroke="#A7F3D0" strokeWidth="1.5" />
      <ellipse cx="50" cy="50" rx="30" ry="14" fill="#34D399" stroke="#059669" strokeWidth="2" />
      <path d="M20,50 L20,70 C20,78 34,84 50,84 C66,84 80,78 80,70 L80,50" fill="url(#coinGrad)" stroke="#A7F3D0" strokeWidth="1.5" />
      <ellipse cx="50" cy="70" rx="30" ry="14" fill="#10B981" stroke="#047857" strokeWidth="2" />
    </g>
  </svg>
);

// 13. 3D Receipt / Invoice Icon (پسوڵەکان)
export const Receipt3DIcon: React.FC<Icon3DProps> = ({ className = 'w-9 h-9 sm:w-10 sm:h-10' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="receiptGrad" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#A7F3D0" />
        <stop offset="40%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
      <filter id="receiptShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#064e3b" floodOpacity="0.5" />
      </filter>
    </defs>
    <g filter="url(#receiptShadow)">
      <path d="M22,12 L78,12 C80.2,12 82,13.8 82,16 L82,84 L74,80 L66,84 L58,80 L50,84 L42,80 L34,84 L26,80 L18,84 L18,16 C18,13.8 19.8,12 22,12 Z" fill="url(#receiptGrad)" stroke="#ECFDF5" strokeWidth="2" strokeLinejoin="round" />
      <rect x="28" y="24" width="44" height="6" rx="3" fill="white" opacity="0.9" />
      <rect x="28" y="38" width="32" height="4" rx="2" fill="white" opacity="0.7" />
      <rect x="28" y="48" width="40" height="4" rx="2" fill="white" opacity="0.7" />
      <rect x="28" y="58" width="24" height="4" rx="2" fill="white" opacity="0.7" />
    </g>
  </svg>
);


