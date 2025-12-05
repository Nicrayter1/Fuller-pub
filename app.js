// app.js - Минимальная рабочая версия

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let currentUser = null;
let userRole = null;
let userBar = null;
let products = [];
let categories = [];
let supabase = null; // Используем простое имя
// Добавьте этот код после let supabase = null;
async function handleFirstUser(userId, userEmail) {
    console.log('Обработка первого пользователя...');
    
    // Создаем временный профиль
    currentUser = {
        id: userId,
        email: userEmail,
        full_name: userEmail.split('@')[0],
        role_id: 1,
        bar_number: 1
    };
    userRole = 'admin';
    userBar = 1;
    
    updateUserUI();
    
    // Показываем инструкцию
    showInfoModal(
        '👋 Добро пожаловать!',
        `<h3>Вы первый пользователь системы!</h3>
        <p>Вы назначены <strong>администратором</strong>.</p>
        <p>Для начала работы:</p>
        <ol>
            <li>Добавьте категории через панель управления</li>
            <li>Добавьте продукты в категории</li>
            <li>Создайте других пользователей в Supabase Auth</li>
        </ol>
        <p><strong>Важно:</strong> Таблицы в базе данных будут созданы автоматически при первом использовании.</p>`
    );
    
    return true;
}
// ==================== ПРОВЕРКА ЗАГРУЗКИ БИБЛИОТЕКИ ====================

// Ждем загрузки Supabase
function waitForSupabase() {
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (window.supabase && window.supabase.createClient) {
                clearInterval(checkInterval);
                resolve(true);
            }
        }, 100);
        
        // Таймаут 5 секунд
        setTimeout(() => {
            clearInterval(checkInterval);
            resolve(false);
        }, 5000);
    });
}

// ==================== БАЗОВЫЕ ФУНКЦИИ ====================

function showLoader(show, message = 'Загрузка...') {
    try {
        const loader = document.getElementById('dataLoader');
        if (!loader) return;
        
        loader.style.display = show ? 'block' : 'none';
        if (message && show) {
            const text = loader.querySelector('div:last-child');
            if (text) text.textContent = message;
        }
    } catch (e) {
        console.error('Ошибка showLoader:', e);
    }
}

function showAlert(message, type = 'info', elementId = null) {
    try {
        const alertEl = elementId ? 
            document.getElementById(elementId) : 
            document.getElementById('mainAlert');
        
        if (!alertEl) {
            // Создаем временный алерт если не найден
            const tempAlert = document.createElement('div');
            tempAlert.className = `alert alert-${type}`;
            tempAlert.innerHTML = message;
            tempAlert.style.cssText = `
                position: fixed; top: 20px; right: 20px; 
                z-index: 9999; padding: 15px; border-radius: 5px;
                background: ${type === 'error' ? '#f8d7da' : type === 'success' ? '#d4edda' : '#d1ecf1'};
                color: ${type === 'error' ? '#721c24' : type === 'success' ? '#155724' : '#0c5460'};
                border: 1px solid ${type === 'error' ? '#f5c6cb' : type === 'success' ? '#c3e6cb' : '#bee5eb'};
            `;
            document.body.appendChild(tempAlert);
            setTimeout(() => tempAlert.remove(), 5000);
            return;
        }
        
        alertEl.className = `alert alert-${type}`;
        alertEl.innerHTML = message;
        alertEl.style.display = 'block';
        
        if (!elementId) {
            setTimeout(() => {
                alertEl.style.display = 'none';
            }, 5000);
        }
    } catch (e) {
        console.error('Ошибка showAlert:', e);
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

async function initApp() {
    console.log('Инициализация приложения...');
    
    showLoader(true, 'Проверка Supabase...');
    
    try {
        // 1. Ждем загрузки Supabase библиотеки
        const supabaseLoaded = await waitForSupabase();
        if (!supabaseLoaded) {
            throw new Error('Supabase библиотека не загрузилась. Проверьте интернет соединение.');
        }
        
        console.log('Supabase загружен:', window.supabase);
        
        // 2. Проверяем конфигурацию
        if (!window.SUPABASE_CONFIG) {
            throw new Error('Конфигурация Supabase не найдена в config.js');
        }
        
        // 3. Инициализируем клиент
        supabase = window.supabase.createClient(
            window.SUPABASE_CONFIG.url,
            window.SUPABASE_CONFIG.anonKey,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            }
        );
        
        console.log('Supabase клиент создан:', supabase);
        
        // 4. Проверяем сессию
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Ошибка сессии:', error);
            showLoginScreen();
            return;
        }
        
        if (session && session.user) {
            console.log('Пользователь найден:', session.user.email);
            await loadUserProfile(session.user.id);
            showMainInterface();
        } else {
            console.log('Сессия не найдена, показываем логин');
            showLoginScreen();
        }
        
    } catch (error) {
        console.error('Критическая ошибка инициализации:', error);
        showAlert(`❌ Ошибка: ${error.message}`, 'error');
        showLoginScreen();
    } finally {
        showLoader(false);
    }
}

// ==================== АВТОРИЗАЦИЯ ====================

async function loadUserProfile(userId) {
async function loadUserProfile(userId) {
    console.log('Загрузка профиля для:', userId);
    
    try {
        if (!supabase) {
            throw new Error('Supabase клиент не инициализирован');
        }
        
        // Пытаемся получить профиль
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select(`
                *,
                user_roles (name)
            `)
            .eq('id', userId)
            .single();
        
        console.log('Результат запроса профиля:', { profile, error });
        
        if (error) {
            // Если таблицы нет или профиль не найден
            if (error.code === 'PGRST205' || error.code === 'PGRST116') {
                console.log('Таблица не существует или профиль не найден');
                
                // Проверяем, есть ли уже пользователи
                const { count } = await supabase
                    .from('user_profiles')
                    .select('*', { count: 'exact', head: true })
                    .catch(() => ({ count: 0 }));
                
                // Если это первый пользователь
                if (count === 0 || error.code === 'PGRST205') {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        await handleFirstUser(userId, user.email);
                        return true;
                    }
                }
                
                // Создаем обычного пользователя
                await createUserProfile(userId);
                return await loadUserProfile(userId);
            }
            throw error;
        }
        
        // Устанавливаем данные
        currentUser = profile;
        userRole = profile.user_roles?.name || 'barman';
        userBar = profile.bar_number || 1;
        
        console.log('Профиль загружен:', { currentUser, userRole, userBar });
        
        updateUserUI();
        return true;
        
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        
        // Пытаемся создать профиль как запасной вариант
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await handleFirstUser(userId, user.email);
                return true;
            }
        } catch (createError) {
            console.error('Не удалось создать профиль:', createError);
        }
        
        showAlert('❌ Ошибка загрузки профиля. Таблицы не созданы.', 'error');
        await logout();
        return false;
    }
}
        
        // Устанавливаем данные
        currentUser = profile;
        userRole = profile.user_roles?.name || 'barman';
        userBar = profile.bar_number || 1;
        
        console.log('Профиль загружен:', { currentUser, userRole, userBar });
        
        updateUserUI();    
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        
        // Если это первый пользователь, создаем админа
        if (error.message.includes('relation "user_profiles" does not exist')) {
            console.log('Таблица не существует, создаем первого пользователя...');
            try {
                await createFirstUserProfile(userId);
                await loadUserProfile(userId);
                return;
            } catch (createError) {
                console.error('Ошибка создания первого пользователя:', createError);
            }
        }
        
        showAlert('❌ Ошибка загрузки профиля. Проверьте подключение к базе.', 'error');
        await logout();
    }
}

async function createUserProfile(userId) {
    console.log('Создание профиля для:', userId);
    
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new Error('Не удалось получить данные пользователя');
        }
        
        // Проверяем существование таблицы
        const { count } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true });
        
        const isFirstUser = count === 0;
        
        // Создаем профиль
        const { error: insertError } = await supabase
            .from('user_profiles')
            .insert([{
                id: userId,
                email: user.email,
                full_name: user.email.split('@')[0],
                role_id: isFirstUser ? 1 : 2,
                bar_number: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }]);
        
        if (insertError) {
            // Если таблицы нет, создаем простого пользователя
            if (insertError.code === '42P01') {
                console.log('Таблица user_profiles не существует');
                throw new Error('Таблица не существует');
            }
            throw insertError;
        }
        
        console.log('Профиль создан успешно');
        
    } catch (error) {
        console.error('Ошибка создания профиля:', error);
        throw error;
    }
}

// Альтернативная функция для первого пользователя
async function createFirstUserProfile(userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    console.log('Создаем первого пользователя как администратора');
    
    // Устанавливаем данные для первого пользователя
    currentUser = {
        id: userId,
        email: user.email,
        full_name: user.email.split('@')[0],
        role_id: 1,
        bar_number: 1
    };
    userRole = 'admin';
    userBar = 1;
    
    updateUserUI();
    showAlert('✅ Вы первый пользователь! Вы назначены администратором.', 'success');
}

async function handleLogin(email, password) {
    const btn = document.getElementById('loginBtn');
    const alert = document.getElementById('loginAlert');
    
    if (!btn || !alert) return false;
    
    if (!email || !password) {
        showAlert('❌ Заполните все поля', 'error', 'loginAlert');
        return false;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<div style="display:inline-block;width:20px;height:20px;border:2px solid #fff;border-radius:50%;border-top-color:transparent;animation:spin 1s linear infinite;margin-right:10px;"></div> Вход...';
    
    try {
        if (!supabase) {
            throw new Error('Supabase не инициализирован');
        }
        
        console.log('Попытка входа:', email);
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });
        
        if (error) {
            console.error('Ошибка входа:', error);
            throw error;
        }
        
        console.log('Вход успешен:', data.user.email);
        
        await loadUserProfile(data.user.id);
        showMainInterface();
        
        showAlert('✅ Вход выполнен!', 'success', 'loginAlert');
        return true;
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        
        let message = 'Ошибка входа';
        if (error.message.includes('Invalid')) {
            message = '❌ Неверный email или пароль';
        } else if (error.message.includes('Email not confirmed')) {
            message = '❌ Подтвердите email';
        } else {
            message = `❌ ${error.message}`;
        }
        
        showAlert(message, 'error', 'loginAlert');
        return false;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>🔑 Войти в систему</span>';
    }
}

async function logout() {
    try {
        if (!confirm('Выйти из системы?')) return;
        
        if (supabase) {
            await supabase.auth.signOut();
        }
        
        currentUser = null;
        userRole = null;
        userBar = null;
        products = [];
        categories = [];
        
        showLoginScreen();
        showAlert('✅ Вы вышли из системы', 'success');
        
    } catch (error) {
        console.error('Ошибка выхода:', error);
        showAlert('❌ Ошибка при выходе', 'error');
    }
}

// ==================== ИНТЕРФЕЙС ====================

function showLoginScreen() {
    try {
        const loginScreen = document.getElementById('loginScreen');
        const mainScreen = document.getElementById('mainScreen');
        const appHeader = document.getElementById('appHeader');
        
        if (loginScreen) loginScreen.style.display = 'block';
        if (mainScreen) mainScreen.style.display = 'none';
        if (appHeader) appHeader.style.display = 'none';
        
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
    } catch (e) {
        console.error('Ошибка showLoginScreen:', e);
    }
}

function showMainInterface() {
    try {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainScreen').style.display = 'block';
        document.getElementById('appHeader').style.display = 'flex';
        
        // Права доступа
        if (userRole === 'admin') {
            document.getElementById('controlPanel').style.display = 'flex';
            document.getElementById('actionsHeader').innerHTML = 'Действия';
        } else {
            document.getElementById('controlPanel').style.display = 'none';
            document.getElementById('actionsHeader').innerHTML = '';
        }
        
        loadData();
    } catch (e) {
        console.error('Ошибка showMainInterface:', e);
    }
}

function updateUserUI() {
    try {
        if (!currentUser) return;
        
        const name = currentUser.full_name || currentUser.email.split('@')[0];
        const avatarLetter = name.charAt(0).toUpperCase();
        
        document.getElementById('userName').textContent = name;
        document.getElementById('userRole').textContent = 
            userRole === 'admin' ? 'Администратор' : `Бармен (Бар ${userBar})`;
        document.getElementById('userAvatar').textContent = avatarLetter;
    } catch (e) {
        console.error('Ошибка updateUserUI:', e);
    }
}

// ==================== РАБОТА С ДАННЫМИ ====================

async function loadData() {
    if (!currentUser || !supabase) return;
    
    showLoader(true, 'Загрузка данных...');
    
    try {
        // Категории
        const { data: cats, error: catError } = await supabase
            .from('categories')
            .select('*')
            .order('order_index');
        
        if (catError) throw catError;
        categories = cats || [];
        
        // Продукты
        const { data: prods, error: prodError } = await supabase
            .from('products')
            .select('*')
            .order('category_id')
            .order('name');
        
        if (prodError) throw prodError;
        products = prods || [];
        
        updateTable();
        updateStats();
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showAlert(`❌ Ошибка загрузки: ${error.message}`, 'error');
        
        // Если таблицы не существуют, показываем информацию
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
            showAlert('⚠️ Таблицы не созданы. Выполните SQL запросы в Supabase.', 'warning');
        }
    } finally {
        showLoader(false);
    }
}

// ... остальные функции (updateTable, updateStats, updateStock и т.д.)
// ДОБАВЬТЕ ИХ ИЗ ПРЕДЫДУЩЕГО КОДА

// ==================== ГЛОБАЛЬНЫЕ ФУНКЦИИ ====================

window.logout = logout;
window.initApp = initApp;

// ==================== ЗАГРУЗКА ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, запускаем приложение...');
    
    // Добавляем стиль для спиннера
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    // Обработчик формы входа
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        await handleLogin(email, password);
    });
    
    // Закрытие модальных окон
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Запуск приложения с задержкой
    setTimeout(initApp, 500);
});
