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
        url: 'https://=.supabase.co',
        anonKey: ''
    };
    
    // Предупреждение в консоль
    if (isLocal) {
        console.warn('⚠️ Режим разработки: Supabase ключ доступен в браузере!');
        console.warn('⚠️ В продакшене обязательно используйте защищенный бэкенд!');
    } else {
        console.warn('⚠️ ПРЕДУПРЕЖДЕНИЕ БЕЗОПАСНОСТИ:');
        console.warn('⚠️ Ключ Supabase доступен в браузере!');
        console.warn('⚠️ Срочно перенесите логику на серверный бэкенд!');
    }
    
    // Функция для безопасного получения конфигурации
    window.getSupabaseConfig = function() {
        return {
            ...window.SUPABASE_CONFIG,
            // Можно добавить проверки
            isValid: function() {
                return this.url && this.anonKey && 
                       this.url.startsWith('https://') &&
                       this.anonKey.length > 20;
            }
        };
    };
})();
