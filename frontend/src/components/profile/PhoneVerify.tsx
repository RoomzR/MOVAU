import { useState, type FormEvent } from "react";

import { ApiError } from "../../api/client";
import { confirmPhoneCode, sendPhoneCode } from "../../api/phone";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export function PhoneVerify() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  async function onSend(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setHint(null);
    try {
      const result = await sendPhoneCode(phone);
      setSent(true);
      setCode(result.code);
      setHint(`Демо-код ${result.code}. SMS нет.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось отправить код");
    } finally {
      setPending(false);
    }
  }

  async function onConfirm(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const next = await confirmPhoneCode(code);
      setUser(next);
      setPhone(next.phone ?? phone);
      setSent(false);
      setHint("Номер подтверждён.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Неверный код");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-8 border border-border p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Телефон</p>
      {user.phone_verified && user.phone ? (
        <p className="mt-3 font-medium">{user.phone}</p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Номер не подтверждён. Сторонам заявки он не виден.</p>
      )}
      <form className="mt-6 space-y-4" onSubmit={sent ? onConfirm : onSend}>
        <Input
          label="Номер"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            setSent(false);
          }}
          placeholder="+375 29 …"
          required
        />
        {sent ? (
          <Input
            label="Код"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
        ) : null}
        {hint ? <p className="text-sm text-primary">{hint}</p> : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="ghost" disabled={pending}>
          {pending ? "Секунду…" : sent ? "Подтвердить" : "Отправить код"}
        </Button>
      </form>
    </div>
  );
}
