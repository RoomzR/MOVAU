import { CATEGORIES, joinSkillKeys, parseSkillKeys } from "../../lib/labels";
import { CategoryChip } from "./CategoryChip";

type Props = {
  value: string;
  onChange?: (next: string) => void;
};

export function SkillChips({ value, onChange }: Props) {
  const selected = new Set(parseSkillKeys(value));
  const keys = onChange ? CATEGORIES.map((row) => row.id) : parseSkillKeys(value);

  if (!onChange && keys.length === 0) {
    return <p className="text-sm text-muted-foreground">Навыки не указаны.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {keys.map((key) => {
        const active = selected.has(key);
        return (
          <CategoryChip
            key={key}
            value={key}
            selected={onChange ? active : true}
            onSelect={
              onChange
                ? (id) => {
                    const next = new Set(selected);
                    if (next.has(id)) {
                      next.delete(id);
                    } else {
                      next.add(id);
                    }
                    onChange(joinSkillKeys(CATEGORIES.map((row) => row.id).filter((id) => next.has(id))));
                  }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
