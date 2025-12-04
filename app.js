// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
let currentUser = null;
let userRole = null;
let userBar = null;
let products = [];
let categories = [];
let users = [];
let currentPage = 1;
const itemsPerPage = 50;

// ИНИЦИАЛИЗАЦИЯ Supabase
const supabase = window.supabase.createClient(
    window.SUPABASE_CONFIG.url,
    window.SUPABASE_CONFIG.anonKey,
    {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    }
);

// ==================== ПРОВЕРКА БАЗЫ ДАННЫХ ====================

async function checkDatabaseStructure() {
    try {
        // Проверяем существование таблиц
        const { data: tables, error } = await supabase
            .from('products')
            .select('count')
            .limit(1);
            
        if (error) {
            if (error.code === '42P01') { // Таблица не существует
                console.error('❌ Таблица "products" не существует');
                await setupDatabase();
            } else {
                throw error;
            }
        }
        
        console.log('✅ База данных проверена');
    } catch (error) {
        console.error('Ошибка проверки БД:', error);
        showAlert('❌ Ошибка подключения к базе данных', 'error', true);
    }
}

async function setupDatabase() {
    showInfoModal(
        'Настройка базы данных',
        '<p>База данных не настроена. Пожалуйста, выполните:</p>' +
        '<ol>' +
        '<li>Создайте таблицы в Supabase по инструкции</li>' +
        '<li>Настройте RLS политики</li>' +
        '<li>Добавьте тестовые данные</li>' +
        '</ol>'
    );
}

// ==================== АВТОРИЗАЦИЯ (ИСПРАВЛЕННАЯ) ====================

async function initApp() {
    showLoader(true, 'Инициализация приложения...');
    
    // Проверяем структуру БД
    await checkDatabaseStructure();
    
    // Проверяем сессию
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
        await loadUserProfile(session.user.id);
        showMainInterface();
    } else {
        showLoginScreen();
    }
    
    showLoader(false);
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
            if (error.code === 'PGRST116') { // Запись не найдена
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Определяем роль по умолчанию (первый пользователь - админ)
    const { data: usersCount } = await supabase
        .from('user_profiles')
        .select('count', { count: 'exact', head: true });
    
    const isFirstUser = !usersCount || usersCount === 0;
    const defaultRoleId = isFirstUser ? 1 : 2; // 1 - admin, 2 - barman

    const { error } = await supabase
        .from('user_profiles')
        .insert([{
            id: userId,
            email: user.email,
            full_name: user.email.split('@')[0],
            role_id: defaultRoleId,
            bar_number: 1,
            created_at: new Date().toISOString()
        }]);

    if (error) {
        console.error('Ошибка создания профиля:', error);
        // Пытаемся создать таблицу если её нет
        if (error.code === '42P01') {
            showAlert('❌ Таблица user_profiles не существует', 'error', true);
        }
    }
}

// ==================== РАБОТА С ДАННЫМИ (УЛУЧШЕННАЯ) ====================

async function loadData() {
    if (!currentUser) return;
    
    showLoader(true, 'Загрузка данных...');
    
    try {
        // Загружаем категории
        const { data: cats, error: catError } = await supabase
            .from('categories')
            .select('*')
            .order('order_index');
        
        if (catError) {
            if (catError.code === '42P01') {
                await createCategoriesTable();
                categories = [];
            } else {
                throw catError;
            }
        } else {
            categories = cats || [];
        }
        
        // Загружаем продукты с категориями
        const { data: prods, error: prodError } = await supabase
            .from('products')
            .select(`
                *,
                categories (name)
            `)
            .order('category_id')
            .order('name');
        
        if (prodError) {
            if (prodError.code === '42P01') {
                await createProductsTable();
                products = [];
            } else {
                throw prodError;
            }
        } else {
            products = prods || [];
        }
        
        // Загружаем пользователей (только для админа)
        if (userRole === 'admin') {
            const { data: usersList, error: usersError } = await supabase
                .from('user_profiles')
                .select(`
                    *,
                    user_roles (name)
                `)
                .order('created_at', { ascending: false });
            
            if (!usersError) {
                users = usersList || [];
            }
        }
        
        updateTable();
        updateStats();
        updateFilters();
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showAlert(`❌ Ошибка загрузки: ${error.message}`, 'error');
    } finally {
        showLoader(false);
    }
}

function updateTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    if (!products.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #666;">
                    📭 Нет данных. Добавьте продукты через панель администратора.
                </td>
            </tr>
        `;
        return;
    }
    
    // Применяем фильтры и пагинацию
    const filteredProducts = applyProductFilters(products);
    const paginatedProducts = paginateProducts(filteredProducts);
    
    paginatedProducts.forEach(product => {
        const category = categories.find(c => c.id === product.category_id);
        const canEditBar1 = userRole === 'admin' || (userRole === 'barman' && userBar === 1);
        const canEditBar2 = userRole === 'admin' || (userRole === 'barman' && userBar === 2);
        
        // Подсветка низкого запаса
        const bar1Low = (product.bar1 || 0) < (product.min_stock || 0);
        const bar2Low = (product.bar2 || 0) < (product.min_stock || 0);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong>${product.name}</strong>
                ${product.description ? `<br><small style="color: #666;">${product.description}</small>` : ''}
            </td>
            <td>${category?.name || 'Без категории'}</td>
            <td>${product.volume}</td>
            <td>
                <input type="number" step="0.01" min="0"
                       class="stock-input ${bar1Low ? 'low-stock' : ''}"
                       value="${product.bar1 || 0}"
                       ${canEditBar1 ? '' : 'disabled'}
                       onchange="updateStock(${product.id}, 'bar1', this.value)"
                       onblur="validateStockInput(this)">
                ${bar1Low ? '<span class="stock-warning">⚠️</span>' : ''}
            </td>
            <td>
                <input type="number" step="0.01" min="0"
                       class="stock-input ${bar2Low ? 'low-stock' : ''}"
                       value="${product.bar2 || 0}"
                       ${canEditBar2 ? '' : 'disabled'}
                       onchange="updateStock(${product.id}, 'bar2', this.value)"
                       onblur="validateStockInput(this)">
                ${bar2Low ? '<span class="stock-warning">⚠️</span>' : ''}
            </td>
            <td>
                ${userRole === 'admin' ? `
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="editProduct(${product.id})" title="Редактировать">
                            ✏️
                        </button>
                        <button class="btn-icon btn-danger" onclick="deleteProduct(${product.id})" title="Удалить">
                            🗑️
                        </button>
                    </div>
                ` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
    
    updatePagination(filteredProducts.length);
}

// ==================== НОВЫЕ ФУНКЦИИ ====================

function validateStockInput(input) {
    const value = parseFloat(input.value);
    if (value < 0) {
        input.value = 0;
        showAlert('❌ Остаток не может быть отрицательным', 'warning');
    }
}

async function showResetPassword() {
    document.getElementById('resetPasswordModal').style.display = 'flex';
}

async function sendResetPassword() {
    const email = document.getElementById('resetEmail').value.trim();
    const alert = document.getElementById('resetAlert');
    
    if (!email) {
        showAlert('❌ Введите email', 'error', alert);
        return;
    }
    
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`,
        });
        
        if (error) throw error;
        
        showAlert('✅ Инструкция отправлена на email', 'success', alert);
        setTimeout(() => {
            closeResetPassword();
        }, 3000);
        
    } catch (error) {
        showAlert(`❌ Ошибка: ${error.message}`, 'error', alert);
    }
}

function openUserManagement() {
    if (userRole !== 'admin') return;
    
    updateUserManagementTable();
    document.getElementById('userManagementModal').style.display = 'flex';
}

function updateUserManagementTable() {
    const tbody = document.getElementById('userManagementTable');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.full_name || user.email.split('@')[0]}</td>
            <td>${user.email}</td>
            <td>${user.user_roles?.name || 'barman'}</td>
            <td>${user.bar_number || 1}</td>
            <td>
                <button class="btn-icon" onclick="editUser('${user.id}')" title="Редактировать">
                    ✏️
                </button>
                ${user.id !== currentUser.id ? `
                    <button class="btn-icon btn-danger" onclick="deleteUser('${user.id}')" title="Удалить">
                        🗑️
                    </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ==================== СТАТИСТИКА (УЛУЧШЕННАЯ) ====================

function updateStats() {
    document.getElementById('statProducts').textContent = products.length;
    document.getElementById('statCategories').textContent = categories.length;
    
    const totalBar1 = products.reduce((sum, p) => sum + (parseFloat(p.bar1) || 0), 0);
    const totalBar2 = products.reduce((sum, p) => sum + (parseFloat(p.bar2) || 0), 0);
    
    document.getElementById('statBar1').textContent = totalBar1.toFixed(1);
    document.getElementById('statBar2').textContent = totalBar2.toFixed(1);
    
    // Показываем кнопку управления пользователями для админа
    if (userRole === 'admin') {
        document.getElementById('userManagementBtn').style.display = 'inline-flex';
        document.getElementById('filterPanel').style.display = 'block';
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

document.addEventListener('DOMContentLoaded', function() {
    // Проверяем поддержку localStorage
    if (!window.localStorage) {
        showAlert('❌ Ваш браузер не поддерживает localStorage', 'error', true);
        return;
    }
    
    initApp();
    
    // Автообновление
    setInterval(() => {
        if (currentUser && !document.hidden) {
            loadData();
        }
    }, 300000); // 5 минут
    
    // Обновление при возвращении на вкладку
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && currentUser) {
            loadData();
        }
    });
});
