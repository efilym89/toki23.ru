# toki23.ru / ТОКИ23 Clone + CRM

Рабочая 1:1-по-структуре копия `kgsushi.ru` (каталог, карточка товара, корзина, checkout) + CRM/админ-панель для общепита.

## Почему такой стек
Из-за выбранного деплоя в **GitHub Pages** (только статический хостинг) серверный Node backend с API-роутами разместить напрямую нельзя. Поэтому проект построен как **статический SPA на Vanilla JS (ES modules) + Supabase (Postgres/Auth/Storage) для production backend**, а для быстрого старта и локальной демонстрации есть **localStorage-режим** без внешней инфраструктуры. Это даёт полноценные механики сайта и CRM уже сейчас, и одновременно прозрачный путь к боевой БД/авторизации.

## Что реализовано

### Публичная часть
- Каталог меню с категориями и поиском.
- Карточки товаров с изображением, ценой, доступностью.
- Модалка товара.
- Корзина: изменение количества, удаление, итог.
- Checkout: имя, телефон, комментарий, метод (`самовывоз`/`доставка`), адрес для доставки.
- После оформления: экран `Заказ принят` с номером заказа.
- Заказы сохраняются в репозиторий данных (local или Supabase).

### CRM / Admin (`/admin.html`)
- Логин/пароль администратора.
- Dashboard: новые заказы сегодня, выручка сегодня, топ позиций.
- Меню: CRUD товаров, фильтр/поиск, пагинация, загрузка изображения с превью.
- Заказы: список + фильтры по статусу, карточка заказа, смена статуса, отметка оплаты, печать.
- Отчёты: день/неделя/месяц/период, выручка, топ продаж, CSV экспорт.
- Журнал действий (audit log).

### Качество
- Валидация checkout и форм товара через Zod (CDN) + fallback-проверки.
- Защита от SQLi/XSS:
  - SQLi: ORM-подобные безопасные запросы Supabase SDK.
  - XSS: экранирование `escapeHtml()` при рендере пользовательских данных.
- Пагинация в admin-таблицах (товары, заказы, логи).
- Ошибки и пустые состояния во всех основных экранах.
- Тесты:
  - unit: `tests/local-db.test.mjs`
  - integration order flow: `tests/order-flow.test.mjs`

## Структура проекта
- `index.html` — публичная витрина.
- `admin.html` — админ-панель.
- `assets/js/data/*` — data layer (local/supabase adapters).
- `assets/js/public/*` — UI публичной части.
- `assets/js/admin/*` — UI CRM.
- `data/kgsushi.seed.json` — seed, автоматически выгруженный из `kgsushi.ru`.
- `supabase/schema.sql` — схема БД + RLS.
- `supabase/seed.sql` — SQL seed меню.

## Локальный запуск

### Быстрый demo режим (без БД)
1. Скопируйте `config.example.js` в `config.js`.
2. Оставьте `DATA_PROVIDER: "local"`.
3. Запустите статический сервер:

```bash
python -m http.server 8080
```

4. Откройте:
- `http://localhost:8080/index.html`
- `http://localhost:8080/admin.html`

### Учётка admin (demo)
- Логин: `admin`
- Пароль: `admin123`

## Подключение Supabase (production)
1. В Supabase выполните `supabase/schema.sql`.
2. Затем выполните `supabase/seed.sql`.
3. Создайте пользователя в Auth (email/password).
4. Войдите этим пользователем и выполните функцию:

```sql
select public.make_me_admin('Main Admin');
```

5. Обновите `config.js`:

```js
window.APP_CONFIG = {
  DATA_PROVIDER: "supabase",
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_ANON_KEY",
  SUPABASE_STORAGE_BUCKET: "menu-images"
};
```

## Тесты и проверки

```bash
python scripts/validate_seed.py
node scripts/lint.mjs
node --test tests/*.test.mjs
```

## CI
- `.github/workflows/ci.yml`
  - validate seed
  - lint
  - tests

## Деплой на GitHub Pages
- `.github/workflows/deploy-pages.yml`
- При пуше в `main` собирается `dist` через `scripts/prepare_pages.py` и публикуется в ветку `gh-pages`.
- В настройках репозитория откройте `Settings -> Pages` и установите:
  - Source: `Deploy from a branch`
  - Branch: `gh-pages` / `/ (root)`

После первого деплоя ссылка будет в `Actions -> Deploy Pages`.

## Миграции/seed
- Схема: `supabase/schema.sql`
- Seed: `supabase/seed.sql`
- Перегенерация seed из `data/kgsushi.seed.json`:

```bash
python scripts/build_supabase_seed.py
```

## Скрапер исходного меню

```bash
python scripts/scrape_kgsushi.py
```

Скрипт обновляет `data/kgsushi.seed.json` из живого `kgsushi.ru`.

## Ограничения и next steps (nice-to-have)
- Загрузка изображений в Supabase Storage (сейчас upload в admin работает локально через base64 превью).
- Система ролей `manager/cashier` с разграничением прав.
- Реалтайм-обновление заказов в admin.
- Полноценный e2e в браузере (Playwright).
- Детальная печатная форма чека/кухонного тикета.
