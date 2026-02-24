import React from "react";

export type CardOccasion = "birthday" | "anniversary" | "new_year" | "eid" | "christmas" | "holiday";

export interface CardTemplateProps {
  name: string;
  occasion: CardOccasion;
  yearsOfService?: number;
  companyName: string;
  companyLogo?: string;
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
  { id: 13, name: "Midnight Sparkle", type: "new_year" as CardOccasion },
  { id: 14, name: "Aurora Borealis", type: "new_year" as CardOccasion },
  { id: 15, name: "Crescent Moon", type: "eid" as CardOccasion },
  { id: 16, name: "Eid Lanterns", type: "eid" as CardOccasion },
  { id: 17, name: "Arabesque", type: "eid" as CardOccasion },
  { id: 18, name: "Eid Garden", type: "eid" as CardOccasion },
  { id: 19, name: "Winter Wonderland", type: "christmas" as CardOccasion },
  { id: 20, name: "Festive Red", type: "christmas" as CardOccasion },
  { id: 21, name: "Snow Globe", type: "christmas" as CardOccasion },
  { id: 22, name: "Pine Forest", type: "christmas" as CardOccasion },
  { id: 23, name: "Tropical Vibes", type: "holiday" as CardOccasion },
  { id: 24, name: "Warm Wishes", type: "holiday" as CardOccasion },
  { id: 25, name: "Mountain Escape", type: "holiday" as CardOccasion },
  { id: 26, name: "Sunset Beach", type: "holiday" as CardOccasion },
];

export function getTemplateForEmployee(employeeId: string, year: number, occasion: "birthday" | "anniversary") {
  const hash = [...employeeId].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const templates = occasion === "birthday" ? [0, 1, 2, 3, 4] : [5, 6, 7, 8, 9];
  const idx = (year + hash) % templates.length;
  return templates[idx];
}

export { templateMeta };

function CompanyBranding({ companyName, companyLogo, color = "inherit", opacity = 1 }: { companyName: string; companyLogo?: string; color?: string; opacity?: number }) {
  return (
    <div className="flex items-center justify-center gap-2" style={{ opacity }}>
      {companyLogo && <img src={companyLogo} alt="" className="h-5 w-auto max-w-[60px] object-contain" />}
      <span style={{ color }} className="text-xs">{companyName}</span>
    </div>
  );
}

// --- Birthday card components ---

function ConfettiBurst({ name, companyName, companyLogo, message }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(135deg, hsl(340 80% 55%), hsl(280 70% 60%), hsl(210 80% 55%))", minHeight: 320 }}>
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
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(0 0% 100% / 0.5)" /></div>
      </div>
    </div>
  );
}

function ElegantGold({ name, companyName, companyLogo, message }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(160deg, hsl(240 15% 12%), hsl(240 15% 18%))", minHeight: 320, border: "2px solid hsl(43 80% 55%)" }}>
      <div className="absolute inset-4 rounded-xl" style={{ border: "1px solid hsl(43 80% 55% / 0.3)" }} />
      <div className="relative z-10">
        <p className="text-4xl mb-2" style={{ color: "hsl(43 80% 55%)" }}>✦</p>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "hsl(43 80% 65%)", fontFamily: "Georgia, serif" }}>Happy Birthday</h2>
        <p className="text-lg font-medium mb-4" style={{ color: "hsl(43 80% 75%)" }}>{name}</p>
        <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(0 0% 70%)" }}>{message || "May your special day be filled with happiness and wonderful moments."}</p>
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(43 80% 55% / 0.5)" /></div>
      </div>
    </div>
  );
}

function ModernGeometric({ name, companyName, companyLogo, message }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "hsl(0 0% 98%)", minHeight: 320 }}>
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10" style={{ background: "hsl(233 90% 60%)", clipPath: "polygon(100% 0, 0 0, 100% 100%)" }} />
      <div className="absolute bottom-0 left-0 w-24 h-24 opacity-10" style={{ background: "hsl(152 69% 40%)", clipPath: "polygon(0 100%, 100% 100%, 0 0)" }} />
      <div className="relative z-10">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center text-2xl" style={{ background: "hsl(233 90% 60%)" }}>
          <span className="text-white">🎉</span>
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "hsl(240 20% 12%)" }}>Happy Birthday!</h2>
        <p className="text-lg font-medium mb-4" style={{ color: "hsl(233 90% 60%)" }}>{name}</p>
        <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(220 9% 46%)" }}>{message || "Here's to another year of great achievements and cherished memories."}</p>
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(220 9% 46% / 0.6)" /></div>
      </div>
    </div>
  );
}

function WarmSunset({ name, companyName, companyLogo, message }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(135deg, hsl(25 95% 55%), hsl(340 75% 55%))", minHeight: 320 }}>
      <div className="relative z-10">
        <p className="text-5xl mb-3">🌅</p>
        <h2 className="text-2xl font-bold text-white mb-1">Happy Birthday!</h2>
        <p className="text-white/90 text-lg font-medium mb-4">{name}</p>
        <p className="text-white/75 text-sm max-w-xs mx-auto">{message || "May your day be as warm and bright as the most beautiful sunset."}</p>
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(0 0% 100% / 0.5)" /></div>
      </div>
    </div>
  );
}

function MinimalistCard({ name, companyName, companyLogo, message }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "hsl(0 0% 100%)", minHeight: 320, border: "1px solid hsl(230 30% 91%)" }}>
      <div className="relative z-10">
        <div className="w-16 h-0.5 mx-auto mb-6" style={{ background: "hsl(233 90% 60%)" }} />
        <h2 className="text-xl font-semibold mb-1" style={{ color: "hsl(240 20% 12%)" }}>Happy Birthday</h2>
        <p className="text-2xl font-bold mb-6" style={{ color: "hsl(233 90% 60%)" }}>{name}</p>
        <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(220 9% 46%)" }}>{message || "Wishing you all the best on your special day."}</p>
        <div className="w-16 h-0.5 mx-auto mt-6 mb-3" style={{ background: "hsl(233 90% 60%)" }} />
        <CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(220 9% 46% / 0.6)" />
      </div>
    </div>
  );
}

// --- Anniversary card components ---

function OceanBreeze({ name, yearsOfService, companyName, companyLogo, message }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(180deg, hsl(200 80% 50%), hsl(210 90% 40%))", minHeight: 320 }}>
      <div className="relative z-10">
        <p className="text-5xl mb-3">🌊</p>
        <h2 className="text-2xl font-bold text-white mb-1">Happy Work Anniversary!</h2>
        <p className="text-white/90 text-lg font-medium">{name}</p>
        <p className="text-white font-bold text-3xl my-3">{yearsOfService} Year{yearsOfService !== 1 ? "s" : ""}</p>
        <p className="text-white/75 text-sm max-w-xs mx-auto">{message || "Thank you for your incredible dedication and contributions."}</p>
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(0 0% 100% / 0.5)" /></div>
      </div>
    </div>
  );
}

function Starlight({ name, yearsOfService, companyName, companyLogo, message }: CardTemplateProps) {
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
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(0 0% 100% / 0.4)" /></div>
      </div>
    </div>
  );
}

function NatureGarden({ name, yearsOfService, companyName, companyLogo, message }: CardTemplateProps) {
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
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(152 30% 35% / 0.5)" /></div>
      </div>
    </div>
  );
}

function RoyalPurple({ name, yearsOfService, companyName, companyLogo, message }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(135deg, hsl(270 60% 35%), hsl(290 50% 45%))", minHeight: 320 }}>
      <div className="relative z-10">
        <p className="text-4xl mb-2">👑</p>
        <h2 className="text-2xl font-bold text-white mb-1">Work Anniversary</h2>
        <p className="text-white/90 text-lg font-medium">{name}</p>
        <p className="text-white font-bold text-3xl my-3">{yearsOfService} Year{yearsOfService !== 1 ? "s" : ""}</p>
        <p className="text-white/70 text-sm max-w-xs mx-auto">{message || "Your loyalty and excellence continue to inspire us all."}</p>
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(0 0% 100% / 0.4)" /></div>
      </div>
    </div>
  );
}

function CelebrationCard({ name, yearsOfService, companyName, companyLogo, message }: CardTemplateProps) {
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
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(0 0% 100% / 0.5)" /></div>
      </div>
    </div>
  );
}

// --- New Year card components (NO year displayed) ---

function Fireworks({ name, companyName, companyLogo, message }: CardTemplateProps) {
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
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(0 0% 100% / 0.4)" /></div>
      </div>
    </div>
  );
}

function GoldenCountdown({ name, companyName, companyLogo, message }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(135deg, hsl(240 20% 10%), hsl(260 20% 18%))", minHeight: 320, border: "2px solid hsl(43 80% 50%)" }}>
      <div className="absolute inset-6 rounded-lg" style={{ border: "1px solid hsl(43 80% 50% / 0.2)" }} />
      <div className="relative z-10">
        <p className="text-4xl mb-2" style={{ color: "hsl(43 80% 60%)" }}>✦</p>
        <h2 className="text-xl font-bold text-white mb-1">Happy New Year!</h2>
        <p className="text-lg font-medium mb-4" style={{ color: "hsl(43 80% 70%)" }}>{name}</p>
        <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(0 0% 65%)" }}>{message || "May the new year bring you prosperity and happiness."}</p>
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(43 80% 50% / 0.5)" /></div>
      </div>
    </div>
  );
}

function MidnightSparkle({ name, companyName, companyLogo, message }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(180deg, hsl(250 40% 8%), hsl(270 30% 15%))", minHeight: 320 }}>
      {[...Array(25)].map((_, i) => (
        <div key={i} className="absolute"
          style={{
            width: 1 + (i % 3), height: 1 + (i % 3),
            top: `${(i * 9 + 2) % 90}%`, left: `${(i * 14 + 5) % 95}%`,
            background: "hsl(0 0% 100%)", borderRadius: "50%", opacity: 0.2 + (i % 4) * 0.15,
          }} />
      ))}
      <div className="relative z-10">
        <p className="text-5xl mb-3">✨</p>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "hsl(280 80% 80%)" }}>Happy New Year!</h2>
        <p className="text-white/90 text-lg font-medium mb-4">{name}</p>
        <p className="text-white/65 text-sm max-w-xs mx-auto">{message || "A sparkling new year awaits — may it be your best one yet!"}</p>
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(280 80% 80% / 0.4)" /></div>
      </div>
    </div>
  );
}

function AuroraBorealis({ name, companyName, companyLogo, message }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(180deg, hsl(220 30% 10%), hsl(180 40% 18%), hsl(140 30% 12%))", minHeight: 320 }}>
      <div className="absolute top-0 left-0 right-0 h-1/2 opacity-15"
        style={{ background: "linear-gradient(135deg, hsl(160 80% 50%), hsl(200 80% 60%), hsl(280 60% 55%))", filter: "blur(30px)" }} />
      <div className="relative z-10">
        <p className="text-5xl mb-3">🌌</p>
        <h2 className="text-2xl font-bold text-white mb-1">Happy New Year!</h2>
        <p className="text-lg font-medium mb-4" style={{ color: "hsl(160 70% 70%)" }}>{name}</p>
        <p className="text-white/65 text-sm max-w-xs mx-auto">{message || "Like the northern lights, may your new year be filled with wonder and brilliance."}</p>
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(0 0% 100% / 0.4)" /></div>
      </div>
    </div>
  );
}

// --- Eid card components ---

function CrescentMoon({ name, companyName, companyLogo, message }: CardTemplateProps) {
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
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(0 0% 100% / 0.4)" /></div>
      </div>
    </div>
  );
}

function EidLanterns({ name, companyName, companyLogo, message }: CardTemplateProps) {
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
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(0 0% 100% / 0.4)" /></div>
      </div>
    </div>
  );
}

function Arabesque({ name, companyName, companyLogo, message }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(135deg, hsl(35 60% 20%), hsl(25 50% 15%))", minHeight: 320 }}>
      <div className="absolute inset-4 rounded-xl opacity-20" style={{ border: "2px solid hsl(43 80% 55%)" }} />
      <div className="absolute inset-6 rounded-lg opacity-10" style={{ border: "1px solid hsl(43 80% 55%)" }} />
      <div className="relative z-10">
        <p className="text-5xl mb-3">🕌</p>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "hsl(43 80% 65%)", fontFamily: "Georgia, serif" }}>Eid Mubarak</h2>
        <p className="text-lg font-medium mb-4" style={{ color: "hsl(43 80% 75%)" }}>{name}</p>
        <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(30 30% 65%)" }}>{message || "May the spirit of Eid fill your home with love, your heart with peace, and your life with joy."}</p>
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(43 80% 55% / 0.5)" /></div>
      </div>
    </div>
  );
}

function EidGarden({ name, companyName, companyLogo, message }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(160deg, hsl(160 30% 88%), hsl(170 35% 82%))", minHeight: 320 }}>
      <div className="absolute top-4 left-6 text-2xl opacity-20">🌿</div>
      <div className="absolute bottom-4 right-6 text-2xl opacity-20">🌺</div>
      <div className="absolute top-6 right-8 text-xl opacity-15">☪️</div>
      <div className="relative z-10">
        <p className="text-5xl mb-3">🌙</p>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "hsl(170 50% 25%)" }}>Eid Mubarak!</h2>
        <p className="text-lg font-medium mb-4" style={{ color: "hsl(170 40% 35%)" }}>{name}</p>
        <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(170 25% 35%)" }}>{message || "A garden of blessings for you and your family on this joyous occasion."}</p>
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(170 30% 35% / 0.5)" /></div>
      </div>
    </div>
  );
}

// --- Christmas card components ---

function WinterWonderland({ name, companyName, companyLogo, message }: CardTemplateProps) {
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
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(210 20% 30% / 0.5)" /></div>
      </div>
    </div>
  );
}

function FestiveRed({ name, companyName, companyLogo, message }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(135deg, hsl(0 65% 42%), hsl(350 60% 35%))", minHeight: 320 }}>
      <div className="absolute top-0 right-0 w-24 h-24 opacity-10" style={{ background: "hsl(43 80% 60%)", borderRadius: "0 1rem 0 100%" }} />
      <div className="relative z-10">
        <p className="text-5xl mb-3">🎅</p>
        <h2 className="text-2xl font-bold text-white mb-1">Merry Christmas!</h2>
        <p className="text-white/90 text-lg font-medium mb-4">{name}</p>
        <p className="text-white/70 text-sm max-w-xs mx-auto">{message || "May the magic of Christmas fill your heart with warmth and cheer."}</p>
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(0 0% 100% / 0.5)" /></div>
      </div>
    </div>
  );
}

function SnowGlobe({ name, companyName, companyLogo, message }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(180deg, hsl(220 30% 15%), hsl(210 25% 22%))", minHeight: 320 }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full opacity-5"
        style={{ border: "2px solid hsl(200 60% 70%)" }} />
      {[...Array(20)].map((_, i) => (
        <div key={i} className="absolute rounded-full"
          style={{
            width: 2 + (i % 3), height: 2 + (i % 3),
            top: `${(i * 12 + 8) % 85}%`, left: `${(i * 16 + 10) % 88}%`,
            background: "hsl(0 0% 100%)", opacity: 0.15 + (i % 3) * 0.1,
          }} />
      ))}
      <div className="relative z-10">
        <p className="text-5xl mb-3">🎿</p>
        <h2 className="text-2xl font-bold text-white mb-1">Merry Christmas!</h2>
        <p className="text-lg font-medium mb-4" style={{ color: "hsl(200 60% 75%)" }}>{name}</p>
        <p className="text-white/60 text-sm max-w-xs mx-auto">{message || "May your holidays be as magical as a snow globe world."}</p>
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(0 0% 100% / 0.4)" /></div>
      </div>
    </div>
  );
}

function PineForest({ name, companyName, companyLogo, message }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(180deg, hsl(150 35% 22%), hsl(160 30% 15%))", minHeight: 320 }}>
      <div className="absolute bottom-0 left-0 right-0 h-20 opacity-10"
        style={{ background: "linear-gradient(0deg, hsl(0 0% 100%), transparent)" }} />
      <div className="relative z-10">
        <p className="text-5xl mb-3">🌲</p>
        <h2 className="text-2xl font-bold text-white mb-1">Merry Christmas!</h2>
        <p className="text-lg font-medium mb-4" style={{ color: "hsl(120 40% 70%)" }}>{name}</p>
        <p className="text-white/65 text-sm max-w-xs mx-auto">{message || "Peace, love, and joy to you this Christmas season."}</p>
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(0 0% 100% / 0.4)" /></div>
      </div>
    </div>
  );
}

// --- Holiday card components ---

function TropicalVibes({ name, companyName, companyLogo, message }: CardTemplateProps) {
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
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(0 0% 100% / 0.5)" /></div>
      </div>
    </div>
  );
}

function WarmWishes({ name, companyName, companyLogo, message }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(160deg, hsl(30 60% 92%), hsl(20 50% 85%))", minHeight: 320 }}>
      <div className="absolute inset-0 opacity-5" style={{ background: "radial-gradient(circle at 30% 70%, hsl(30 80% 50%), transparent 60%)" }} />
      <div className="relative z-10">
        <p className="text-5xl mb-3">🌟</p>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "hsl(25 60% 30%)" }}>Happy Holidays!</h2>
        <p className="text-lg font-medium mb-4" style={{ color: "hsl(25 50% 40%)" }}>{name}</p>
        <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(25 30% 40%)" }}>{message || "Wishing you warmth, joy, and a peaceful holiday season."}</p>
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(25 30% 40% / 0.5)" /></div>
      </div>
    </div>
  );
}

function MountainEscape({ name, companyName, companyLogo, message }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(180deg, hsl(210 50% 70%), hsl(200 40% 50%), hsl(30 40% 40%))", minHeight: 320 }}>
      <div className="relative z-10">
        <p className="text-5xl mb-3">⛰️</p>
        <h2 className="text-2xl font-bold text-white mb-1">Happy Holidays!</h2>
        <p className="text-white/90 text-lg font-medium mb-4">{name}</p>
        <p className="text-white/70 text-sm max-w-xs mx-auto">{message || "Take a break, breathe in the fresh air, and come back refreshed!"}</p>
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(0 0% 100% / 0.5)" /></div>
      </div>
    </div>
  );
}

function SunsetBeach({ name, companyName, companyLogo, message }: CardTemplateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: "linear-gradient(180deg, hsl(30 80% 60%), hsl(15 70% 50%), hsl(340 40% 35%))", minHeight: 320 }}>
      <div className="absolute bottom-0 left-0 right-0 h-16 opacity-15"
        style={{ background: "linear-gradient(0deg, hsl(200 60% 40%), transparent)" }} />
      <div className="relative z-10">
        <p className="text-5xl mb-3">🌅</p>
        <h2 className="text-2xl font-bold text-white mb-1">Happy Holidays!</h2>
        <p className="text-white/90 text-lg font-medium mb-4">{name}</p>
        <p className="text-white/70 text-sm max-w-xs mx-auto">{message || "Enjoy the sunsets, the sea breeze, and every moment of your holiday."}</p>
        <div className="mt-6"><CompanyBranding companyName={companyName} companyLogo={companyLogo} color="hsl(0 0% 100% / 0.5)" /></div>
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
  MidnightSparkle,
  AuroraBorealis,
  CrescentMoon,
  EidLanterns,
  Arabesque,
  EidGarden,
  WinterWonderland,
  FestiveRed,
  SnowGlobe,
  PineForest,
  TropicalVibes,
  WarmWishes,
  MountainEscape,
  SunsetBeach,
];
