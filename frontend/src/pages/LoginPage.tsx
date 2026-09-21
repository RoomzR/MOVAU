import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { ApiError } from "../api/client";
import { Page } from "../components/layout/Page";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuthStore } from "../store/authStore";

export function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await login(String(form.get("email")), String(form.get("password")));
      const next = searchParams.get("next");
      const safe = next && next.startsWith("/") && !next.startsWith("//") && !next.includes("://");
      navigate(safe ? next : "/requests");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось войти");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-1 items-center py-16">
      <Page narrow>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Аккаунт</p>
        <h1 className="mt-2 font-display text-5xl uppercase leading-[1.05] tracking-tight md:text-6xl">Вход</h1>
        <p className="mt-4 text-muted-foreground">Демо: пароль у всех <span className="font-semibold text-foreground">movau123</span>.</p>
        <form className="mt-10 space-y-4" onSubmit={onSubmit}>
          <Input label="Email" name="email" type="email" autoComplete="email" required defaultValue="client@movau.test" />
          <Input
            label="Пароль"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            defaultValue="movau123"
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" variant="accent" disabled={pending} className="w-full" size="lg">
            {pending ? "Входим…" : "Войти"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">
          Нет аккаунта?{" "}
          <Link className="cursor-pointer font-semibold text-primary" to="/register">
            Регистрация
          </Link>
        </p>
        <ul className="mt-10 space-y-2 text-sm text-muted-foreground">
          <li>client@movau.test — клиент</li>
          <li>exec@movau.test — исполнитель</li>
          <li>volunteer@movau.test — волонтёр (только дарма)</li>
          <li>business@movau.test — бизнес</li>
          <li>moderator@movau.test — модератор</li>
          <li>analyst@movau.test — аналитик</li>
          <li>admin@movau.test — админ</li>
        </ul>
      </Page>
    </div>
  );
}
