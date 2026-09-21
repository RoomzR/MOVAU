import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { ApiError } from "../api/client";
import { Page } from "../components/layout/Page";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuthStore } from "../store/authStore";

export function RegisterPage() {
  const register = useAuthStore((state) => state.register);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const wantShift = params.get("shift") === "1";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await register({
        email: String(form.get("email")),
        password: String(form.get("password")),
        display_name: String(form.get("display_name")),
        as_executor: form.get("as_executor") === "on",
        as_volunteer: form.get("as_volunteer") === "on",
      });
      navigate("/requests");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось зарегистрироваться");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-1 items-center py-16">
      <Page narrow>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Аккаунт</p>
        <h1 className="mt-2 font-display text-5xl uppercase leading-[1.05] tracking-tight md:text-6xl">Старт</h1>
        <p className="mt-4 text-muted-foreground">Клиент по умолчанию. Можно сразу стать исполнителем или волонтёром.</p>
        <form className="mt-10 space-y-4" onSubmit={onSubmit}>
          <Input label="Имя" name="display_name" required minLength={2} autoComplete="name" />
          <Input label="Email" name="email" type="email" autoComplete="email" required />
          <Input
            label="Пароль"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" name="as_executor" defaultChecked={wantShift} className="h-4 w-4 accent-primary" />
            Хочу помогать как исполнитель
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" name="as_volunteer" className="h-4 w-4 accent-primary" />
            Хочу помогать как волонтёр
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" variant="accent" disabled={pending} className="w-full" size="lg">
            {pending ? "Создаём…" : "Создать аккаунт"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link className="cursor-pointer font-semibold text-primary" to="/login">
            Войти
          </Link>
        </p>
      </Page>
    </div>
  );
}
