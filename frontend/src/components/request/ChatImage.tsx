import { useEffect, useState } from "react";

import { apiFetchBlob } from "../../api/client";

type Props = {
  messageId: string;
};

export function ChatImage({ messageId }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    void apiFetchBlob(`/api/v1/messages/${messageId}/image`)
      .then((blob) => {
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(null);
        }
      });
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [messageId]);

  if (!src) {
    return <p className="mt-2 text-sm text-muted-foreground">Загружаем фото…</p>;
  }
  return <img src={src} alt="Фото-подтверждение по заявке" className="mt-3 max-h-72 w-full max-w-md object-cover" />;
}
