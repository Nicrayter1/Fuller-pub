// =============================================
// CONFIG.JS - НАСТРОЙКИ ДЛЯ FULLER PUB
// =============================================

window.SUPABASE_CONFIG = {
    // Supabase данные (ВАШИ ДАННЫЕ)
    URL: 'lmysveosqckpbyuldiym',
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxteXN2ZW9zcWNrcGJ5dWxkaXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MTMxNTksImV4cCI6MjA4MDM4OTE1OX0.z1i_Fi7uCXnX3cml7RbTHR6RxIrxVY947iOCTi80fQY',
    
    // Настройки приложения
    APP_NAME: '🍸 Fuller Pub',
    COMPANY_NAME: 'Fuller Pub Bar',
    
    // Автообновление (в миллисекундах)
    AUTO_REFRESH: 300000, // 5 минут
    
    // Экспорт
    EXPORT_FILENAME: 'fullerpub_stock',
    
    // Уведомления
    ENABLE_NOTIFICATIONS: true,
    NOTIFICATION_SOUND: false,
    
    // Отладка
    DEBUG_MODE: true,
    LOG_EVENTS: true,
    
    // Стили
    THEME: 'auto', // auto, light, dark
    PRIMARY_COLOR: '#007AFF',
    
    // Функции
    ENABLE_SEARCH: true,
    ENABLE_STATS: true,
    ENABLE_EXPORT: true,
    
    // Время работы бара (для отчетов)
    WORKING_HOURS: {
        open: '16:00',
        close: '02:00'
    }
};

// Проверка конфигурации при загрузке
if (window.SUPABASE_CONFIG.DEBUG_MODE) {
    console.log('🔧 Config.js загружен:', window.SUPABASE_CONFIG.APP_NAME);
    console.log('📡 Supabase URL:', window.SUPABASE_CONFIG.URL);
}
