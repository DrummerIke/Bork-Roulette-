# Bork Roulette

Встраиваемый виджет для Google Sites с прозрачным фоном: форма сохраняет телефон сотрудника на выбранную дату, а рандомайзер по паролю выбирает случайный сохраненный номер за выбранный день.

## Настройка Supabase

1. Выполните SQL из `supabase.sql` в Supabase SQL Editor.
2. Убедитесь, что таблица `public.employees` доступна на чтение для anon key и содержит поля `id uuid` и `name text`.
3. Виджет уже содержит текущий публичный Supabase URL как fallback. Если ключ нужно заменить, в Google Sites перед `src/app.js` задайте публичные ключи проекта:

```html
<script>
  window.BORK_SUPABASE_URL = 'https://mhtbolnovisgdliphsmf.supabase.co';
  window.BORK_SUPABASE_ANON_KEY = 'your-anon-key';
</script>
```

Supabase REST API уже отдает CORS-заголовки для браузерных клиентов. Для встраивания оставлен прозрачный фон `html/body`, чтобы виджет наследовал фон Google Sites. Доступ к вкладке рандомайзера закрыт клиентским паролем `06062025`.

## Локальная проверка

```bash
npm test
```
