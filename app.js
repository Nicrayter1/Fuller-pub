// app.js - Основной файл приложения

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let currentUser = null;
let userRole = null;
let userBar = null;
let products = [];
let categories = [];
let users = [];
let currentPage = 1;
const itemsPerPage = 50;
let searchTimeout = null;

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

// Показ/скрытие загрузчика
function showLoader(show, message = '') {
    try {
        const loader = document.getElementById('dataLoader');
        if (!loader) {
            console.warn('Элемент загрузчика не найден');
            return;
        }
        
        if (show) {
            loader.style.display = 'block';
            if (message) {
                const messageEl = loader.querySelector('div:last-child');
                if (messageEl) {
                    messageEl.textContent = message;
                }
            }
        } else {
            loader.style.display = 'none';
        }
    } catch (error) {
        console.error('Ошибка в showLoader:', error);
    }
}

// Показ сообщений
function showAlert(message, type, element = null) {
    try {
        const alertEl = element || document.getElementById('mainAlert');
        if (!alertEl) {
            console.warn('Элемент для алерта не найден');
            return;
        }
        
        alertEl.className = `alert alert-${type}`;
        alertEl.innerHTML = message;
        alertEl.style.display = 'block';
        
        if (!element) {
            setTimeout(() => {
                alertEl.style.display = 'none';
            }, 5000);
        }
    } catch (error) {
        console.error('Ошибка в showAlert:', error);
    }
}

// Обновление UI пользователя
function updateUserUI() {
    try {
        if (!currentUser) return;
        
        const name = currentUser.full_name || currentUser.email.split('@')[0];
        const avatarLetter = name.charAt(0).toUpperCase();
        
        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');
        const userAvatarEl = document.getElementById('userAvatar');
        
        if (userNameEl) userNameEl.textContent = name;
        if (userRoleEl) {
            userRoleEl.textContent = userRole === 'admin' 
                ? 'Администратор' 
                : `Бармен (Бар ${userBar})`;
        }
        if (userAvatarEl) userAvatarEl.textContent = avatarLetter;
    } catch (error) {
        console.error('Ошибка в updateUserUI:', error);
    }
}

// Показать экран входа
function showLoginScreen() {
    try {
        const loginScreen = document.getElementById('loginScreen');
        const mainScreen = document.getElementById('mainScreen');
        const appHeader = document.getElementById('appHeader');
        
        if (loginScreen) loginScreen.style.display = 'block';
        if (mainScreen) mainScreen.style.display = 'none';
        if (appHeader) appHeader.style.display = 'none';
        
        // Очистка полей
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
    } catch (error) {
        console.error('Ошибка в showLoginScreen:', error);
    }
}

// Показать основной интерфейс
function showMainInterface() {
    try {
        const loginScreen = document.getElementById('loginScreen');
        const mainScreen = document.getElementById('mainScreen');
        const appHeader = document.getElementById('appHeader');
        const controlPanel = document.getElementById('controlPanel');
        const actionsHeader = document.getElementById('actionsHeader');
        
        if (loginScreen) loginScreen.style.display = 'none';
        if (mainScreen) mainScreen.style.display = 'block';
        if (appHeader) appHeader.style.display = 'flex';
        
        // Показываем/скрываем панель управления для админа
        if (controlPanel && actionsHeader) {
            if (userRole === 'admin') {
                controlPanel.style.display = 'flex';
                actionsHeader.innerHTML = 'Действия';
            } else {
                controlPanel.style.display = 'none';
                actionsHeader.innerHTML = '';
            }
        }
        
        loadData();
    } catch (error) {
        console.error('Ошибка в showMainInterface:', error);
    }
}

// ==================== АВТОРИЗАЦИЯ ====================

// Загрузка профиля пользователя
async function loadUserProfile(userId) {
    try {
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select(`
                *,
                user_roles (name)
            `)
            .eq('id', userId)
            .single();
        
        if (error) {
            // Если профиль не найден, создаем его
            if (error.code === 'PGRST116') {
                await createUserProfile(userId);
                return await loadUserProfile(userId);
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

// Создание профиля пользователя
async function createUserProfile(userId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Проверяем, первый ли это пользователь
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

// Инициализация приложения
async function initApp() {
    showLoader(true, 'Проверка авторизации...');
    
    try {
        // Проверяем конфигурацию
        if (!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || !window.SUPABASE_CONFIG.anonKey) {
            throw new Error('Конфигурация Supabase не найдена');
        }
        
        // Инициализируем Supabase
        const { createClient } = window.supabase;
        window.supabaseClient = createClient(
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
        
        // Проверяем сессию
        const { data: { session }, error } = await window.supabaseClient.auth.getSession();
        
        if (error) {
            console.error('Ошибка получения сессии:', error);
            showLoginScreen();
            return;
        }
        
        if (session && session.user) {
            await loadUserProfile(session.user.id);
            showMainInterface();
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showAlert('❌ Ошибка загрузки приложения: ' + error.message, 'error');
        showLoginScreen();
    } finally {
        showLoader(false);
    }
}

// Вход в систему
async function handleLogin(email, password) {
    const btn = document.getElementById('loginBtn');
    const alert = document.getElementById('loginAlert');
    
    if (!btn || !alert) return false;
    
    // Валидация
    if (!email || !password) {
        showAlert('❌ Заполните все поля', 'error', alert);
        return false;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<div class="loader-spinner" style="width: 20px; height: 20px; border-width: 2px; margin: 0 auto;"></div> Вход...';
    
    try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
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
        btn.innerHTML = '<span>🔑 Войти в систему</span>';
    }
}

// Выход из системы
async function logout() {
    try {
        if (!confirm('Вы уверены, что хотите выйти?')) return;
        
        await window.supabaseClient.auth.signOut();
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

// ==================== РАБОТА С ДАННЫМИ ====================

// Загрузка данных
async function loadData() {
    if (!currentUser || !window.supabaseClient) return;
    
    showLoader(true, 'Загрузка данных...');
    
    try {
        // Загружаем категории
        const { data: cats, error: catError } = await window.supabaseClient
            .from('categories')
            .select('*')
            .order('order_index');
        
        if (catError) throw catError;
        categories = cats || [];
        
        // Загружаем продукты
        const { data: prods, error: prodError } = await window.supabaseClient
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
    } finally {
        showLoader(false);
    }
}

// Обновление таблицы
function updateTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                    📭 Нет данных. Добавьте продукты через панель администратора.
                </td>
            </tr>
        `;
        return;
    }
    
    // Группируем продукты по категориям
    const grouped = {};
    products.forEach(p => {
        if (!grouped[p.category_id]) grouped[p.category_id] = [];
        grouped[p.category_id].push(p);
    });
    
    // Сортируем категории
    const sortedCats = [...categories].sort((a, b) => a.order_index - b.order_index);
    
    sortedCats.forEach(category => {
        const catProducts = grouped[category.id] || [];
        
        if (catProducts.length > 0) {
            // Заголовок категории
            const catRow = document.createElement('tr');
            catRow.className = 'category-row';
            catRow.innerHTML = `<td colspan="5">${category.name}</td>`;
            tbody.appendChild(catRow);
            
            // Продукты категории
            catProducts.forEach(product => {
                const row = document.createElement('tr');
                const canEditBar1 = userRole === 'admin' || (userRole === 'barman' && userBar === 1);
                const canEditBar2 = userRole === 'admin' || (userRole === 'barman' && userBar === 2);
                
                row.innerHTML = `
                    <td>
                        <strong>${product.name}</strong>
                        ${userRole === 'admin' ? 
                            `<button class="btn btn-sm btn-danger" 
                                     style="margin-left: 10px; padding: 2px 8px; font-size: 12px;"
                                     onclick="deleteProduct(${product.id})">
                                🗑️
                             </button>` : ''}
                    </td>
                    <td>${product.volume}</td>
                    <td>
                        <input type="number" step="0.1" 
                               class="stock-input" 
                               value="${product.bar1 || 0}"
                               ${canEditBar1 ? '' : 'disabled'}
                               onchange="updateStock(${product.id}, 'bar1', this.value)"
                               style="${canEditBar1 ? 'border-color: #28a745;' : ''}">
                    </td>
                    <td>
                        <input type="number" step="0.1"
                               class="stock-input"
                               value="${product.bar2 || 0}"
                               ${canEditBar2 ? '' : 'disabled'}
                               onchange="updateStock(${product.id}, 'bar2', this.value)"
                               style="${canEditBar2 ? 'border-color: #28a745;' : ''}">
                    </td>
                    <td>
                        ${userRole === 'admin' ? 
                            `<button class="btn btn-sm" 
                                     style="padding: 2px 8px;"
                                     onclick="editProduct(${product.id})">
                                ✏️
                             </button>` : ''}
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    });
}

// Обновление статистики
function updateStats() {
    const statProducts = document.getElementById('statProducts');
    const statCategories = document.getElementById('statCategories');
    const statBar1 = document.getElementById('statBar1');
    const statBar2 = document.getElementById('statBar2');
    
    if (statProducts) statProducts.textContent = products.length;
    if (statCategories) statCategories.textContent = categories.length;
    
    const totalBar1 = products.reduce((sum, p) => sum + (parseFloat(p.bar1) || 0), 0);
    const totalBar2 = products.reduce((sum, p) => sum + (parseFloat(p.bar2) || 0), 0);
    
    if (statBar1) statBar1.textContent = totalBar1.toFixed(1);
    if (statBar2) statBar2.textContent = totalBar2.toFixed(1);
}

// Обновление остатков
async function updateStock(productId, field, value) {
    if (!window.supabaseClient) return;
    
    const numericValue = parseFloat(value) || 0;
    
    // Проверка прав для барменов
    if (userRole === 'barman') {
        if (userBar === 1 && field !== 'bar1') {
            showAlert('❌ Вы можете менять только значения для Бара 1', 'error');
            loadData(); // Возвращаем старое значение
            return;
        }
        if (userBar === 2 && field !== 'bar2') {
            showAlert('❌ Вы можете менять только значения для Бара 2', 'error');
            loadData();
            return;
        }
    }
    
    try {
        const { error } = await window.supabaseClient
            .from('products')
            .update({ 
                [field]: numericValue,
                updated_at: new Date().toISOString()
            })
            .eq('id', productId);
        
        if (error) throw error;
        
        // Обновляем локально
        const product = products.find(p => p.id === productId);
        if (product) {
            product[field] = numericValue;
        }
        
        updateStats();
        showAlert('✅ Данные сохранены', 'success');
        
    } catch (error) {
        showAlert(`❌ Ошибка сохранения: ${error.message}`, 'error');
        loadData(); // Перезагружаем данные
    }
}

// ==================== АДМИН-ФУНКЦИИ ====================

// Открытие модального окна добавления
function openAddModal(type) {
    if (userRole !== 'admin') return;
    
    const modal = document.getElementById('addModal');
    const title = document.getElementById('addModalTitle');
    const body = document.getElementById('addModalBody');
    
    if (!modal || !title || !body) return;
    
    if (type === 'category') {
        title.textContent = '➕ Добавить категорию';
        body.innerHTML = `
            <div class="form-group">
                <label class="form-label">Название категории</label>
                <input type="text" class="form-control" id="categoryName" 
                       placeholder="Например: Виски, Водка, Вино">
            </div>
            <div class="form-group">
                <label class="form-label">Порядок отображения</label>
                <input type="number" class="form-control" id="categoryOrder" value="0">
                <small style="color: #666; font-size: 12px;">Чем меньше число, тем выше в списке</small>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeAddModal()">Отмена</button>
                <button class="btn btn-success" onclick="addCategory()">Добавить</button>
            </div>
        `;
    } else {
        title.textContent = '➕ Добавить продукт';
        
        let options = '<option value="">Выберите категорию</option>';
        categories.forEach(cat => {
            options += `<option value="${cat.id}">${cat.name}</option>`;
        });
        
        body.innerHTML = `
            <div class="form-group">
                <label class="form-label">Категория</label>
                <select class="form-control" id="productCategory">
                    ${options}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Название продукта</label>
                <input type="text" class="form-control" id="productName" 
                       placeholder="Например: Jack Daniels, Absolut">
            </div>
            <div class="form-group">
                <label class="form-label">Объем (мл)</label>
                <input type="number" class="form-control" id="productVolume" 
                       placeholder="500, 700, 1000">
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeAddModal()">Отмена</button>
                <button class="btn btn-success" onclick="addProduct()">Добавить</button>
            </div>
        `;
    }
    
    modal.style.display = 'flex';
}

// Закрытие модального окна
function closeAddModal() {
    const modal = document.getElementById('addModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Добавление категории
async function addCategory() {
    if (!window.supabaseClient) return;
    
    const nameInput = document.getElementById('categoryName');
    const orderInput = document.getElementById('categoryOrder');
    
    if (!nameInput || !orderInput) return;
    
    const name = nameInput.value.trim();
    const order = orderInput.value || 0;
    
    if (!name) {
        showAlert('❌ Введите название категории', 'error');
        return;
    }
    
    try {
        const { error } = await window.supabaseClient
            .from('categories')
            .insert([{
                name: name,
                order_index: parseInt(order)
            }]);
        
        if (error) throw error;
        
        showAlert(`✅ Категория "${name}" добавлена`, 'success');
        closeAddModal();
        loadData();
        
    } catch (error) {
        showAlert(`❌ Ошибка: ${error.message}`, 'error');
    }
}

// Добавление продукта
async function addProduct() {
    if (!window.supabaseClient) return;
    
    const categorySelect = document.getElementById('productCategory');
    const nameInput = document.getElementById('productName');
    const volumeInput = document.getElementById('productVolume');
    
    if (!categorySelect || !nameInput || !volumeInput) return;
    
    const categoryId = categorySelect.value;
    const name = nameInput.value.trim();
    const volume = volumeInput.value;
    
    if (!categoryId || !name || !volume) {
        showAlert('❌ Заполните все поля', 'error');
        return;
    }
    
    if (volume <= 0) {
        showAlert('❌ Объем должен быть положительным числом', 'error');
        return;
    }
    
    try {
        const { error } = await window.supabaseClient
            .from('products')
            .insert([{
                category_id: parseInt(categoryId),
                name: name,
                volume: parseInt(volume),
                bar1: 0,
                bar2: 0
            }]);
        
        if (error) throw error;
        
        showAlert(`✅ Продукт "${name}" добавлен`, 'success');
        closeAddModal();
        loadData();
        
    } catch (error) {
        showAlert(`❌ Ошибка: ${error.message}`, 'error');
    }
}

// Удаление продукта
async function deleteProduct(productId) {
    if (!window.supabaseClient) return;
    
    if (!confirm('Удалить этот продукт?')) return;
    
    try {
        const { error } = await window.supabaseClient
            .from('products')
            .delete()
            .eq('id', productId);
        
        if (error) throw error;
        
        showAlert('✅ Продукт удален', 'success');
        loadData();
        
    } catch (error) {
        showAlert(`❌ Ошибка удаления: ${error.message}`, 'error');
    }
}

// Редактирование продукта
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    showInfoModal(
        '✏️ Редактирование продукта',
        `Редактирование продукта "${product.name}" будет доступно в следующей версии.`
    );
}

// Показать информационное окно
function showInfoModal(title, content) {
    const titleEl = document.getElementById('infoModalTitle');
    const bodyEl = document.getElementById('infoModalBody');
    const modal = document.getElementById('infoModal');
    
    if (titleEl && bodyEl && modal) {
        titleEl.textContent = title;
        bodyEl.innerHTML = content;
        modal.style.display = 'flex';
    }
}

// Закрыть информационное окно
function closeInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Обновление данных
function refreshData() {
    loadData();
    showAlert('🔄 Данные обновлены', 'success');
}

// Экспорт данных
async function exportData() {
    if (products.length === 0) {
        showAlert('❌ Нет данных для экспорта', 'error');
        return;
    }
    
    let csv = 'Категория;Наименование;Объем,мл;Бар 1;Бар 2\n';
    
    products.forEach(product => {
        const category = categories.find(c => c.id === product.category_id);
        csv += `"${category?.name || ''}";"${product.name}";${product.volume};${product.bar1 || 0};${product.bar2 || 0}\n`;
    });
    
    try {
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `fullerpub_stock_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert('✅ Файл CSV скачан', 'success');
    } catch (error) {
        showAlert('❌ Ошибка экспорта данных', 'error');
    }
}

// Настройка поиска
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const rows = document.querySelectorAll('#tableBody tr');
        
        rows.forEach(row => {
            if (row.classList.contains('category-row')) {
                // Для категорий показываем если есть видимые продукты в ней
                const nextRows = [];
                let nextRow = row.nextElementSibling;
                while (nextRow && !nextRow.classList.contains('category-row')) {
                    nextRows.push(nextRow);
                    nextRow = nextRow.nextElementSibling;
                }
                
                const hasVisibleProducts = nextRows.some(r => 
                    r.textContent.toLowerCase().includes(searchTerm)
                );
                
                row.style.display = searchTerm === '' || hasVisibleProducts ? '' : 'none';
                
            } else {
                // Для продуктов
                const isVisible = searchTerm === '' || 
                                 row.textContent.toLowerCase().includes(searchTerm);
                row.style.display = isVisible ? '' : 'none';
            }
        });
    });
}

// ==================== ГЛОБАЛЬНЫЕ ФУНКЦИИ ====================

// Экспортируем функции в глобальную область видимости
window.logout = logout;
window.openAddModal = openAddModal;
window.closeAddModal = closeAddModal;
window.closeInfoModal = closeInfoModal;
window.refreshData = refreshData;
window.exportData = exportData;
window.deleteProduct = deleteProduct;
window.editProduct = editProduct;
window.updateStock = updateStock;
window.addCategory = addCategory;
window.addProduct = addProduct;

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

// Обработчик загрузки страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, инициализация приложения...');
    
    // Обработчик формы входа
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email')?.value;
            const password = document.getElementById('password')?.value;
            
            if (!email || !password) {
                showAlert('❌ Заполните все поля', 'error', document.getElementById('loginAlert'));
                return;
            }
            
            await handleLogin(email, password);
        });
    }
    
    // Закрытие модальных окон по клику вне окна
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Обработчик клавиши Escape для закрытия модальных окон
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
    
    // Инициализация приложения
    setTimeout(() => {
        initApp();
    }, 100);
    
    // Автообновление каждые 5 минут
    setInterval(() => {
        if (currentUser && !document.hidden) {
            loadData();
        }
    }, 300000);
    
    // Обновление при возвращении на вкладку
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && currentUser) {
            loadData();
        }
    });
});

// Глобальная обработка ошибок
window.addEventListener('error', function(e) {
    console.error('Глобальная ошибка:', e.error);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Необработанный Promise:', e.reason);
});
