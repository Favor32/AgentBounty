import Link from "next/link";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#080B0F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "monospace", padding: "40px", textAlign: "center" }}>

      <div style={{ border: "1px solid rgba(0,255,148,0.2)", background: "rgba(0,255,148,0.1)", padding: "6px 16px", borderRadius: "4px", marginBottom: "32px" }}>
        <span style={{ color: "#00FF94", fontSize: "12px", letterSpacing: "3px" }}>● BOUNDLESS × TRUSTLESS WORK HACKATHON</span>
      </div>

      <h1 style={{ fontSize: "64px", fontWeight: "bold", color: "#E8F4FF", margin: "0 0 24px", lineHeight: 1 }}>
        AGENT<span style={{ color: "#00FF94" }}>BOUNTY</span>
      </h1>

      <p style={{ color: "#7A9AB5", fontSize: "18px", maxWidth: "500px", lineHeight: 1.6, margin: "0 0 12px" }}>
        AI agents fund trustless bounties.<br />
        Developers build. CI verifies. Escrow releases.
      </p>

      <p style={{ color: "#4A6580", fontSize: "14px", maxWidth: "440px", lineHeight: 1.6, margin: "0 0 48px" }}>
        No middlemen. No trust required. Every payment is conditioned on objective CI test outcomes — verified on-chain via Trustless Work.
      </p>

      <div style={{ display: "flex", gap: "16px", marginBottom: "80px" }}>
        <Link href="/dashboard" style={{ background: "#00FF94", color: "#080B0F", fontWeight: "bold", padding: "12px 32px", borderRadius: "4px", textDecoration: "none", fontSize: "14px", letterSpacing: "2px" }}>
          VIEW BOUNTIES →
        </Link>
        <Link href="/agent" style={{ border: "1px solid #1C2A3A", color: "#E8F4FF", padding: "12px 32px", borderRadius: "4px", textDecoration: "none", fontSize: "14px", letterSpacing: "2px" }}>
          ATLAS AGENT ◎
        </Link>
      </div>

      <div style={{ display: "flex", gap: "64px" }}>
        {[
          { label: "trust model",  value: "ZERO",    unit: "custody" },
          { label: "release cond", value: "CI PASS", unit: "objective" },
          { label: "network",      value: "SEPOLIA",  unit: "testnet" },
        ].map(({ label, value, unit }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ color: "#00FF94", fontSize: "28px", fontWeight: "bold" }}>{value}</div>
            <div style={{ color: "#4A6580", fontSize: "11px", letterSpacing: "2px", marginTop: "4px" }}>{label}</div>
            <div style={{ color: "#4A6580", fontSize: "10px", opacity: 0.6 }}>{unit}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "64px", display: "flex", alignItems: "center", gap: "8px", color: "#4A6580", fontSize: "12px" }}>
        {["ATLAS DETECTS", "→", "ESCROW FUNDED", "→", "DEV CLAIMS", "→", "CI VERIFIES", "→", "FUNDS RELEASED"].map((item, i) => (
          <span key={i} style={{ color: ["ESCROW FUNDED", "FUNDS RELEASED"].includes(item) ? "#00FF94" : item === "→" ? "#1C2A3A" : "#4A6580" }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}