// ВНИМАНИЕ: В продакшене используйте переменные окружения на сервере
// или защищенный бэкенд для работы с Supabase

// Для разработки - временные значения
// В реальном проекте эти значения должны приходить с сервера
window.SUPABASE_CONFIG = {
    url: 'https://lmysveosqckpbyuldiym.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxteXN2ZW9zcWNrcGJ5dWxkaXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MTMxNTksImV4cCI6MjA4MDM4OTE1OX0.z1i_Fi7uCXnX3cml7RbTHR6RxIrxVY947iOCTi80fQY'
};

console.warn('⚠️ Внимание: Supabase ключ доступен в браузере! В продакшене используйте защищенный бэкенд.');
