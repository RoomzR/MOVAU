import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";

import { ApiError } from "../../api/client";
import { updateRequest } from "../../api/requests";
import { PointPicker } from "../map/PointPicker";
import { Container } from "../layout/Container";
import { Button } from "../ui/Button";
import { CategoryPicker } from "../ui/CategoryChip";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import type { HelpRequest } from "../../types";

type Props = {
  item: HelpRequest;
};

export function RequestEdit({ item }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [category, setCategory] = useState(item.category);
  const [address, setAddress] = useState(item.address_text ?? "");
  const [price, setPrice] = useState(item.price ?? "");
  const [coords, setCoords] = useState({ latitude: item.latitude, longitude: item.longitude });
  const save = useMutation({
    mutationFn: () =>
      updateRequest(item.id, {
        title: title.trim(),
        description: description.trim(),
        category,
        address_text: address.trim() || undefined,
        price: price.trim() ? Number(price) : null,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }),
    onSuccess: async (next) => {
      queryClient.setQueryData(["request", next.id], next);
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });

  useEffect(() => {
    setTitle(item.title);
    setDescription(item.description);
    setCategory(item.category);
    setAddress(item.address_text ?? "");
    setPrice(item.price ?? "");
    setCoords({ latitude: item.latitude, longitude: item.longitude });
  }, [item.address_text, item.category, item.description, item.id, item.latitude, item.longitude, item.price, item.title]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  return (
    <div className="border-t border-border">
      <Container className="py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Изменить</p>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">Пока заявка открыта, можно поправить текст и точку.</p>
        <form className="mt-6 max-w-xl space-y-4" onSubmit={onSubmit}>
          <Input label="Заголовок" name="edit-title" required minLength={3} value={title} onChange={(event) => setTitle(event.target.value)} />
          <Textarea
            label="Описание"
            name="edit-description"
            required
            minLength={8}
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <CategoryPicker value={category} onChange={setCategory} />
          <Input label="Адрес" name="edit-address" value={address} onChange={(event) => setAddress(event.target.value)} />
          <Input
            label="Цена, BYN"
            name="edit-price"
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Точка: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
          </p>
          <PointPicker
            value={coords}
            selectedId="here"
            markers={[{ id: "here", label: title.trim() || "Заявка", ...coords }]}
            onPick={setCoords}
            hint="Клик ставит точку заявки"
          />
          <Button type="submit" variant="accent" disabled={save.isPending}>
            {save.isPending ? "Сохраняем…" : "Сохранить"}
          </Button>
          {save.error instanceof ApiError || save.error instanceof Error ? (
            <p className="text-sm text-destructive" role="alert">
              {save.error.message}
            </p>
          ) : null}
        </form>
      </Container>
    </div>
  );
}
