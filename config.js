// config.js
// ВНИМАНИЕ: В продакшене используйте переменные окружения на сервере!

(function() {
    // Проверяем, работаем ли мы локально или на сервере
    const isLocal = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';
    
    // Конфигурация Supabase
    window.SUPABASE_CONFIG = {
        // Временные значения для разработки
        // В реальном проекте эти значения должны приходить с сервера
        url: 'https://lmysveosqckpbyuldiym.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5
