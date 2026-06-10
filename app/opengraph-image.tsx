import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DNA Explorer — Explore seu código genético no navegador";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #050710 0%, #0b0f1a 55%, #11162b 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          position: "relative",
          fontFamily: "system-ui, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Top-right glow */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,211,238,0.18) 0%, transparent 70%)",
          }}
        />
        {/* Bottom-left glow */}
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -60,
            width: 440,
            height: 440,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Privacy badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(34,211,238,0.08)",
            border: "1px solid rgba(34,211,238,0.25)",
            borderRadius: 8,
            padding: "7px 16px",
            marginBottom: 36,
            fontSize: 14,
            color: "rgba(34,211,238,0.85)",
            letterSpacing: "0.02em",
          }}
        >
          🔒 100% Client-Side · Open Source · MIT License
        </div>

        {/* Main title */}
        <div
          style={{
            fontSize: 76,
            fontWeight: 900,
            color: "#e6ecf5",
            lineHeight: 1.05,
            marginBottom: 24,
            letterSpacing: "-2px",
          }}
        >
          DNA Explorer
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 26,
            color: "rgba(148,163,184,0.85)",
            marginBottom: 52,
            maxWidth: 720,
            lineHeight: 1.45,
          }}
        >
          Seu genoma, revelado no navegador. Hélice 3D · Cariótipo · Dashboard · Privacidade total.
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 52 }}>
          {[
            ["~600k", "SNPs por arquivo"],
            ["100+", "Variantes curadas"],
            ["5+", "Provedores"],
            ["0 bytes", "Enviados para servidores"],
          ].map(([val, label]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 34, fontWeight: 800, color: "#22d3ee" }}>{val}</span>
              <span style={{ fontSize: 13, color: "rgba(148,163,184,0.65)" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 80,
            right: 80,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(31,39,57,0.9)",
            paddingTop: 20,
            color: "rgba(100,116,139,0.6)",
            fontSize: 13,
          }}
        >
          <span>github.com/caioross/DNAExplorer</span>
          <span>v0.1.0 · GRCh37 / hg19</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
