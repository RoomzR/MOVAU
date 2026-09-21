import { useMemo, useState } from "react";

const WEST = 22.9;
const EAST = 33.0;
const NORTH = 56.4;
const SOUTH = 51.1;
const WIDTH = 1000;
const HEIGHT = 892;

function project(lng: number, lat: number) {
  return {
    x: ((lng - WEST) / (EAST - WEST)) * WIDTH,
    y: ((NORTH - lat) / (NORTH - SOUTH)) * HEIGHT,
  };
}

const BORDER: [number, number][] = [
  [23.57, 51.5],
  [24.36, 51.53],
  [25.16, 51.58],
  [25.86, 51.5],
  [26.64, 51.48],
  [27.55, 51.62],
  [28.48, 51.5],
  [29.32, 51.28],
  [30.24, 51.26],
  [30.96, 51.5],
  [31.54, 51.82],
  [31.86, 52.12],
  [32.41, 52.62],
  [32.77, 53.04],
  [32.57, 53.49],
  [32.15, 53.96],
  [31.78, 54.38],
  [31.32, 54.85],
  [30.96, 55.22],
  [30.57, 55.62],
  [30.24, 56.0],
  [29.62, 56.16],
  [28.86, 56.17],
  [28.15, 56.05],
  [27.47, 55.82],
  [26.82, 55.72],
  [26.16, 55.8],
  [25.62, 55.98],
  [25.32, 55.78],
  [24.86, 55.45],
  [24.42, 54.98],
  [23.96, 54.52],
  [23.51, 54.12],
  [23.24, 53.72],
  [23.61, 53.38],
  [23.66, 52.92],
  [23.5, 52.48],
  [23.18, 52.12],
  [23.39, 51.78],
];

type City = {
  id: string;
  name: string;
  oblast: string;
  lng: number;
  lat: number;
  capital?: boolean;
  label: { dx: number; dy: number };
};

const CITIES: City[] = [
  { id: "minsk", name: "Мінск", oblast: "Сталіца", lng: 27.5615, lat: 53.9023, capital: true, label: { dx: 14, dy: -18 } },
  { id: "brest", name: "Брэст", oblast: "Брэсцкая вобласць", lng: 23.734, lat: 52.0976, label: { dx: 16, dy: 8 } },
  { id: "hrodna", name: "Гродна", oblast: "Гродзенская вобласць", lng: 23.8258, lat: 53.6694, label: { dx: 16, dy: 8 } },
  { id: "vitebsk", name: "Віцебск", oblast: "Віцебская вобласць", lng: 30.2048, lat: 55.1904, label: { dx: -82, dy: 8 } },
  { id: "mogilev", name: "Магілёў", oblast: "Магілёўская вобласць", lng: 30.3314, lat: 53.9007, label: { dx: 16, dy: 8 } },
  { id: "gomel", name: "Гомель", oblast: "Гомельская вобласць", lng: 30.9876, lat: 52.4345, label: { dx: -76, dy: 8 } },
];

/** Прочие города — точки на схеме, без подписей. */
const TOWNS: [number, number][] = [
  [26.044, 53.132],
  [26.073, 52.123],
  [28.505, 54.228],
  [30.417, 54.508],
  [29.246, 52.049],
  [27.542, 52.787],
  [26.854, 54.317],
  [25.303, 53.888],
  [28.785, 55.486],
  [28.636, 55.532],
  [29.221, 53.138],
  [30.024, 52.892],
  [29.734, 52.634],
  [30.391, 52.361],
  [27.56, 53.027],
  [24.356, 52.211],
  [26.81, 52.247],
  [25.316, 53.087],
  [24.467, 53.156],
  [25.829, 53.594],
  [31.714, 53.712],
  [30.984, 54.286],
  [28.635, 53.301],
  [28.333, 54.098],
  [26.4, 54.482],
  [29.334, 52.132],
  [30.049, 53.093],
  [27.138, 53.685],
  [24.464, 52.556],
  [26.846, 51.891],
  [27.05, 55.641],
  [28.699, 54.881],
  [25.955, 54.421],
  [27.691, 55.138],
  [26.841, 55.117],
  [30.247, 53.521],
  [31.954, 53.62],
  [29.706, 54.409],
  [27.333, 53.75],
  [28.141, 53.509],
  [24.023, 52.199],
  [23.8, 53.15],
  [25.32, 52.13],
  [32.0, 52.9],
  [29.2, 55.2],
];

const STARTS = [
  { dx: -78, dy: 42, bend: 0.22 },
  { dx: 64, dy: -52, bend: -0.18 },
  { dx: -36, dy: -68, bend: 0.14 },
];

type MappedCity = City & { x: number; y: number };

export type MapCity = Pick<City, "id" | "name" | "oblast" | "capital">;

export const COUNTRY_CITIES: MapCity[] = CITIES.map(({ id, name, oblast, capital }) => ({
  id,
  name,
  oblast,
  capital,
}));

type Props = {
  className?: string;
  focusId?: string | null;
  showCaption?: boolean;
  onFocusChange?: (city: MapCity | null) => void;
  onCitySelect?: (city: MapCity) => void;
};

function routePath(fromX: number, fromY: number, toX: number, toY: number, bend: number) {
  const midX = (fromX + toX) / 2 + (toY - fromY) * bend;
  const midY = (fromY + toY) / 2 - (toX - fromX) * bend;
  return `M ${fromX.toFixed(1)} ${fromY.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${toX.toFixed(1)} ${toY.toFixed(1)}`;
}

export function LiveCityMap({
  className = "",
  focusId: controlledId,
  showCaption = true,
  onFocusChange,
  onCitySelect,
}: Props) {
  const [internalId, setInternalId] = useState<string | null>(null);
  const focusId = controlledId !== undefined ? controlledId : internalId;

  const borderPath = useMemo(
    () =>
      BORDER.map(([lng, lat], index) => {
        const point = project(lng, lat);
        return `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
      }).join(" ") + " Z",
    [],
  );

  const towns = useMemo(() => TOWNS.map(([lng, lat]) => project(lng, lat)), []);

  const cities = useMemo(
    () =>
      CITIES.map((city) => ({
        ...city,
        ...project(city.lng, city.lat),
      })),
    [],
  );

  const focused = cities.find((city) => city.id === focusId) ?? null;
  const routes = focused
    ? STARTS.map((start, index) => ({
        id: `${focused.id}-${index}`,
        d: routePath(focused.x + start.dx, focused.y + start.dy, focused.x, focused.y, start.bend),
        delay: 0.15 * index,
        duration: 11 + index * 2,
      }))
    : [];

  function toPublic(city: MappedCity): MapCity {
    return { id: city.id, name: city.name, oblast: city.oblast, capital: city.capital };
  }

  function focusCity(city: MappedCity | null) {
    if (controlledId === undefined) {
      setInternalId(city?.id ?? null);
    }
    onFocusChange?.(city ? toPublic(city) : null);
  }

  function selectCity(city: MappedCity) {
    focusCity(city);
    onCitySelect?.(toPublic(city));
  }

  return (
    <div
      className={`map-stage relative h-full min-h-[240px] w-full overflow-hidden bg-ink ${className}`}
      onPointerLeave={() => focusCity(null)}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Карта Беларуси. Наведите на город — откроется маршрут к заявке."
      >
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#1a1c14" />
            <stop offset="100%" stopColor="#08090c" />
          </radialGradient>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="url(#mapGlow)" />
        <path d={borderPath} fill="#12141a" stroke="#c8f542" strokeWidth="2.2" />
        {towns.map((town, index) => (
          <circle key={`town-${index}`} cx={town.x} cy={town.y} r="3.2" fill="#7a5cff" opacity="0.55" />
        ))}
        {routes.map((route) => (
          <g key={route.id}>
            <path
              className="route-draw"
              d={route.d}
              pathLength={1}
              style={{ animationDelay: `${route.delay}s` }}
            />
            <path
              className="route-flow"
              d={route.d}
              pathLength={1}
              style={{ animationDelay: `${route.delay + 0.4}s` }}
            />
            <g
              className="route-walker"
              style={{
                offsetPath: `path("${route.d}")`,
                animationDuration: `${route.duration}s`,
                animationDelay: `${route.delay + 0.9}s`,
              }}
            >
              <circle r="4.5" cy="-6" fill="#7a5cff" />
              <rect x="-2.2" y="-1" width="4.4" height="9" fill="#7a5cff" />
            </g>
          </g>
        ))}
        {cities.map((city) => {
          const active = focused?.id === city.id;
          return (
            <g
              key={city.id}
              transform={`translate(${city.x} ${city.y})`}
              className="cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              role="button"
              tabIndex={0}
              focusable="true"
              aria-pressed={active}
              aria-label={`${city.name}. Маршрут к заявке`}
              onPointerEnter={() => focusCity(city)}
              onClick={() => selectCity(city)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectCity(city);
                }
              }}
            >
              <circle r="56" fill={active ? "rgba(200,245,66,0.1)" : "transparent"} />
              <circle r={active ? 14 : 11} className="pin-pulse" fill={city.capital ? "#c8f542" : "#7a5cff"} />
              {city.capital ? (
                <rect x="-5.5" y="-5.5" width="11" height="11" fill="#c8f542" />
              ) : (
                <circle r="4.5" fill="#c8f542" />
              )}
              {active ? <circle r="7" fill="#c8f542" /> : null}
              <text
                x={city.label.dx}
                y={city.label.dy}
                fill={active ? "#c8f542" : "#e4e4e7"}
                fontSize={city.capital ? 20 : 16}
                fontFamily="Unbounded, sans-serif"
                fontWeight={700}
                className="pointer-events-none uppercase"
              >
                {city.name}
              </text>
              {city.capital ? (
                <text
                  x={city.label.dx}
                  y={city.label.dy + 18}
                  fill="#a1a1aa"
                  fontSize={12}
                  fontFamily="Onest, sans-serif"
                  className="pointer-events-none"
                >
                  сталіца
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {showCaption ? (
        <p className="pointer-events-none absolute bottom-4 left-4 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {focused ? `${focused.name} · идут к заявке` : "Вся Беларусь · наведите на город"}
        </p>
      ) : null}
    </div>
  );
}
