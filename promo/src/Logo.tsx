import { Img, staticFile } from "remotion";

type Props = {
  width: number;
};

export function Logo({ width }: Props) {
  return (
    <Img
      src={staticFile("logo.png")}
      style={{ width, height: "auto", display: "block" }}
    />
  );
}

export function LogoBadge({ width = 220 }: { width?: number }) {
  return (
    <div style={{ position: "absolute", top: 48, left: 80 }}>
      <Logo width={width} />
    </div>
  );
}

