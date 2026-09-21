import { useEffect, useState } from "react";

import { apiFetchBlob } from "../../api/client";

type Props = {
  path: string;
  label: string;
};

export function IdentityBlobPhoto({ path, label }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    void apiFetchBlob(path)
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
  }, [path]);

  return (
    <figure>
      <figcaption className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </figcaption>
      {src ? (
        <img src={src} alt={label} className="w-full border border-border object-cover" />
      ) : (
        <p className="text-sm text-muted-foreground">Нет фото</p>
      )}
    </figure>
  );
}
