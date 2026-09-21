import { useState } from "react";

import { COUNTRY_CITIES, LiveCityMap } from "../ui/LiveCityMap";

const HINTS: Record<string, string> = {
  minsk: "Столица. Плотность смены.",
  brest: "Запад. Граница и двор.",
  hrodna: "Нёман. Двор и аптека.",
  vitebsk: "Север. Лестница и двор.",
  mogilev: "Восток. Точка на карте.",
  gomel: "Юг. Районы и трасса.",
};

export function CountryInterface() {
  const [pin, setPin] = useState("minsk");
  const [hover, setHover] = useState<string | null>(null);
  const focusId = hover ?? pin;
  const active = COUNTRY_CITIES.find((city) => city.id === focusId) ?? COUNTRY_CITIES[0];

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-ink">
      <LiveCityMap
        className="absolute inset-0"
        focusId={focusId}
        showCaption={false}
        onFocusChange={(city) => setHover(city?.id ?? null)}
        onCitySelect={(city) => setPin(city.id)}
      />

      <span className="pointer-events-none absolute left-4 top-4 h-10 w-10 border-l-2 border-t-2 border-primary/70 md:left-6 md:top-6" />
      <span className="pointer-events-none absolute right-4 top-4 h-10 w-10 border-r-2 border-t-2 border-primary/70 md:right-6 md:top-6" />
      <span className="pointer-events-none absolute bottom-4 left-4 h-10 w-10 border-b-2 border-l-2 border-primary/70 md:bottom-6 md:left-6" />
      <span className="pointer-events-none absolute bottom-4 right-4 h-10 w-10 border-b-2 border-r-2 border-primary/70 md:bottom-6 md:right-6" />

      <div className="pointer-events-none absolute left-6 top-6 z-10 max-w-[22rem] md:left-10 md:top-10 md:max-w-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Страна</p>
        <h2 className="mt-2 font-display text-[clamp(2.25rem,6vw,5rem)] uppercase leading-[0.88] tracking-tight">
          Беларусь
          <span className="mt-1 block text-[clamp(1.35rem,3.2vw,2.5rem)] tracking-[0.02em] text-primary">
            как интерфейс
          </span>
        </h2>
      </div>

      <div
        className="absolute bottom-6 left-4 right-4 z-10 flex gap-2 overflow-x-auto pb-1 md:hidden"
        role="listbox"
        aria-label="Города"
      >
        {COUNTRY_CITIES.map((city) => {
          const lit = city.id === focusId;
          return (
            <button
              key={city.id}
              type="button"
              role="option"
              aria-selected={city.id === pin}
              className={`min-h-11 shrink-0 cursor-pointer px-4 font-display text-sm uppercase tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                lit ? "bg-primary text-on-primary" : "border border-zinc-800 bg-ink/85 text-foreground"
              }`}
              onClick={() => setPin(city.id)}
            >
              {city.name}
            </button>
          );
        })}
      </div>

      <div className="absolute bottom-8 left-6 z-10 hidden w-[min(100%-3rem,18rem)] md:bottom-10 md:left-10 md:block">
        <div className="border border-zinc-800 bg-ink/85 backdrop-blur-md" role="listbox" aria-label="Города">
          {COUNTRY_CITIES.map((city) => {
            const selected = city.id === pin;
            const lit = city.id === focusId;
            return (
              <button
                key={city.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-4 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring ${
                  lit ? "bg-primary text-on-primary" : "text-foreground hover:bg-zinc-900"
                }`}
                onPointerEnter={() => setHover(city.id)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(city.id)}
                onBlur={() => setHover(null)}
                onClick={() => setPin(city.id)}
              >
                <span className="font-display text-sm uppercase tracking-tight">{city.name}</span>
                <span className={`text-[10px] uppercase tracking-[0.14em] ${lit ? "opacity-70" : "text-muted-foreground"}`}>
                  {city.capital ? "сталіца" : city.oblast.replace(" вобласць", "")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="pointer-events-none absolute bottom-8 right-8 hidden max-w-[14rem] text-right text-[11px] uppercase tracking-[0.16em] text-muted-foreground md:bottom-10 md:right-10 md:block">
        {active.name}
        <span className="mt-1 block text-primary">{HINTS[active.id]}</span>
        <span className="mt-2 block text-muted-foreground">И все города страны</span>
      </p>
    </div>
  );
}
