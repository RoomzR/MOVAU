---
name: remotion-best-practices
description: Router for Remotion video work in MOVAŬ. Use when creating or rendering promo videos.
---

Официальные скиллы: https://github.com/remotion-dev/skills

Проект ролика: `promo/`.

- Разметка: `useCurrentFrame()` + `interpolate()`. Не CSS animation/transition.
- Несколько сцен: папка сцен + `TransitionSeries`.
- Субтитры: тип `Caption` из `@remotion/captions`, JSON в `public/`.
- Шрифты: `@remotion/google-fonts`, кириллица.
- Превью: `npx remotion studio --no-open`
- Рендер: `npx remotion render MovauAd out/movau-ad.mp4`

Бренд: Unbounded, фон `#08090C`, лайм `#C8F542`, фиолет смены `#7A5CFF`. Без emoji. «заявка», чтение «мовай».
