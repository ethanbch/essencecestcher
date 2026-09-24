import { ImageResponse } from "next/og";

export const alt = "Essence c'est cher — le plein au meilleur prix près de chez vous";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#f4f2ec",
          color: "#0e1013",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "#0e1013", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="38" height="38" viewBox="0 0 24 24">
              <path fill="#c8f53a" d="M12 2.5c-.3 0-.6.2-.8.4C9.6 5 5.5 10.4 5.5 14.3a6.5 6.5 0 0 0 13 0c0-3.9-4.1-9.3-5.7-11.4a1 1 0 0 0-.8-.4Z" />
            </svg>
          </div>
          <div style={{ fontSize: 36, fontWeight: 800 }}>essence, c&apos;est cher</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 92, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>
          <div>Le plein,</div>
          <div style={{ display: "flex" }}>
            au&nbsp;<span style={{ background: "#c8f53a", padding: "0 12px" }}>meilleur prix</span>
          </div>
          <div>près de chez vous.</div>
        </div>
        <div style={{ fontSize: 28, color: "#3a3e45" }}>Prix officiels de l&apos;État · mis à jour chaque matin · gratuit</div>
      </div>
    ),
    size,
  );
}
