// =============================================
// CONFIG.JS - НАСТРОЙКИ ДЛЯ БАРНОГО УЧЕТА
// =============================================

window.SUPABASE_CONFIG = {
    // Supabase данные
    URL: 'https://lmysveosqckpbyuldiym.supabase.co',
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxteXN2ZW9zcWNrcGJ5dWxkaXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MTMxNTksImV4cCI6MjA4MDM4OTE1OX0.z1i_Fi7uCXnX3cml7RbTHR6RxIrxVY947iOCTi80fQY',
    
    // Настройки приложения
    APP_NAME: '🍸 Bar Stock System',
    AUTO_REFRESH: 300000, // 5 минут
    EXPORT_FILENAME: 'стоки_бара',
    
    // Уведомления
    ENABLE_NOTIFICATIONS: true,
    
    // Отладка
    DEBUG_MODE: true
};

console.log('✅ Config.js загружен');
