import { Button } from "../ui/Button";

type Props = {
  total: number;
  limit: number;
  offset: number;
  onOffset: (offset: number) => void;
};

export function AdminPager({ total, limit, offset, onOffset }: Props) {
  if (total <= 0) {
    return null;
  }
  const from = offset + 1;
  const to = Math.min(offset + limit, total);
  const prev = Math.max(offset - limit, 0);
  const next = offset + limit;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        {from}–{to} из {total}
      </p>
      <div className="flex gap-2">
        <Button variant="ghost" disabled={offset <= 0} onClick={() => onOffset(prev)}>
          Назад
        </Button>
        <Button variant="ghost" disabled={next >= total} onClick={() => onOffset(next)}>
          Далее
        </Button>
      </div>
    </div>
  );
}
