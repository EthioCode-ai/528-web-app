export default function AuthLayout({ children }) {
  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: "url('/auth-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        fontFamily: "'Inter', sans-serif",
        padding: 24,
      }}
    >
      {/* Dark overlay for card readability — sits between the image and the card */}
      <div
        className="bg-black/30"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 420,
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
          padding: "40px 36px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#1a56db",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            528 AI
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#6b7280",
              margin: "6px 0 0",
              fontWeight: 500,
            }}
          >
            MCAT Prep, Powered by AI
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
