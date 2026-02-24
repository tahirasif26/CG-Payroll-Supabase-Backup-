import React from "react";

export type CardOccasion = "birthday" | "anniversary" | "new_year" | "eid" | "christmas" | "holiday";

export interface CardTemplateProps {
  name: string;
  occasion: CardOccasion;
  yearsOfService?: number;
  companyName: string;
  year: number;
  message?: string;
}

const templateMeta = [
  { id: 1, name: "Confetti Burst", type: "birthday" as CardOccasion },
  { id: 2, name: "Elegant Gold", type: "birthday" as CardOccasion },
  { id: 3, name: "Modern Geometric", type: "birthday" as CardOccasion },
  { id: 4, name: "Warm Sunset", type: "birthday" as CardOccasion },
  { id: 5, name: "Minimalist", type: "birthday" as CardOccasion },
  { id: 6, name: "Ocean Breeze", type: "anniversary" as CardOccasion },
  { id: 7, name: "Starlight", type: "anniversary" as CardOccasion },
  { id: 8, name: "Nature Garden", type: "anniversary" as CardOccasion },
  { id: 9, name: "Royal Purple", type: "anniversary" as CardOccasion },
  { id: 10, name: "Celebration", type: "anniversary" as CardOccasion },
  { id: 11, name: "Fireworks", type: "new_year" as CardOccasion },
  { id: 12, name: "Golden Countdown", type: "new_year" as CardOccasion },
  { id: 13, name: "Crescent Moon", type: "eid" as CardOccasion },
  { id: 14, name: "Eid Lanterns", type: "eid" as CardOccasion },
  { id: 15, name: "Winter Wonderland", type: "christmas" as CardOccasion },
  { id: 16, name: "Festive Red", type: "christmas" as CardOccasion },
  { id: 17, name: "Tropical Vibes", type: "holiday" as CardOccasion },
  { id: 18, name: "Warm Wishes", type: "holiday" as CardOccasion },
];

export function getTemplateForEmployee(employeeId: string, year: number, occasion: "birthday" | "anniversary") {
  const hash = [...employeeId].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const templates = occasion === "birthday" ? [0, 1, 2, 3, 4] : [5, 6, 7, 8, 9];
  const idx = (year + hash) % templates.length;
  return templates[idx];
}

export { templateMeta };

// --- Individual card components ---

function ConfettiBurst({ name, companyName, message, year }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(135deg, hsl(340 80% 55%), hsl(280 70% 60%), hsl(210 80% 55%))", minHeight: 320 }}>
      {/* Confetti dots */}
      {[...Array(20)].map((_, i) => (
        <div key={i} className="absolute rounded-full opacity-40"
          style={{
            width: 6 + (i % 4) * 4, height: 6 + (i % 4) * 4,
            top: `${(i * 17) % 90}%`, left: `${(i * 23 + 7) % 95}%`,
            background: ["hsl(48 100% 67%)", "hsl(160 70% 50%)", "hsl(0 0% 100%)", "hsl(30 100% 60%)"][i % 4],
          }} />
      ))}
      <div className="relative z-10">
        <p className="text-5xl mb-3">🎂</p>
        <h2 className="text-2xl font-bold text-white mb-1">Happy Birthday!</h2>
        <p className="text-white/90 text-lg font-medium mb-4">{name}</p>
        <p className="text-white/75 text-sm max-w-xs mx-auto">{message || "Wishing you a wonderful year filled with joy and success!"}</p>
        <p className="text-white/50 text-xs mt-6">With warm wishes from {companyName} • {year}</p>
      </div>
    </div>
  );
}

function ElegantGold({ name, companyName, message, year }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(160deg, hsl(240 15% 12%), hsl(240 15% 18%))", minHeight: 320, border: "2px solid hsl(43 80% 55%)" }}>
      <div className="absolute inset-4 rounded-xl" style={{ border: "1px solid hsl(43 80% 55% / 0.3)" }} />
      <div className="relative z-10">
        <p className="text-4xl mb-2" style={{ color: "hsl(43 80% 55%)" }}>✦</p>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "hsl(43 80% 65%)", fontFamily: "Georgia, serif" }}>Happy Birthday</h2>
        <p className="text-lg font-medium mb-4" style={{ color: "hsl(43 80% 75%)" }}>{name}</p>
        <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(0 0% 70%)" }}>{message || "May your special day be filled with happiness and wonderful moments."}</p>
        <p className="text-xs mt-6" style={{ color: "hsl(43 80% 55% / 0.5)" }}>— {companyName} • {year}</p>
      </div>
    </div>
  );
}

function ModernGeometric({ name, companyName, message, year }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "hsl(0 0% 98%)", minHeight: 320 }}>
      {/* Geometric shapes */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10" style={{ background: "hsl(233 90% 60%)", clipPath: "polygon(100% 0, 0 0, 100% 100%)" }} />
      <div className="absolute bottom-0 left-0 w-24 h-24 opacity-10" style={{ background: "hsl(152 69% 40%)", clipPath: "polygon(0 100%, 100% 100%, 0 0)" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full opacity-5" style={{ border: "3px solid hsl(233 90% 60%)" }} />
      <div className="relative z-10">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center text-2xl" style={{ background: "hsl(233 90% 60%)" }}>
          <span className="text-white">🎉</span>
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "hsl(240 20% 12%)" }}>Happy Birthday!</h2>
        <p className="text-lg font-medium mb-4" style={{ color: "hsl(233 90% 60%)" }}>{name}</p>
        <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(220 9% 46%)" }}>{message || "Here's to another year of great achievements and cherished memories."}</p>
        <p className="text-xs mt-6" style={{ color: "hsl(220 9% 46% / 0.6)" }}>{companyName} • {year}</p>
      </div>
    </div>
  );
}

function WarmSunset({ name, companyName, message, year }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(135deg, hsl(25 95% 55%), hsl(340 75% 55%))", minHeight: 320 }}>
      <div className="absolute bottom-0 left-0 right-0 h-24 opacity-20"
        style={{ background: "radial-gradient(ellipse at bottom, hsl(48 100% 67%), transparent)" }} />
      <div className="relative z-10">
        <p className="text-5xl mb-3">🌅</p>
        <h2 className="text-2xl font-bold text-white mb-1">Happy Birthday!</h2>
        <p className="text-white/90 text-lg font-medium mb-4">{name}</p>
        <p className="text-white/75 text-sm max-w-xs mx-auto">{message || "May your day be as warm and bright as the most beautiful sunset."}</p>
        <p className="text-white/50 text-xs mt-6">With love from {companyName} • {year}</p>
      </div>
    </div>
  );
}

function MinimalistCard({ name, companyName, message, year }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "hsl(0 0% 100%)", minHeight: 320, border: "1px solid hsl(230 30% 91%)" }}>
      <div className="relative z-10">
        <div className="w-16 h-0.5 mx-auto mb-6" style={{ background: "hsl(233 90% 60%)" }} />
        <h2 className="text-xl font-semibold mb-1" style={{ color: "hsl(240 20% 12%)" }}>Happy Birthday</h2>
        <p className="text-2xl font-bold mb-6" style={{ color: "hsl(233 90% 60%)" }}>{name}</p>
        <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(220 9% 46%)" }}>{message || "Wishing you all the best on your special day."}</p>
        <div className="w-16 h-0.5 mx-auto mt-6 mb-3" style={{ background: "hsl(233 90% 60%)" }} />
        <p className="text-xs" style={{ color: "hsl(220 9% 46% / 0.6)" }}>{companyName} • {year}</p>
      </div>
    </div>
  );
}

function OceanBreeze({ name, yearsOfService, companyName, message, year }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(180deg, hsl(200 80% 50%), hsl(210 90% 40%))", minHeight: 320 }}>
      <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20"
        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 4px, hsl(0 0% 100%) 4px, hsl(0 0% 100%) 6px)" }} />
      <div className="relative z-10">
        <p className="text-5xl mb-3">🌊</p>
        <h2 className="text-2xl font-bold text-white mb-1">Happy Work Anniversary!</h2>
        <p className="text-white/90 text-lg font-medium">{name}</p>
        <p className="text-white font-bold text-3xl my-3">{yearsOfService} Year{yearsOfService !== 1 ? "s" : ""}</p>
        <p className="text-white/75 text-sm max-w-xs mx-auto">{message || "Thank you for your incredible dedication and contributions."}</p>
        <p className="text-white/50 text-xs mt-6">{companyName} • {year}</p>
      </div>
    </div>
  );
}

function Starlight({ name, yearsOfService, companyName, message, year }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(160deg, hsl(230 40% 12%), hsl(250 30% 18%))", minHeight: 320 }}>
      {[...Array(15)].map((_, i) => (
        <div key={i} className="absolute rounded-full"
          style={{
            width: 2 + (i % 3), height: 2 + (i % 3),
            top: `${(i * 13 + 5) % 85}%`, left: `${(i * 19 + 3) % 92}%`,
            background: "hsl(48 100% 80%)", opacity: 0.3 + (i % 3) * 0.2,
          }} />
      ))}
      <div className="relative z-10">
        <p className="text-4xl mb-2">⭐</p>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "hsl(48 80% 70%)" }}>Work Anniversary</h2>
        <p className="text-lg font-medium text-white/90">{name}</p>
        <p className="font-bold text-3xl my-3" style={{ color: "hsl(48 80% 70%)" }}>{yearsOfService} Year{yearsOfService !== 1 ? "s" : ""}</p>
        <p className="text-white/65 text-sm max-w-xs mx-auto">{message || "You are a shining star in our team. Thank you for everything!"}</p>
        <p className="text-white/40 text-xs mt-6">{companyName} • {year}</p>
      </div>
    </div>
  );
}

function NatureGarden({ name, yearsOfService, companyName, message, year }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(150deg, hsl(140 40% 92%), hsl(160 50% 85%))", minHeight: 320 }}>
      <div className="absolute top-4 right-6 text-3xl opacity-20">🌿</div>
      <div className="absolute bottom-6 left-6 text-3xl opacity-20">🍃</div>
      <div className="relative z-10">
        <p className="text-5xl mb-3">🌸</p>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "hsl(152 50% 28%)" }}>Happy Anniversary!</h2>
        <p className="text-lg font-medium" style={{ color: "hsl(152 60% 35%)" }}>{name}</p>
        <p className="font-bold text-3xl my-3" style={{ color: "hsl(152 50% 28%)" }}>{yearsOfService} Year{yearsOfService !== 1 ? "s" : ""}</p>
        <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(152 30% 35%)" }}>{message || "Your growth within our team has been truly remarkable."}</p>
        <p className="text-xs mt-6" style={{ color: "hsl(152 30% 35% / 0.5)" }}>{companyName} • {year}</p>
      </div>
    </div>
  );
}

function RoyalPurple({ name, yearsOfService, companyName, message, year }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(135deg, hsl(270 60% 35%), hsl(290 50% 45%))", minHeight: 320 }}>
      <div className="absolute inset-0 opacity-10"
        style={{ background: "radial-gradient(circle at 70% 30%, hsl(0 0% 100%), transparent 50%)" }} />
      <div className="relative z-10">
        <p className="text-4xl mb-2">👑</p>
        <h2 className="text-2xl font-bold text-white mb-1">Work Anniversary</h2>
        <p className="text-white/90 text-lg font-medium">{name}</p>
        <p className="text-white font-bold text-3xl my-3">{yearsOfService} Year{yearsOfService !== 1 ? "s" : ""}</p>
        <p className="text-white/70 text-sm max-w-xs mx-auto">{message || "Your loyalty and excellence continue to inspire us all."}</p>
        <p className="text-white/40 text-xs mt-6">{companyName} • {year}</p>
      </div>
    </div>
  );
}

function CelebrationCard({ name, yearsOfService, companyName, message, year }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(135deg, hsl(38 90% 50%), hsl(15 85% 55%))", minHeight: 320 }}>
      {[...Array(12)].map((_, i) => (
        <div key={i} className="absolute opacity-25"
          style={{
            width: 8, height: 8,
            top: `${(i * 15 + 10) % 80}%`, left: `${(i * 21 + 5) % 90}%`,
            background: "hsl(0 0% 100%)", borderRadius: i % 2 === 0 ? "50%" : "2px",
            transform: `rotate(${i * 30}deg)`,
          }} />
      ))}
      <div className="relative z-10">
        <p className="text-5xl mb-3">🎊</p>
        <h2 className="text-2xl font-bold text-white mb-1">Congratulations!</h2>
        <p className="text-white/90 text-lg font-medium">{name}</p>
        <p className="text-white font-bold text-3xl my-3">{yearsOfService} Year{yearsOfService !== 1 ? "s" : ""}</p>
        <p className="text-white/75 text-sm max-w-xs mx-auto">{message || "Thank you for being an invaluable part of our journey!"}</p>
        <p className="text-white/50 text-xs mt-6">{companyName} • {year}</p>
      </div>
    </div>
  );
}

// --- Holiday card components ---

function Fireworks({ name, companyName, message, year }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(180deg, hsl(230 30% 8%), hsl(240 25% 15%))", minHeight: 320 }}>
      {[...Array(18)].map((_, i) => (
        <div key={i} className="absolute rounded-full"
          style={{
            width: 3 + (i % 4) * 2, height: 3 + (i % 4) * 2,
            top: `${(i * 11 + 5) % 70}%`, left: `${(i * 17 + 8) % 90}%`,
            background: ["hsl(48 100% 67%)", "hsl(0 80% 60%)", "hsl(200 80% 65%)", "hsl(120 60% 55%)"][i % 4],
            opacity: 0.5,
          }} />
      ))}
      <div className="relative z-10">
        <p className="text-5xl mb-3">🎆</p>
        <h2 className="text-2xl font-bold text-white mb-1">Happy New Year!</h2>
        <p className="text-white/90 text-lg font-medium mb-4">{name}</p>
        <p className="text-white/70 text-sm max-w-xs mx-auto">{message || "Wishing you a year filled with new hopes, joy, and success!"}</p>
        <p className="text-white/40 text-xs mt-6">{companyName} • {year}</p>
      </div>
    </div>
  );
}

function GoldenCountdown({ name, companyName, message, year }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(135deg, hsl(240 20% 10%), hsl(260 20% 18%))", minHeight: 320, border: "2px solid hsl(43 80% 50%)" }}>
      <div className="absolute inset-6 rounded-lg" style={{ border: "1px solid hsl(43 80% 50% / 0.2)" }} />
      <div className="relative z-10">
        <p className="text-6xl font-bold mb-2" style={{ color: "hsl(43 80% 60%)", fontFamily: "Georgia, serif" }}>{year}</p>
        <h2 className="text-xl font-bold text-white mb-1">Happy New Year!</h2>
        <p className="text-lg font-medium mb-4" style={{ color: "hsl(43 80% 70%)" }}>{name}</p>
        <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(0 0% 65%)" }}>{message || "May the new year bring you prosperity and happiness."}</p>
        <p className="text-xs mt-6" style={{ color: "hsl(43 80% 50% / 0.5)" }}>{companyName}</p>
      </div>
    </div>
  );
}

function CrescentMoon({ name, companyName, message, year }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(160deg, hsl(210 50% 15%), hsl(230 40% 25%))", minHeight: 320 }}>
      <div className="absolute top-8 right-10 w-16 h-16 rounded-full opacity-20" style={{ background: "hsl(43 80% 60%)", boxShadow: "inset 6px -4px 0 0 hsl(210 50% 15%)" }} />
      {[...Array(10)].map((_, i) => (
        <div key={i} className="absolute rounded-full" style={{
          width: 2, height: 2, top: `${(i * 19 + 10) % 80}%`, left: `${(i * 23 + 15) % 85}%`,
          background: "hsl(43 80% 70%)", opacity: 0.3,
        }} />
      ))}
      <div className="relative z-10">
        <p className="text-5xl mb-3">🌙</p>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "hsl(43 80% 70%)" }}>Eid Mubarak!</h2>
        <p className="text-white/90 text-lg font-medium mb-4">{name}</p>
        <p className="text-white/65 text-sm max-w-xs mx-auto">{message || "May this blessed occasion bring peace, happiness, and prosperity to you and your family."}</p>
        <p className="text-white/40 text-xs mt-6">{companyName} • {year}</p>
      </div>
    </div>
  );
}

function EidLanterns({ name, companyName, message, year }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(180deg, hsl(170 40% 20%), hsl(180 35% 12%))", minHeight: 320 }}>
      <div className="absolute top-0 left-1/4 w-0.5 h-12 opacity-20" style={{ background: "hsl(43 80% 60%)" }} />
      <div className="absolute top-0 left-1/2 w-0.5 h-16 opacity-20" style={{ background: "hsl(43 80% 60%)" }} />
      <div className="absolute top-0 right-1/4 w-0.5 h-10 opacity-20" style={{ background: "hsl(43 80% 60%)" }} />
      <div className="relative z-10 mt-4">
        <p className="text-5xl mb-3">🏮</p>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "hsl(43 80% 65%)" }}>Eid Mubarak!</h2>
        <p className="text-white/90 text-lg font-medium mb-4">{name}</p>
        <p className="text-white/65 text-sm max-w-xs mx-auto">{message || "Wishing you joy, prosperity, and blessings on this sacred celebration."}</p>
        <p className="text-white/40 text-xs mt-6">{companyName} • {year}</p>
      </div>
    </div>
  );
}

function WinterWonderland({ name, companyName, message, year }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(180deg, hsl(210 40% 88%), hsl(200 50% 80%))", minHeight: 320 }}>
      {[...Array(14)].map((_, i) => (
        <div key={i} className="absolute rounded-full opacity-40"
          style={{
            width: 4 + (i % 3) * 3, height: 4 + (i % 3) * 3,
            top: `${(i * 14 + 3) % 85}%`, left: `${(i * 19 + 7) % 90}%`,
            background: "hsl(0 0% 100%)",
          }} />
      ))}
      <div className="relative z-10">
        <p className="text-5xl mb-3">🎄</p>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "hsl(150 60% 25%)" }}>Merry Christmas!</h2>
        <p className="text-lg font-medium mb-4" style={{ color: "hsl(0 70% 45%)" }}>{name}</p>
        <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(210 20% 30%)" }}>{message || "Wishing you a joyful holiday season and a wonderful new year!"}</p>
        <p className="text-xs mt-6" style={{ color: "hsl(210 20% 30% / 0.5)" }}>{companyName} • {year}</p>
      </div>
    </div>
  );
}

function FestiveRed({ name, companyName, message, year }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(135deg, hsl(0 65% 42%), hsl(350 60% 35%))", minHeight: 320 }}>
      <div className="absolute top-0 right-0 w-24 h-24 opacity-10" style={{ background: "hsl(43 80% 60%)", borderRadius: "0 1rem 0 100%" }} />
      <div className="relative z-10">
        <p className="text-5xl mb-3">🎅</p>
        <h2 className="text-2xl font-bold text-white mb-1">Merry Christmas!</h2>
        <p className="text-white/90 text-lg font-medium mb-4">{name}</p>
        <p className="text-white/70 text-sm max-w-xs mx-auto">{message || "May the magic of Christmas fill your heart with warmth and cheer."}</p>
        <p className="text-white/50 text-xs mt-6">{companyName} • {year}</p>
      </div>
    </div>
  );
}

function TropicalVibes({ name, companyName, message, year }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(135deg, hsl(180 60% 45%), hsl(160 50% 55%))", minHeight: 320 }}>
      <div className="absolute top-4 left-6 text-3xl opacity-25">🌴</div>
      <div className="absolute bottom-6 right-6 text-3xl opacity-25">🌺</div>
      <div className="relative z-10">
        <p className="text-5xl mb-3">🏖️</p>
        <h2 className="text-2xl font-bold text-white mb-1">Happy Holidays!</h2>
        <p className="text-white/90 text-lg font-medium mb-4">{name}</p>
        <p className="text-white/70 text-sm max-w-xs mx-auto">{message || "Relax, recharge, and enjoy this well-deserved break!"}</p>
        <p className="text-white/50 text-xs mt-6">{companyName} • {year}</p>
      </div>
    </div>
  );
}

function WarmWishes({ name, companyName, message, year }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(160deg, hsl(30 60% 92%), hsl(20 50% 85%))", minHeight: 320 }}>
      <div className="absolute inset-0 opacity-5" style={{ background: "radial-gradient(circle at 30% 70%, hsl(30 80% 50%), transparent 60%)" }} />
      <div className="relative z-10">
        <p className="text-5xl mb-3">🌟</p>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "hsl(25 60% 30%)" }}>Happy Holidays!</h2>
        <p className="text-lg font-medium mb-4" style={{ color: "hsl(25 50% 40%)" }}>{name}</p>
        <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(25 30% 40%)" }}>{message || "Wishing you warmth, joy, and a peaceful holiday season."}</p>
        <p className="text-xs mt-6" style={{ color: "hsl(25 30% 40% / 0.5)" }}>{companyName} • {year}</p>
      </div>
    </div>
  );
}

export const cardTemplates: React.FC<CardTemplateProps>[] = [
  ConfettiBurst,
  ElegantGold,
  ModernGeometric,
  WarmSunset,
  MinimalistCard,
  OceanBreeze,
  Starlight,
  NatureGarden,
  RoyalPurple,
  CelebrationCard,
  Fireworks,
  GoldenCountdown,
  CrescentMoon,
  EidLanterns,
  WinterWonderland,
  FestiveRed,
  TropicalVibes,
  WarmWishes,
];
