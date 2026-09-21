# MOVAŬ mobile

Expo. Веб остаётся основным UI. Здесь только рабочий контур:

1. Вход
2. Рядом / мои заявки
3. Взять и закрыть заявку
4. Чат и трек смены
5. Профиль и смена

Создание заявки, админка, бизнес, личность — на сайте.

## Запуск

Нужны Node 20+ и API (`docker compose up` в корне репозитория).

```bash
cd mobile
npx expo start
```

Expo Go на телефоне. На устройстве `localhost` — сам телефон, задайте LAN:

```powershell
$env:EXPO_PUBLIC_API_URL="http://192.168.1.10:8000"
$env:EXPO_PUBLIC_WEB_URL="http://192.168.1.10:5173"
npx expo start
```

Или `mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.10:8000
EXPO_PUBLIC_WEB_URL=http://192.168.1.10:5173
```

Демо: `exec@movau.test` / `movau123` (взять заявку) или `client@movau.test`.
