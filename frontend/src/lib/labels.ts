const STATUS: Record<string, string> = {
  open: "Открыта",
  assigned: "Назначена",
  in_progress: "В работе",
  completed: "Выполнена",
  cancelled: "Отменена",
};

export const CATEGORIES = [
  { id: "errand", label: "Поручение" },
  { id: "pharmacy", label: "Аптека" },
  { id: "grocery", label: "Продукты" },
  { id: "ride", label: "Довезти" },
  { id: "home", label: "Дом" },
  { id: "animals", label: "Животные" },
  { id: "kids", label: "Дети" },
  { id: "other", label: "Другое" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

const CATEGORY: Record<string, string> = Object.fromEntries(CATEGORIES.map((row) => [row.id, row.label]));

export function statusLabel(value: string) {
  return STATUS[value] ?? value;
}

export function categoryLabel(value: string) {
  return CATEGORY[value] ?? value;
}

export function parseSkillKeys(raw: string | null | undefined) {
  return (raw ?? "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function joinSkillKeys(keys: string[]) {
  return keys.filter(Boolean).join(",");
}

export function formatDistance(meters: number | null | undefined) {
  if (meters == null) {
    return null;
  }
  if (meters < 1000) {
    return `${meters} м`;
  }
  return `${(meters / 1000).toFixed(1)} км`;
}

const OFFER: Record<string, string> = {
  pending: "Ожидает",
  accepted: "Принят",
  rejected: "Отклонён",
  withdrawn: "Отозван",
};

export function offerLabel(value: string) {
  return OFFER[value] ?? value;
}

const ROLE: Record<string, string> = {
  client: "Клиент",
  executor: "Исполнитель",
  volunteer: "Волонтёр",
  business: "Бизнес",
  moderator: "Модератор",
  analyst: "Аналитик",
  admin: "Админ",
};

export function roleLabel(value: string) {
  return ROLE[value] ?? value;
}

const LEVEL: Record<string, string> = {
  novice: "Новичок",
  regular: "Постоянный",
  vip: "VIP",
};

export function clientLevelLabel(value: string | null | undefined) {
  if (!value) {
    return "Новичок";
  }
  return LEVEL[value] ?? value;
}

const DISPUTE: Record<string, string> = {
  open: "Открыт",
  resolved: "Решён",
};

export function disputeLabel(value: string) {
  return DISPUTE[value] ?? value;
}

export function formatRating(avg: number | null | undefined) {
  return avg == null ? "—" : avg.toFixed(1);
}

const HOLD: Record<string, string> = {
  held: "Заморожено",
  released: "Выплачено исполнителю",
  refunded: "Возврат",
};

export function holdLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  return HOLD[value] ?? value;
}

const TXN: Record<string, string> = {
  topup: "Пополнение",
  hold: "Заморозка",
  release: "Выплата исполнителю",
  refund: "Возврат",
};

export function txnLabel(value: string) {
  return TXN[value] ?? value;
}

const IDENTITY: Record<string, string> = {
  none: "Нет",
  pending: "На проверке",
  verified: "Проверена",
  rejected: "Отклонена",
};

export function identityStatusLabel(value: string | null | undefined) {
  if (!value) {
    return IDENTITY.none;
  }
  return IDENTITY[value] ?? value;
}

const DOCUMENT_KIND: Record<string, string> = {
  passport_by: "Паспорт РБ",
  id_card_by: "ID-карта",
  other: "Другой документ",
};

export const DOCUMENT_KINDS = [
  { id: "passport_by", label: "Паспорт РБ" },
  { id: "id_card_by", label: "ID-карта" },
  { id: "other", label: "Другой документ" },
] as const;

export function documentKindLabel(value: string | null | undefined) {
  if (!value) {
    return DOCUMENT_KIND.other;
  }
  return DOCUMENT_KIND[value] ?? value;
}

export function adminEventLabel(value: string) {
  const labels: Record<string, string> = {
    request_cancelled: "Заявка отменена",
    user_deactivated: "Человек отключён",
    user_activated: "Человек включён",
    dispute_resolved: "Спор закрыт",
    identity_reviewed: "Личность разобрана",
    user_role_granted: "Роль выдана",
    user_role_revoked: "Роль снята",
  };
  return labels[value] ?? value;
}

export function adminEntityLabel(value: string) {
  const labels: Record<string, string> = {
    user: "Человек",
    help_request: "Заявка",
    dispute: "Спор",
    identity: "Личность",
  };
  return labels[value] ?? value;
}

export function adminEntityHref(type: string, id: string) {
  if (type === "user") {
    return `/admin/users/${id}`;
  }
  if (type === "help_request") {
    return `/requests/${id}`;
  }
  if (type === "dispute") {
    return "/admin/disputes";
  }
  if (type === "identity") {
    return "/admin/identity";
  }
  return null;
}

export function notificationKindLabel(value: string) {
  const labels: Record<string, string> = {
    request_taken: "Заявка",
    message: "Чат",
    identity_reviewed: "Личность",
    offer: "Отклик",
    request_started: "В работе",
    request_completed: "Готово",
    payment_released: "Оплата",
    dispute_opened: "Спор",
    request_nearby: "Рядом",
  };
  return labels[value] ?? "Событие";
}

export function formatMoney(value: number | string | null | undefined) {
  const amount = typeof value === "string" ? Number(value) : value;
  if (amount == null || Number.isNaN(amount)) {
    return "0.00";
  }
  return amount.toFixed(2);
}
