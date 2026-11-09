import React from 'react';

interface IllustrationProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export function MealsIllustration({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="32" cy="32" r="28" fill="#FBF8F5" stroke="#E7E5E4" strokeWidth="2" />
      <ellipse cx="32" cy="36" rx="20" ry="12" fill="#830020" fillOpacity="0.12" />
      <path
        d="M16 34C16 41 23.16 46 32 46C40.84 46 48 41 48 34H16Z"
        fill="#830020"
        stroke="#830020"
        strokeWidth="2"
      />
      <path
        d="M26 22C26 22 28 26 25 29M32 20C32 20 34 24 32 28M38 22C38 22 40 26 39 29"
        stroke="#F2A900"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FruitsIllustration({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="32" cy="32" r="28" fill="#FDFCF7" stroke="#E7E5E4" strokeWidth="2" />
      {/* Apple & orange spot graphic */}
      <path
        d="M28 26C24 24 18 27 18 34C18 42 27 46 29 46C31 46 32 45 34 45C36 45 37 46 39 46C41 46 50 42 50 34C50 27 44 24 40 26C37 28 35 28 34 28C33 28 31 28 28 26Z"
        fill="#830020"
      />
      <path
        d="M34 26C34 22 37 18 41 17"
        stroke="#15803D"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="44" cy="38" r="10" fill="#F2A900" stroke="#FFFFFF" strokeWidth="1.5" />
    </svg>
  );
}

export function GroceriesIllustration({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="32" cy="32" r="28" fill="#F9F8F6" stroke="#E7E5E4" strokeWidth="2" />
      {/* Paper Bag */}
      <path
        d="M18 24L22 50H42L46 24H18Z"
        fill="#E7E5E4"
        stroke="#78716C"
        strokeWidth="2"
      />
      <path
        d="M26 24V19C26 16.79 27.79 15 30 15H34C36.21 15 38 16.79 38 19V24"
        stroke="#830020"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="25" y="32" width="14" height="12" rx="2" fill="#F2A900" />
    </svg>
  );
}

export function VegetablesIllustration({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="32" cy="32" r="28" fill="#F7FAF7" stroke="#E7E5E4" strokeWidth="2" />
      {/* Carrot & Tomato */}
      <path
        d="M20 44L36 20C38 18 41 18 43 20C45 22 45 25 43 27L24 47C22 48 20 46 20 44Z"
        fill="#F2A900"
      />
      <path
        d="M38 18L44 14M41 21L48 18"
        stroke="#15803D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="40" cy="40" r="10" fill="#830020" />
      <path d="M40 30V27" stroke="#15803D" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function RawChickenIllustration({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="32" cy="32" r="28" fill="#FDFBFB" stroke="#E7E5E4" strokeWidth="2" />
      {/* Poultry drumstick icon */}
      <path
        d="M22 42C17 37 18 27 24 21C30 15 40 16 45 21C47 23 48 27 47 30L40 37C37 40 33 42 29 42C26 42 24 43 22 42Z"
        fill="#830020"
        fillOpacity="0.85"
      />
      <circle cx="46" cy="44" r="4" fill="#E7E5E4" stroke="#78716C" strokeWidth="2" />
      <circle cx="42" cy="48" r="4" fill="#E7E5E4" stroke="#78716C" strokeWidth="2" />
      <path d="M38 38L44 44" stroke="#78716C" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function LateNightIllustration({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="32" cy="32" r="28" fill="#1C1917" stroke="#44403C" strokeWidth="2" />
      {/* Crescent moon + golden stars */}
      <path
        d="M38 20C31 20 25 26 25 33C25 40 31 46 38 46C41 46 44 45 46 43C39 42 34 37 34 30C34 25 37 21 42 20C40.7 20 39.3 20 38 20Z"
        fill="#F2A900"
      />
      <circle cx="22" cy="24" r="1.5" fill="#FFFFFF" />
      <circle cx="28" cy="18" r="1" fill="#FFFFFF" />
      <circle cx="44" cy="22" r="1" fill="#FFFFFF" />
    </svg>
  );
}

export function CategorySpotIllustration({
  category,
  size = 40,
}: {
  category: string;
  size?: number;
}) {
  switch (category) {
    case 'meals':
      return <MealsIllustration size={size} />;
    case 'fruits':
      return <FruitsIllustration size={size} />;
    case 'groceries':
      return <GroceriesIllustration size={size} />;
    case 'vegetables':
      return <VegetablesIllustration size={size} />;
    case 'raw_chicken':
      return <RawChickenIllustration size={size} />;
    case 'late_night':
      return <LateNightIllustration size={size} />;
    default:
      return <MealsIllustration size={size} />;
  }
}
