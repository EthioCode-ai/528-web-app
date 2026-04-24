import PitchMarquee from "@/components/PitchMarquee";

export default function AuthLayout({ children }) {
  // Lighter-on-the-left dark overlay lets student faces show through the
  // auth-bg photo while keeping the scrolling marquee readable. The card
  // itself is frosted glass (gradient + backdrop-blur) so the top ~40% of
  // the card shows the photo through, the bottom stays solid for the form.
  return (
    <div
      className="relative min-h-screen flex items-center justify-center font-[Inter]"
      style={{
        paddingTop: 140,
        paddingBottom: 40,
        paddingLeft: 20,
        paddingRight: 20,
        backgroundImage:
          "linear-gradient(90deg, rgba(10,15,34,0.58) 0%, rgba(10,15,34,0.32) 28%, rgba(10,15,34,0) 55%, rgba(10,15,34,0) 100%), url('/auth-bg.png')",
        backgroundSize: "auto, cover",
        backgroundPosition: "center, center",
        backgroundRepeat: "no-repeat, no-repeat",
      }}
    >
      {/* Top-left brand mark */}
      <div className="absolute top-7 left-9 z-10 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/95 p-1 flex items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.35)]">
          <img src="/logo.png" alt="528 AI" className="w-full h-full object-contain" />
        </div>
        <div className="leading-tight">
          <div className="text-[18px] font-extrabold text-white tracking-tight">528 AI</div>
          <div className="text-[9px] font-semibold text-white/80 tracking-[0.18em] uppercase mt-1">
            MCAT Study Engine
          </div>
        </div>
      </div>

      {/* Scrolling pitch — hidden below 1050px so the card has full room */}
      <div
        className="absolute z-[5] pointer-events-none hidden min-[1050px]:block"
        style={{
          top: 110,
          left: "5.5%",
          right: "calc(50% + 230px)",
        }}
      >
        <PitchMarquee />
      </div>

      {/* Centered glass card with inline logo + title and the form inside */}
      <div
        className="relative z-[4] w-full max-w-[420px] rounded-[18px] border border-white/35 px-8 pt-7 pb-6 text-slate-900"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.22) 12%, rgba(255,255,255,0.55) 26%, rgba(255,255,255,0.90) 38%, #fff 45%)",
          backdropFilter: "blur(10px) saturate(1.15)",
          WebkitBackdropFilter: "blur(10px) saturate(1.15)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.32), 0 6px 20px rgba(0,0,0,0.18)",
        }}
      >
        <div className="flex items-center justify-center gap-3.5 mb-1">
          <img src="/logo.png" alt="528 AI" className="w-[54px] h-[54px] object-contain" />
          <h1
            className="text-[30px] font-extrabold tracking-tight m-0 leading-none"
            style={{
              color: "#1a56db",
              textShadow: "0 1px 2px rgba(255,255,255,0.55)",
            }}
          >
            528 AI
          </h1>
        </div>
        <p
          className="text-center text-[13px] text-slate-700 font-medium mb-5"
          style={{ textShadow: "0 1px 1px rgba(255,255,255,0.5)" }}
        >
          MCAT Prep, Powered by AI
        </p>
        {children}
      </div>
    </div>
  );
}
