import { ImageResponse } from "next/og";
import { FUELS } from "@/lib/fuels";
import { getAreaIndex } from "@/lib/store";

export const alt = "Prix des carburants dans cette ville";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ ville: string }> }) {
  const { ville } = await params;
  const city = (await getAreaIndex()).cities.get(ville);
  const fuels = city ? FUELS.filter((f) => city.stats[f.id]).slice(0, 3) : [];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "#f4f2ec", color: "#0e1013", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 800 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "#0e1013", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="30" height="30" viewBox="0 0 24 24">
              <path fill="#c8f53a" d="M12 2.5c-.3 0-.6.2-.8.4C9.6 5 5.5 10.4 5.5 14.3a6.5 6.5 0 0 0 13 0c0-3.9-4.1-9.3-5.7-11.4a1 1 0 0 0-.8-.4Z" />
            </svg>
          </div>
          essence, c&apos;est cher
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 36, color: "#3a3e45" }}>Prix des carburants à</div>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05 }}>{city?.name ?? "votre ville"}</div>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {city &&
            fuels.map((f) => (
              <div key={f.id} style={{ display: "flex", flexDirection: "column", background: f.id === fuels[0].id ? "#c8f53a" : "#ffffff", borderRadius: 24, padding: "20px 28px" }}>
                <div style={{ fontSize: 24, color: "#3a3e45" }}>{`${f.label} · moyenne`}</div>
                <div style={{ fontSize: 52, fontWeight: 700 }}>{`${city.stats[f.id]!.avg.toFixed(3).replace(".", ",")} €`}</div>
              </div>
            ))}
        </div>
      </div>
    ),
    size,
  );
}
