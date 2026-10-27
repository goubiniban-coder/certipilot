import { ImageResponse } from "next/og";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

export const alt = `${APP_NAME} : ${APP_DESCRIPTION}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#172554",
          color: "white",
        }}
      >
        <div style={{ fontSize: 112, fontWeight: 700 }}>{APP_NAME}</div>
        <div style={{ fontSize: 40, marginTop: 24, color: "#fbbf24" }}>{APP_DESCRIPTION}</div>
      </div>
    ),
    size,
  );
}
