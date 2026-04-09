export default function AuthLayout({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1a56db 0%, #3b82f6 50%, #60a5fa 100%)",
        fontFamily: "'Inter', sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
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
