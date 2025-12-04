-- ============================================
-- СОЗДАНИЕ БАЗЫ ДАННЫХ ДЛЯ FULLER PUB
-- SQL для выполнения в Supabase SQL Editor
-- ============================================

-- 1. ОЧИСТКА (если что-то было раньше)
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;

-- 2. ТАБЛИЦА РОЛЕЙ
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- Добавляем роли
INSERT INTO user_roles (name, description) VALUES
    ('admin', 'Администратор - полный доступ'),
    ('barman', 'Бармен - только ввод данных на своем баре')
ON CONFLICT (name) DO NOTHING;

-- 3. ТАБЛИЦА ПРОФИЛЕЙ ПОЛЬЗОВАТЕЛЕЙ
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role_id INTEGER REFERENCES user_roles(id) DEFAULT 2,
    bar_number INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ТАБЛИЦА КАТЕГОРИЙ
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ТАБЛИЦА ПРОДУКТОВ
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id),
    name VARCHAR(255) NOT NULL,
    volume INTEGER NOT NULL,
    bar1 DECIMAL(10,2) DEFAULT 0,
    bar2 DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ТРИГГЕР ДЛЯ ОБНОВЛЕНИЯ updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_timestamp 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_timestamp 
    BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_timestamp 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- НАСТРОЙКА БЕЗОПАСНОСТИ (RLS)
-- ============================================

-- Включаем RLS для всех таблиц
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 1. user_profiles: пользователи видят только свой профиль
CREATE POLICY "Пользователи видят свой профиль" 
    ON user_profiles FOR SELECT 
    USING (auth.uid() = id);

-- 2. categories: все видят, админы редактируют
CREATE POLICY "Все видят категории" 
    ON categories FOR SELECT 
    USING (true);

CREATE POLICY "Только админы изменяют категории" 
    ON categories FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role_id = 1
        )
    );

-- 3. products: все видят, админы всё, бармены обновляют свой бар
CREATE POLICY "Все видят продукты" 
    ON products FOR SELECT 
    USING (true);

CREATE POLICY "Только админы добавляют/удаляют продукты" 
    ON products FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role_id = 1
        )
    );

CREATE POLICY "Только админы удаляют продукты" 
    ON products FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role_id = 1
        )
    );

CREATE POLICY "Админы и бармены обновляют продукты" 
    ON products FOR UPDATE 
    USING (true);

-- ============================================
-- ТЕСТОВЫЕ ДАННЫЕ
-- ============================================

-- Добавляем категории
INSERT INTO categories (name, order_index) VALUES
    ('Водка', 1),
    ('Виски', 2),
    ('Ром', 3),
    ('Джин', 4),
    ('Текила', 5),
    ('Коньяк', 6),
    ('Ликеры', 7),
    ('Пиво', 8),
    ('Вино', 9),
    ('Вермуты', 10),
    ('Шампанское', 11)
ON CONFLICT (name) DO NOTHING;

-- Добавляем тестовые продукты
INSERT INTO products (category_id, name, volume, bar1, bar2) 
SELECT id, 'Абсолют', 700, 1.5, 2.0 FROM categories WHERE name = 'Водка'
UNION ALL
SELECT id, 'Финляндия', 700, 2.5, 1.0 FROM categories WHERE name = 'Водка'
UNION ALL
SELECT id, 'Jack Daniels', 700, 0.5, 1.5 FROM categories WHERE name = 'Виски'
UNION ALL
SELECT id, 'Jameson', 700, 1.0, 2.0 FROM categories WHERE name = 'Виски'
UNION ALL
SELECT id, 'Bacardi', 700, 2.0, 1.5 FROM categories WHERE name = 'Ром'
UNION ALL
SELECT id, 'Beefeater', 700, 1.5, 1.0 FROM categories WHERE name = 'Джин'
UNION ALL
SELECT id, 'Sierra', 700, 1.0, 1.0 FROM categories WHERE name = 'Текила'
UNION ALL
SELECT id, 'Martini Bianco', 1000, 1.0, 2.0 FROM categories WHERE name = 'Вермуты'
UNION ALL
SELECT id, 'Heineken', 500, 12.0, 8.0 FROM categories WHERE name = 'Пиво'
ON CONFLICT DO NOTHING;

-- ============================================
-- ПРАВА ДОСТУПА ДЛЯ АНОНИМНОГО ПОЛЬЗОВАТЕЛЯ
-- ============================================
GRANT ALL ON user_roles TO anon;
GRANT ALL ON user_profiles TO anon;
GRANT ALL ON categories TO anon;
GRANT ALL ON products TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ============================================
-- ПРОВЕРКА
-- ============================================
SELECT '✅ БАЗА ДАННЫХ FULLER PUB УСПЕШНО СОЗДАНА' as status;

SELECT 
    '📊 Статистика:' as title,
    (SELECT COUNT(*) FROM categories) as categories,
    (SELECT COUNT(*) FROM products) as products,
    (SELECT COUNT(*) FROM user_roles) as roles;
