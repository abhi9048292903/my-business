import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0c6b52",
          color: "#f3efe6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 280,
          fontWeight: 700,
        }}
      >
        H
      </div>
    ),
    { ...size },
  );
}
