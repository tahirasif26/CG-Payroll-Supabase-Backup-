import React from "react";

export interface CardTemplateProps {
  name: string;
  occasion: "birthday" | "anniversary";
  yearsOfService?: number;
  companyName: string;
  year: number;
  message?: string;
}

const templateMeta = [
  { id: 1, name: "Confetti Burst", type: "birthday" },
  { id: 2, name: "Elegant Gold", type: "birthday" },
  { id: 3, name: "Modern Geometric", type: "birthday" },
  { id: 4, name: "Warm Sunset", type: "birthday" },
  { id: 5, name: "Minimalist", type: "birthday" },
  { id: 6, name: "Ocean Breeze", type: "anniversary" },
  { id: 7, name: "Starlight", type: "anniversary" },
  { id: 8, name: "Nature Garden", type: "anniversary" },
  { id: 9, name: "Royal Purple", type: "anniversary" },
  { id: 10, name: "Celebration", type: "anniversary" },
] as const;

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
];
