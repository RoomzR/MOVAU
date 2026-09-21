import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError } from "../api/client";
import { claimScan, getScanPreview } from "../api/payment";
import { Container } from "../components/layout/Container";
import { Section } from "../components/layout/Section";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { parseScanCode } from "../lib/scanCode";
import { statusLabel } from "../lib/labels";
import { useAuthStore } from "../store/authStore";

type BarcodeHit = { rawValue: string };

type DetectorCtor = new (options?: { formats: string[] }) => {
  detect: (source: ImageBitmapSource) => Promise<BarcodeHit[]>;
};

function getDetector(): DetectorCtor | null {
  const ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  return ctor ?? null;
}

export function ScanPage() {
  const { code: rawCode = "" } = useParams();
  const code = parseScanCode(rawCode) ?? rawCode.trim().toLowerCase();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [pasted, setPasted] = useState("");

  const preview = useQuery({
    queryKey: ["scan", code, user?.id],
    queryFn: () => getScanPreview(code),
    enabled: code.length >= 16,
  });
  const claim = useMutation({
    mutationFn: () => claimScan(code),
    onSuccess: async (item) => {
      await queryClient.invalidateQueries({ queryKey: ["scan", code] });
      await queryClient.invalidateQueries({ queryKey: ["request", item.id] });
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
      await queryClient.invalidateQueries({ queryKey: ["wallet", "me"] });
    },
  });

  useEffect(() => {
    if (!cameraOn) {
      return;
    }
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const Detector = getDetector();
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const target = video;

    async function run() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        target.srcObject = stream;
        await target.play();
      } catch {
        setCameraError("Камера недоступна. Вставьте код с QR или откройте ссылку из него.");
        setCameraOn(false);
        return;
      }
      if (!Detector) {
        setCameraError("Этот браузер не читает QR с камеры. Вставьте код вручную.");
        return;
      }
      const detector = new Detector({ formats: ["qr_code"] });
      const tick = async () => {
        if (stopped) {
          return;
        }
        try {
          const hits = await detector.detect(target);
          const parsed = parseScanCode(hits[0]?.rawValue);
          if (parsed) {
            navigate(`/scan/${parsed}`, { replace: true });
            setCameraOn(false);
            return;
          }
        } catch {
          /* кадр без QR */
        }
        raf = window.requestAnimationFrame(() => void tick());
      };
      void tick();
    }

    void run();
    return () => {
      stopped = true;
      window.cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
      if (video) {
        video.srcObject = null;
      }
    };
  }, [cameraOn, navigate]);

  const item = preview.data;
  const next = `/scan/${code}`;

  function submitPasted() {
    const parsed = parseScanCode(pasted);
    if (parsed) {
      navigate(`/scan/${parsed}`);
    }
  }

  return (
    <Section screen className="flex items-center">
      <Container>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">QR заявки</p>
        <h1 className="mt-3 font-display text-4xl uppercase leading-tight tracking-tight md:text-6xl">
          {code.length >= 16 ? "Сканирование" : "Сканер"}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Клиент показывает QR своей заявки. Исполнитель сканирует — заявка закрывается, деньги с холда
          переходят на кошелёк.
        </p>

        {code.length < 16 ? (
          <div className="mt-8 max-w-xl space-y-4">
            {cameraOn ? (
              <video
                ref={videoRef}
                className="aspect-[3/4] w-full max-w-sm border border-border bg-ink object-cover"
                playsInline
                muted
                aria-label="Камера для QR"
              />
            ) : (
              <Button variant="accent" onClick={() => setCameraOn(true)}>
                <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
                Включить камеру
              </Button>
            )}
            {cameraError ? (
              <p className="text-sm text-destructive" role="alert">
                {cameraError}
              </p>
            ) : null}
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                submitPasted();
              }}
            >
              <div className="min-w-0 flex-1">
                <Input
                  label="Код или ссылка с QR"
                  name="code"
                  value={pasted}
                  onChange={(event) => setPasted(event.target.value)}
                  placeholder="Вставьте ссылку /scan/…"
                />
              </div>
              <Button type="submit" disabled={!parseScanCode(pasted)}>
                Открыть
              </Button>
            </form>
          </div>
        ) : null}

        {code.length >= 16 && preview.isLoading ? <p className="mt-6 text-muted-foreground">Читаем QR…</p> : null}
        {preview.isError ? (
          <p className="mt-6 text-destructive" role="alert">
            {preview.error instanceof ApiError ? preview.error.message : "QR не найден."}
          </p>
        ) : null}
        {item ? (
          <div className="mt-8 max-w-xl space-y-4">
            <p className="font-display text-2xl leading-snug">{item.title}</p>
            <p className="text-muted-foreground">
              {item.amount ? `${item.amount} ${item.currency}` : "Дарма"}. Статус: {statusLabel(item.request_status)}.
            </p>
            {item.payment_status === "released" ? (
              <p className="text-primary">Деньги уже на кошельке исполнителя.</p>
            ) : null}
            {!user ? (
              <Link to={`/login?next=${encodeURIComponent(next)}`}>
                <Button variant="accent">
                  <ScanLine className="mr-2 h-4 w-4" aria-hidden="true" />
                  Войти и закрыть заявку
                </Button>
              </Link>
            ) : null}
            {user && item.claimable ? (
              <Button variant="accent" onClick={() => claim.mutate()} disabled={claim.isPending}>
                <ScanLine className="mr-2 h-4 w-4" aria-hidden="true" />
                {claim.isPending ? "Переводим…" : "Работа сделана — забрать оплату"}
              </Button>
            ) : null}
            {user && !item.claimable && item.needs_photo ? (
              <p className="text-sm text-muted-foreground">
                Сначала отправьте фото работы в чат заявки — потом скан закроет оплату.
              </p>
            ) : null}
            {user && !item.claimable && !item.needs_photo && item.request_status !== "completed" ? (
              <p className="text-sm text-muted-foreground">
                Закрыть QR может только назначенный исполнитель, после того как клиент оплатил заявку.
              </p>
            ) : null}
            {claim.isSuccess ? (
              <p className="text-primary">Заявка закрыта. Оплата переведена на ваш кошелёк.</p>
            ) : null}
            {claim.error instanceof ApiError || claim.error instanceof Error ? (
              <p className="text-sm text-destructive" role="alert">
                {claim.error.message}
              </p>
            ) : null}
            <p className="pt-4">
              <Link className="text-sm font-semibold text-primary" to={`/requests/${item.help_request_id}`}>
                Открыть заявку
              </Link>
            </p>
          </div>
        ) : null}
      </Container>
    </Section>
  );
}
