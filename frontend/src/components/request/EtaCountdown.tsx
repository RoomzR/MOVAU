import { useEffect, useState } from "react";

type Props = {
  etaAt: string | null | undefined;
};

function formatLeft(totalSeconds: number) {
  const abs = Math.abs(totalSeconds);
  const minutes = Math.floor(abs / 60);
  const seconds = abs % 60;
  const clock = `${minutes}:${String(seconds).padStart(2, "0")}`;
  return totalSeconds >= 0 ? clock : `+${clock}`;
}

export function EtaCountdown({ etaAt }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!etaAt) {
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [etaAt]);

  if (!etaAt) {
    return null;
  }
  const end = new Date(etaAt).getTime();
  if (Number.isNaN(end)) {
    return null;
  }
  const left = Math.round((end - now) / 1000);
  const late = left < 0;
  return (
    <p className={`text-sm ${late ? "text-destructive" : "text-primary"}`} aria-live="polite">
      {late ? `Опоздание ${formatLeft(left)}` : `На месте через ${formatLeft(left)}`}
    </p>
  );
}
