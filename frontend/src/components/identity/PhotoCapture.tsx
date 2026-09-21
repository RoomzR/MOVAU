import { Camera, ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { compressImage } from "../../lib/compressImage";
import { Button } from "../ui/Button";

type Props = {
  label: string;
  hint: string;
  facing: "user" | "environment";
  value: string | null;
  onChange: (next: string | null) => void;
};

export function PhotoCapture({ label, hint, facing, value, onChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stop() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setLive(false);
  }

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    },
    [],
  );

  async function startCamera() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Камера недоступна. Выберите файл.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false,
      });
      streamRef.current = stream;
      setLive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError("Нет доступа к камере. Выберите файл.");
    }
  }

  async function snap() {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
    stop();
    if (!blob) {
      setError("Не удалось снять кадр");
      return;
    }
    try {
      onChange(await compressImage(new File([blob], "photo.jpg", { type: "image/jpeg" })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось подготовить фото");
    }
  }

  async function onPick(file: File | undefined) {
    if (!file) {
      return;
    }
    setError(null);
    try {
      onChange(await compressImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось прочитать фото");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
      {value ? (
        <div className="relative max-w-sm">
          <img src={value} alt={label} className="w-full border border-border object-cover" />
          <button
            type="button"
            className="absolute right-2 top-2 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center border border-border bg-background/90"
            onClick={() => onChange(null)}
            aria-label="Убрать фото"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : live ? (
        <div className="max-w-sm space-y-3">
          <video ref={videoRef} className="w-full border border-border" playsInline muted autoPlay />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="accent" onClick={() => void snap()}>
              Снять
            </Button>
            <Button type="button" variant="ghost" onClick={stop}>
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={() => void startCamera()}>
            <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
            Камера
          </Button>
          <Button type="button" variant="ghost" onClick={() => inputRef.current?.click()}>
            <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Файл
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => void onPick(event.target.files?.[0])}
          />
        </div>
      )}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
