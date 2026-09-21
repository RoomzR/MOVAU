---
name: three-spatial
description: 3D/WebGL for MOVAŬ with Three.js and React Three Fiber. Use when building the night field, map scene, people-on-shift motion, or any spatial UI. Do not clone the three.js or Flutter repos into the project.
---

# Three.js в MOVAŬ

Сцена живёт в `frontend/src/components/scene/CityStage.tsx`. Янтарь = заявка, бирюза = человек на смене.

## Правила

- Один Canvas на блок. `dpr={[1, 1.75]}`, fog, мало света.
- Люди на смене — `InstancedMesh`, не сотни отдельных mesh.
- `prefers-reduced-motion`: Canvas не монтировать, показать плоскую карту.
- Не ставить OrbitControls на весь лендинг — ломает скролл.
- Hover на `.map-stage` усиливает walk, не включает цирк.

## Не качать в репозиторий

- Весь GitHub `mrdoob/three.js` — это движок, пакет уже в npm.
- Весь `flutter/flutter` — натив позже, в `mobile/`. Сейчас веб на React.
- `animate.css` — устаревший bounce. Движение: `motion/react` + `useFrame`.

## Цвет сцены

Ночь `#0C0B0A`, заявка `#E8B45A`, смена `#6EC8B8`.
