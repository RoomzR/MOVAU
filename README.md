# MOVAŬ

**Мова дапамогі / Speak help**

Гео-информационная платформа реального времени для взаимопомощи. Люди создают заявки, свободные исполнители рядом откликаются. Это не доска объявлений — экосистема, похожая на Uber, но для помощи.

Язык интерфейса: русский. Белорусский — в слоганах и отдельных элементах.

## Что уже есть

- Docker Compose: PostGIS, Redis, gateway (YARP :8000), core (HTTP), realtime (SignalR), React
- JWT (access + refresh), профили и роли (исполнитель / волонтёр)
- CRUD заявок с точкой `Geography(POINT, 4326)`
- Лента рядом: `GET /api/v1/requests?lat=&lng=&radius_m=&category=` (`ST_DWithin`, `distance_m`)
- Смена исполнителя: Redis `shift:{user_id}`, `POST /api/v1/shift/on|heartbeat|off`, `GET /me`
- Отклики: `POST /api/v1/requests/{id}/offers`, назначение, `start` / `complete`
- Чат заявки: `GET` / `POST /api/v1/requests/{id}/messages` (история и отправка; автор и назначенный исполнитель; статусы assigned / in_progress / completed)
- Realtime-чат: SignalR `/hubs/chat` — `Join(requestId)`, пуш `message` в группу `request:{id}` (тот же JWT, `access_token` в query)
- Оценки: `GET` / `POST /api/v1/requests/{id}/reviews` после `completed`; публично `GET /users/{id}/reviews`. Карма: `karma_points`, `rating_avg`, `rating_count`
- Эскроу: демо-кошелёк (`wallets` / `wallet_holds` / `wallet_txns`). Создана → оплачена (заморожено) → исполнена → выплачено. Hyperledger в MVP нет
- Личность: разворот паспорта/ID и селфи → очередь модератора. Создавать и брать заявки (платные и дарма) — только после `verified`. Без Sumsub; лицо сверяет модератор
- Колокол: отклик, назначение исполнителю, старт, QR-оплата, спор; не автору его же действие
- Телефон: демо-OTP `123456`, без SMS. Подтверждённый номер виден сторонам заявки, чужой профиль его не отдаёт. Заявки по-прежнему через личность, не через телефон
- Живая точка: Redis `track:{requestId}` TTL 90 с, только assigned/in_progress. ETA при ping через OSRM (без пробок OSM). Карта на детали заявки, не на главной
- Админка: консоль `/admin`. Роли со списка людей (исполнитель / волонтёр) и в карточке; модератор — executor/volunteer, admin — ещё business/moderator/analyst. Роль admin через API нельзя
- Бизнес: `/business` — свои заявки и пакет 2–8 точек (лимит 20 активных). Клиент по-прежнему не больше трёх
- Лимит 3 активные заявки; волонтёр видит и откликается только на дарму; уровень клиента (новичок / постоянный / VIP); герои района; кабинет бизнеса и аналитика; споры на карточке заявки
- Веб: лендинг, вход, регистрация, лента «Рядом», создание заявок, тумблер «На смене», отклики, переписка и оценка на карточке заявки, колокол и `/inbox`, профиль `/me` (кольца личность/карма/оценка, баланс и «Пополнить»), проверка личности `/me/verify`, админ-консоль `/admin`, кабинет `/business`, аналитика `/analyst`
- Expo MVP: `mobile/` — вход, рядом, заявка, профиль, смена. Веб остаётся основным UI
- Логотип (белый wordmark и mark на `#08090C`): `design-system/MOVAU/logo/`, копии в `frontend/public/brand/`

## Стек

| Слой | Технологии |
|---|---|
| Backend | C# / ASP.NET Core 8, трёхслойка (Domain / Application / Infrastructure), gateway + core + realtime |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, TanStack Query |
| Data | PostgreSQL 16 + PostGIS, Redis 7 |
| Infra | Docker Compose, GitHub Actions |

## Запуск

Нужны Docker Desktop и файл `.env` (скопируйте из примера):

```bash
cp .env.example .env
docker compose up --build
```

На Windows в PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

- API: http://localhost:8000/api/v1
- Health: http://localhost:8000/health
- Web: http://localhost:5173
- Mobile: `cd mobile && npx expo start` (на устройстве задайте `EXPO_PUBLIC_API_URL` на LAN IP, см. `mobile/README.md`)

Демо-аккаунты (пароль у всех `movau123`):

| Email | Роль |
|---|---|
| client@movau.test | клиент, личность подтверждена |
| exec@movau.test | исполнитель, личность подтверждена |
| volunteer@movau.test | волонтёр (лента только дарма, личность подтверждена) |
| business@movau.test | бизнес, личность подтверждена |
| moderator@movau.test | модератор |
| analyst@movau.test | аналитик |
| admin@movau.test | админ |

Или регистрация в UI / `POST /api/v1/auth/register`.

## API кратко

- `POST /api/v1/auth/register` — email + пароль, опционально `as_executor` / `as_volunteer`
- `POST /api/v1/auth/login` / `refresh` / `GET /me`
- `GET` / `PATCH /api/v1/users/me` — свой профиль; `GET /api/v1/users/{id}` — публичная карточка; `GET /api/v1/users/{id}/reviews` — отзывы о человеке
- `POST` / `DELETE /api/v1/users/me/roles` — исполнитель и волонтёр
- `GET /api/v1/requests` — открытые заявки; `lat`/`lng`/`radius_m` — рядом; `category` — фильтр категории
- `POST /api/v1/requests` — создать (нужен токен)
- `PATCH` / `DELETE /api/v1/requests/{id}` — править / отменить, только автор
- `POST /api/v1/requests/{id}/offers` — отклик исполнителя; `GET` — список
- `POST /api/v1/offers/{id}/accept` / `withdraw` — назначить / отозвать
- `POST /api/v1/requests/{id}/start` / `complete` — в работе / выполнено
- `GET` / `POST /api/v1/requests/{id}/messages` — переписка по заявке (история и отправка)
- `/hubs/chat` — SignalR: `Join(requestId)`, событие `message` в группу заявки
- `GET` / `POST /api/v1/requests/{id}/reviews` — оценки после выполнения (автор и исполнитель)
- `GET /api/v1/users/{id}` и `/me` — `karma_points`, `rating_avg`, `rating_count` (считаются из отзывов)
- `GET /api/v1/shift/me` — состояние смены (только исполнитель)
- `POST /api/v1/shift/on` / `heartbeat` / `off` — выход на смену, пульс, выход
- `GET /api/v1/wallet/me` — баланс, холды и операции; `POST /api/v1/wallet/topup` — демо-пополнение (1–10000)
- `GET` / `POST /api/v1/identity/me` — статус и заявка на проверку (паспорт + селфи); `GET .../document|selfie` — свои фото
- `GET /api/v1/admin/overview` — очереди: личность, споры, заявки, люди
- `GET /api/v1/admin/events` — журнал: `actor_email`, поиск `q` по email/имени/id
- `GET /api/v1/admin/users/{id}` — карточка; `POST .../deactivate|activate`
- `POST` / `DELETE /api/v1/admin/users/{id}/roles` — матрица: модератор — executor/volunteer; admin — плюс business/moderator/analyst
- `GET /api/v1/admin/identity` — очередь модератора; `POST .../{id}/review` — verified/rejected
- `POST /api/v1/admin/requests/{id}/cancel` — принудительная отмена и возврат холда
- `POST /api/v1/admin/disputes/{id}/resolve` — закрыть спор текстом
- `GET /api/v1/business/me` — цифры кабинета; `GET` / `POST /api/v1/business/requests` — список и пакет 2–8
- `GET /api/v1/analyst/overview?days=` — снимок, воронка, конверсия, `cells`, `points`, `match_ctr`
- `GET /api/v1/requests/{id}/matches` — подбор на смене; `POST .../matches/{userId}/click` — клик автора
- `POST /api/v1/requests/{id}/repeat` — новая заявка из выполненной
- `GET /api/v1/notifications` — колокол и `/inbox` (`unread_count`); клик открывает `href` заявки; `POST .../{id}/read` и `.../read-all`
- `POST /api/v1/phone/send` / `confirm` — демо-код всегда `123456`
- `POST` / `GET /api/v1/requests/{id}/location` — точка исполнителя (назначенный пишет, автор и он читают)

## Структура

```
backend/     Domain (Entities/Enums), Application, Infrastructure, Api, Realtime, Gateway — один тип на файл
frontend/    React + Vite
mobile/      Expo MVP, тот же API через gateway :8000
design-system/  токены UI (UI/UX Pro Max)
docs/        архитектура
```

## Почему не 8 микросервисов

Эскро, заявки и PostGIS живут одной транзакцией — отдельная БД платежей сломает холд. Auth и GIS тоже не выносим. Вынесены **gateway**, **core** (HTTP + Postgres) и **realtime** (SignalR + Redis pub/sub): чат и геострим масштабируются отдельно. Клиенты по-прежнему ходят на `localhost:8000`.

## Дорожная карта

1. ~~Лента рядом (`ST_DWithin`) и режим «На смене»~~
2. ~~Отклики и статусы заявки~~
3. ~~HTTP-чат по заявке~~
4. ~~Карма и рейтинги~~
5. ~~Realtime-чат через SignalR~~
6. ~~Эскроу-кошелёк~~
7. ~~Expo iOS/Android~~
8. ~~Админка~~
9. ~~Верификация личности~~
10. ~~Колокол, демо-телефон, живой трек заявки~~
11. ~~Админ-консоль: разделы, поиск, журнал~~
12. ~~Колокол цикла заявки, staff-роли, кабинет бизнеса~~
13. ~~Аналитика: период, таблица категорий, лёгкие графики~~
14. ~~Подбор на смене, теплокарта, повтор заявки~~
15. ~~Карта аналитика как лента, график периода, матрица ролей~~
16. ~~Тепловизор аналитика, воронка, выдача ролей со списка людей~~
17. ~~Повтор с ошибкой и переходом, разбор подбора, точка пакета на карте~~
18. ~~Отклики на карточке, проводки кошелька, клик-точка при создании заявки~~
19. ~~Оценка после complete, ошибка смены, путь к кошельку при неоплате~~
20. ~~Правка открытой заявки, свои фото паспорта, отклик с карты~~
21. ~~Кольца профиля, авто-ETA по треку, топ-3 рекомендации и CTR~~
22. ~~Компактный кошелёк, читаемый пайплайн эскро, скролл длинных списков~~
23. ~~Фильтр карты по категории и радиусу, отзывы на публичном профиле~~
24. ~~Трёхслойка + gateway / core / realtime~~

На защите: матчинг — скоринг, не нейросеть; ETA — OSRM без пробок OSM; эскро — таблица проводок, Hyperledger Fabric как следующий этап.

## Тесты

```bash
docker compose exec core dotnet test /src/Movau.sln --nologo
```
