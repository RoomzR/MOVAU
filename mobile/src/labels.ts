const STATUS: Record<string, string> = {
  open: "Открыта",
  assigned: "Назначена",
  in_progress: "В работе",
  completed: "Выполнена",
  cancelled: "Отменена",
};

const CATEGORY: Record<string, string> = {
  errand: "Поручение",
  pharmacy: "Аптека",
  grocery: "Продукты",
  ride: "Довезти",
  home: "Дом",
  animals: "Животные",
  kids: "Дети",
  other: "Другое",
};

export function statusLabel(value: string) {
  return STATUS[value] ?? value;
}

export function categoryLabel(value: string) {
  return CATEGORY[value] ?? value;
}

export function formatDistance(meters: number | null | undefined) {
  if (meters == null) {
    return null;
  }
  if (meters < 1000) {
    return `${Math.round(meters)} м`;
  }
  return `${(meters / 1000).toFixed(1)} км`;
}

export function payLabel(price: string | number | null | undefined) {
  if (price == null || price === "") {
    return "Дарма";
  }
  return `${price} BYN`;
}

export function etaLabel(iso: string | null | undefined) {
  if (!iso) {
    return null;
  }
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) {
    return null;
  }
  if (ms <= 0) {
    return "Рядом";
  }
  const min = Math.max(1, Math.round(ms / 60000));
  return `ETA ${min} мин`;
}
