// auth.js - Логика авторизации

// Вход в систему
async function login(email, password) {
    const btn = document.getElementById('loginBtn');
    const alert = document.getElementById('loginAlert');
    
    // Валидация
    if (!email || !password) {
        showAlert('❌ Заполните все поля', 'error', alert);
        return false;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<div class="loader-spinner" style="width: 20px; height: 20px; border-width: 2px;"></div> Вход...';
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });
        
        if (error) throw error;
        
        // Ждем загрузки профиля
        await loadUserProfile(data.user.id);
        showMainInterface();
        
        showAlert('✅ Успешный вход! Добро пожаловать в систему.', 'success', alert);
        return true;
        
    } catch (error) {
        let message = 'Ошибка входа';
        
        switch (error.message) {
            case 'Invalid login credentials':
                message = '❌ Неверный email или пароль';
                break;
            case 'Email not confirmed':
                message = '❌ Email не подтвержден. Проверьте вашу почту';
                break;
            case 'Too many requests':
                message = '❌ Слишком много попыток. Попробуйте позже';
                break;
            default:
                message = `❌ ${error.message}`;
        }
        
        showAlert(message, 'error', alert);
        return false;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🔑 Войти в систему';
    }
}

// Выход из системы
async function logout() {
    try {
        // Показываем подтверждение
        if (!confirm('Вы уверены, что хотите выйти?')) return;
        
        await supabase.auth.signOut();
        currentUser = null;
        userRole = null;
        userBar = null;
        products = [];
        categories = [];
        
        showLoginScreen();
        showAlert('✅ Вы успешно вышли из системы', 'success');
        
    } catch (error) {
        console.error('Ошибка выхода:', error);
        showAlert('❌ Ошибка при выходе из системы', 'error');
    }
}

// Сброс пароля
async function resetPassword(email) {
    const alert = document.getElementById('resetAlert');
    
    if (!email || !email.includes('@')) {
        showAlert('❌ Введите корректный email', 'error', alert);
        return false;
    }
    
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`,
        });
        
        if (error) throw error;
        
        showAlert('✅ Инструкция по сбросу пароля отправлена на ваш email', 'success', alert);
        return true;
        
    } catch (error) {
        let message = 'Ошибка сброса пароля';
        
        switch (error.message) {
            case 'User not found':
                message = '❌ Пользователь с таким email не найден';
                break;
            default:
                message = `❌ ${error.message}`;
        }
        
        showAlert(message, 'error', alert);
        return false;
    }
}

// Проверка сессии
async function checkSession() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    } catch (error) {
        console.error('Ошибка проверки сессии:', error);
        return null;
    }
}

// Получение текущего пользователя
function getCurrentUser() {
    return {
        user: currentUser,
        role: userRole,
        bar: userBar
    };
}

// Проверка прав доступа
function checkPermission(requiredRole, requiredBar = null) {
    if (userRole === 'admin') return true;
    if (userRole !== requiredRole) return false;
    if (requiredBar && userBar !== requiredBar) return false;
    return true;
}

// Экспорт функций для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        login,
        logout,
        resetPassword,
        checkSession,
        getCurrentUser,
        checkPermission
    };
}
