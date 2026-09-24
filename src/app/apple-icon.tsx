import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0e1013" }}>
        <svg width="104" height="104" viewBox="0 0 24 24">
          <path
            fill="#c8f53a"
            d="M12 2.5c-.3 0-.6.2-.8.4C9.6 5 5.5 10.4 5.5 14.3a6.5 6.5 0 0 0 13 0c0-3.9-4.1-9.3-5.7-11.4a1 1 0 0 0-.8-.4Z"
          />
        </svg>
      </div>
    ),
    size,
  );
}
