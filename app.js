// app.js - Основная логика приложения

// Глобальные переменные
let currentUser = null;
let userRole = null;
let userBar = null;
let products = [];
let categories = [];
let users = [];
let currentPage = 1;
const itemsPerPage = 50;
let searchTimeout = null;

// Инициализация Supabase
let supabase;
try {
    const config = window.getSupabaseConfig();
    if (!config.isValid()) {
        throw new Error('Неверная конфигурация Supabase');
    }
    
    supabase = window.supabase.createClient(
        config.url,
        config.anonKey,
        {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
                storage: window.localStorage
            },
            global: {
                headers: {
                    'X-Client-Info': 'fuller-pub/v1.0'
                }
            }
        }
    );
} catch (error) {
    console.error('Ошибка инициализации Supabase:', error);
    showAlert('❌ Ошибка конфигурации приложения', 'error', true);
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем поддержку браузером необходимых функций
    if (!checkBrowserSupport()) return;
    
    // Инициализируем приложение
    initApp();
    
    // Настройка глобальных обработчиков
    setupGlobalHandlers();
    
    // Автообновление каждые 5 минут
    setInterval(() => {
        if (currentUser && !document.hidden) {
            loadData();
        }
    }, 300000); // 5 минут
});

function checkBrowserSupport() {
    const requirements = [
        'localStorage' in window,
        'Promise' in window,
        'fetch' in window,
        'URLSearchParams' in window
    ];
    
    if (requirements.some(req => !req)) {
        showAlert(
            '❌ Ваш браузер устарел и не поддерживает необходимые функции. ' +
            'Пожалуйста, обновите браузер или используйте современный браузер.',
            'error',
            true
        );
        return false;
    }
    
    return true;
}

function setupGlobalHandlers() {
    // Обработчик закрытия модальных окон
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Обработчик клавиши Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
    
    // Обновление при возвращении на вкладку
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && currentUser) {
            loadData();
        }
    });
    
    // Обработчик ошибок
    window.addEventListener('error', function(e) {
        console.error('Глобальная ошибка:', e.error);
        if (currentUser) {
            showAlert('⚠️ Произошла непредвиденная ошибка', 'warning');
        }
    });
    
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Необработанный Promise:', e.reason);
        if (currentUser) {
            showAlert('⚠️ Ошибка выполнения операции', 'warning');
        }
    });
}

// ==================== АВТОРИЗАЦИЯ ====================
async function initApp() {
    showLoader(true, 'Инициализация приложения...');
    
    try {
        // Проверяем сессию
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user) {
            await loadUserProfile(session.user.id);
            showMainInterface();
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showAlert('❌ Ошибка загрузки приложения', 'error');
        showLoginScreen();
    } finally {
        showLoader(false);
    }
}

async function loadUserProfile(userId) {
    try {
        // Получаем профиль с ролью
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select(`
                *,
                user_roles (name, permissions)
            `)
            .eq('id', userId)
            .single();
        
        if (error) {
            // Если профиль не найден, создаем его
            if (error.code === 'PGRST116') {
                await createUserProfile(userId);
                return await loadUserProfile(userId); // Рекурсивно загружаем
            }
            throw error;
        }
        
        currentUser = profile;
        userRole = profile.user_roles?.name || 'barman';
        userBar = profile.bar_number || 1;
        
        updateUserUI();
        
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        showAlert('❌ Ошибка загрузки профиля пользователя', 'error');
        await logout();
    }
}

async function createUserProfile(userId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Определяем роль по умолчанию
        const { count } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true });
        
        const isFirstUser = count === 0;
        const defaultRoleId = isFirstUser ? 1 : 2; // 1 - admin, 2 - barman

        const { error } = await supabase
            .from('user_profiles')
            .insert([{
                id: userId,
                email: user.email,
                full_name: user.email.split('@')[0],
                role_id: defaultRoleId,
                bar_number: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }]);

        if (error) throw error;
        
    } catch (error) {
        console.error('Ошибка создания профиля:', error);
        throw error;
    }
}

// Остальные функции (login, logout, updateStock и т.д.) 
// будут аналогичны предыдущему коду, но с улучшенной обработкой ошибок

// ... [остальной код аналогичен предыдущему примеру] ...
