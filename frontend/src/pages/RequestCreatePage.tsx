import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { createRequest } from "../api/requests";
import { getWallet } from "../api/wallet";
import { Button } from "../components/ui/Button";
import { CategoryPicker } from "../components/ui/CategoryChip";
import { PointPicker } from "../components/map/PointPicker";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { formatMoney } from "../lib/labels";
import { useAuthStore } from "../store/authStore";

const MINSK = { latitude: 53.9023, longitude: 27.5619 };

export function RequestCreatePage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [coords, setCoords] = useState(MINSK);
  const [category, setCategory] = useState("errand");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const paid = Number(price) > 0;
  const walletQuery = useQuery({
    queryKey: ["wallet", "me"],
    queryFn: getWallet,
    enabled: Boolean(user) && paid,
  });

  function locate() {
    if (!navigator.geolocation) {
      setError("Геолокация недоступна в этом браузере");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => setError("Не удалось определить координаты"),
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }
    const form = new FormData(event.currentTarget);
    const priceRaw = price.trim();
    if (user.identity_status !== "verified") {
      setError("Сначала подтвердите личность — заявки только после проверки паспорта.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const created = await createRequest({
        title: String(form.get("title")),
        description: String(form.get("description")),
        category,
        latitude: coords.latitude,
        longitude: coords.longitude,
        address_text: String(form.get("address_text") || "") || undefined,
        price: priceRaw ? Number(priceRaw) : null,
      });
      navigate(`/requests/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать заявку");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="city-split flex-1 border-t-0">
      <div className="city-split-copy flex flex-col justify-center px-6 py-12 md:px-10 lg:py-16 lg:pr-16">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Точка на карте</p>
        <h1 className="mt-2 font-display text-4xl uppercase leading-[1.05] tracking-tight md:text-6xl">Заявка</h1>
        <form className="mt-8 max-w-lg space-y-4" onSubmit={onSubmit}>
          <Input label="Заголовок" name="title" required minLength={3} />
          <Textarea label="Описание" name="description" required minLength={8} rows={5} />
          <CategoryPicker value={category} onChange={setCategory} />
          <Input label="Адрес" name="address_text" />
          <Input
            label="Цена, BYN"
            name="price"
            type="number"
            min={0}
            step="0.01"
            placeholder="Пусто — дарма"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
          {user?.identity_status !== "verified" ? (
            <p className="text-sm text-muted-foreground">
              Нужна проверка паспорта, в том числе для дармы.{" "}
              <Link className="font-semibold text-primary" to="/me/verify">
                Подтвердить личность
              </Link>
            </p>
          ) : paid ? (
            <p className="text-sm text-muted-foreground">
              Сразу появится QR этой заявки. Если на кошельке хватает — сумма заморозится. Исполнитель заберёт
              деньги, когда отсканирует QR. Баланс: {formatMoney(walletQuery.data?.balance)} BYN.{" "}
              <Link className="font-semibold text-primary" to="/me">
                Пополнить
              </Link>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Дарма тоже получает QR: исполнитель сканирует его, когда помощь оказана.</p>
          )}
          <div className="border border-border p-4 text-sm">
            <p className="font-medium leading-relaxed">
              Точка: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
            </p>
            <Button type="button" variant="ghost" className="mt-3" onClick={locate}>
              Моё место
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" variant="accent" disabled={pending} className="w-full" size="lg">
            {pending ? "Публикуем…" : "Опубликовать"}
          </Button>
        </form>
      </div>
      <div className="city-split-map relative min-h-[280px] lg:min-h-0">
        <PointPicker
          className="h-full min-h-[280px] border-0 lg:min-h-full"
          value={coords}
          selectedId="here"
          markers={[{ id: "here", label: "Заявка", ...coords }]}
          onPick={setCoords}
          hint="Клик ставит точку заявки"
        />
      </div>
    </section>
  );
}
