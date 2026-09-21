import type { ReactNode } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";

import { onest, unbounded } from "../fonts";
import { ink, mute, paper, shift, volt } from "../theme";
import { BrandField } from "./BrandField";
import { CtaPill } from "./CtaPill";
import type { BrandVariant } from "./specs";
import { Wordmark } from "./Wordmark";

function Layer({
  children,
  align = "center",
  justify = "center",
}: {
  children: ReactNode;
  align?: "center" | "flex-start";
  justify?: "center" | "flex-start" | "space-between";
}) {
  return (
    <AbsoluteFill
      style={{
        zIndex: 2,
        alignItems: align,
        justifyContent: justify,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

export function BrandKit({ variant }: { variant: BrandVariant }) {
  const { width, height } = useVideoConfig();
  const short = Math.min(width, height);
  const pad = Math.max(36, Math.round(short * 0.07));
  const logoW = Math.min(width * 0.72, height * 2.4);

  if (variant === "wordmark-white" || variant === "wordmark-black") {
    return (
      <Layer>
        <div style={{ padding: 48 }}>
          <Wordmark width={width - 96} tone={variant === "wordmark-black" ? "ink" : "paper"} />
        </div>
      </Layer>
    );
  }

  if (variant === "avatar-ink" || variant === "avatar-volt" || variant === "avatar-shift") {
    const flat = variant === "avatar-volt" ? "flat-volt" : variant === "avatar-shift" ? "flat-shift" : "volt";
    const tone = variant === "avatar-volt" ? "ink" : "paper";
    const sub = variant === "avatar-volt" ? ink : variant === "avatar-shift" ? "rgba(244,247,240,0.88)" : volt;
    return (
      <AbsoluteFill>
        <BrandField mood={flat} dots={false} />
        {variant === "avatar-ink" ? (
          <div
            style={{
              position: "absolute",
              zIndex: 2,
              inset: Math.round(short * 0.045),
              border: `${Math.max(3, Math.round(short * 0.008))}px solid ${volt}`,
              pointerEvents: "none",
            }}
          />
        ) : null}
        <Layer>
          <Wordmark width={Math.round(short * 0.82)} tone={tone} />
        </Layer>
        <div
          style={{
            position: "absolute",
            zIndex: 3,
            left: 0,
            right: 0,
            bottom: Math.round(short * 0.1),
            textAlign: "center",
            fontFamily: unbounded,
            fontSize: Math.round(short * 0.042),
            fontWeight: 800,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: sub,
          }}
        >
          Мова дапамогі
        </div>
      </AbsoluteFill>
    );
  }

  if (variant === "banner-cover") {
    return (
      <AbsoluteFill>
        <BrandField mood="split" />
        <Layer>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: Math.round(pad * 0.9),
              width: width - pad * 2,
              paddingLeft: pad,
              paddingRight: pad,
            }}
          >
            <Wordmark width={Math.min(480, width * 0.32)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: unbounded,
                  fontSize: Math.max(16, Math.round(height * 0.085)),
                  fontWeight: 800,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: volt,
                }}
              >
                Мова дапамогі
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontFamily: unbounded,
                  fontSize: Math.max(20, Math.round(height * 0.11)),
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: paper,
                  lineHeight: 1.05,
                }}
              >
                Взаимная помощь · вся Беларусь
              </div>
            </div>
            <CtaPill label="t.me/MOVAUBY" fontSize={Math.max(15, Math.round(height * 0.075))} />
          </div>
        </Layer>
      </AbsoluteFill>
    );
  }

  if (variant === "banner-hero" || variant === "banner-og") {
    const titleSize = Math.round(Math.min(width * 0.052, height * 0.1));
    return (
      <AbsoluteFill>
        <BrandField mood="volt" />
        <Layer align="flex-start">
          <div style={{ paddingLeft: pad, paddingRight: pad, width: "100%" }}>
            <div
              style={{
                fontFamily: unbounded,
                fontSize: Math.max(16, Math.round(height * 0.036)),
                fontWeight: 800,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: volt,
                marginBottom: 20,
              }}
            >
              Мова дапамогі
            </div>
            <Wordmark width={Math.min(logoW, width * 0.58)} />
            <div
              style={{
                marginTop: 24,
                fontFamily: unbounded,
                fontSize: titleSize,
                fontWeight: 800,
                textTransform: "uppercase",
                color: paper,
                lineHeight: 0.95,
                maxWidth: width * 0.72,
              }}
            >
              Взаимная помощь.
              <span style={{ display: "block", color: volt }}>Вся Беларусь.</span>
            </div>
            <div style={{ marginTop: 28 }}>
              <CtaPill label="t.me/MOVAUBY" fontSize={Math.max(18, Math.round(height * 0.04))} />
            </div>
          </div>
        </Layer>
      </AbsoluteFill>
    );
  }

  if (variant === "ad-help" || variant === "ad-map" || variant === "ad-shift") {
    const shiftAd = variant === "ad-shift";
    const mapAd = variant === "ad-map";
    const kicker = shiftAd ? "Радио" : mapAd ? "Не лента" : "Заявка";
    const title = shiftAd ? "Включить смену" : mapAd ? "Точка на карте" : "Нужна помощь —";
    const accent = shiftAd ? "тебя видно." : mapAd ? "Не чат в пустоту." : "поставьте точку.";
    const mood = shiftAd ? "shift" : "volt";
    const square = Math.abs(height / width - 1) < 0.12;
    const titleSize = square
      ? Math.round(short * 0.088)
      : Math.round(Math.min(width * 0.068, height * 0.118));
    return (
      <AbsoluteFill>
        <BrandField mood={mood} />
        <Layer align="flex-start">
          <div style={{ paddingLeft: pad, paddingRight: pad, width: "100%" }}>
            <Wordmark width={Math.min(260, width * 0.26)} />
            <div
              style={{
                marginTop: Math.round(height * 0.1),
                fontFamily: unbounded,
                fontSize: Math.max(16, Math.round(short * 0.028)),
                fontWeight: 800,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: shiftAd ? shift : volt,
                marginBottom: 16,
              }}
            >
              {kicker}
            </div>
            <div
              style={{
                fontFamily: unbounded,
                fontSize: titleSize,
                fontWeight: 800,
                lineHeight: 0.92,
                textTransform: "uppercase",
                color: paper,
                maxWidth: width * 0.88,
              }}
            >
              {title}
              <span style={{ display: "block", color: shiftAd ? shift : volt }}>{accent}</span>
            </div>
            <div
              style={{
                marginTop: 22,
                fontFamily: onest,
                fontSize: Math.max(20, Math.round(short * 0.03)),
                fontWeight: 600,
                color: mute,
                maxWidth: 560,
              }}
            >
              {shiftAd
                ? "Регистрация исполнителем — и ты на карте."
                : "Кто на смене — идёт. Чат только у сторон заявки."}
            </div>
            <div style={{ marginTop: 32 }}>
              <CtaPill label="t.me/MOVAUBY" fontSize={Math.max(18, Math.round(short * 0.03))} />
            </div>
          </div>
        </Layer>
      </AbsoluteFill>
    );
  }

  const storyShift = variant === "story-shift";
  const storyLogo = variant === "story-logo";
  return (
    <AbsoluteFill>
      <BrandField mood={storyShift ? "shift" : "volt"} />
      <Layer justify={storyLogo ? "center" : "flex-start"}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            height: "100%",
            paddingTop: storyLogo ? 0 : Math.round(height * 0.16),
            paddingLeft: pad,
            paddingRight: pad,
            paddingBottom: Math.round(height * 0.12),
          }}
        >
          <div
            style={{
              fontFamily: unbounded,
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: storyShift ? shift : volt,
              marginBottom: 28,
            }}
          >
            Мова дапамогі
          </div>
          <Wordmark width={Math.min(width - pad * 2, 920)} />
          {storyLogo ? (
            <div
              style={{
                marginTop: 40,
                fontFamily: unbounded,
                fontSize: 36,
                fontWeight: 800,
                textTransform: "uppercase",
                color: volt,
              }}
            >
              Читается мовай
            </div>
          ) : (
            <>
              <div
                style={{
                  marginTop: 64,
                  fontFamily: unbounded,
                  fontSize: 72,
                  fontWeight: 800,
                  lineHeight: 0.92,
                  textTransform: "uppercase",
                  color: paper,
                  textAlign: "center",
                }}
              >
                {storyShift ? "Включить смену" : "Нужна помощь —"}
                <span style={{ display: "block", color: storyShift ? shift : volt }}>
                  {storyShift ? "тебя видно." : "поставьте точку."}
                </span>
              </div>
              <div style={{ marginTop: "auto" }}>
                <CtaPill label="t.me/MOVAUBY" fontSize={28} />
              </div>
            </>
          )}
        </div>
      </Layer>
    </AbsoluteFill>
  );
}
