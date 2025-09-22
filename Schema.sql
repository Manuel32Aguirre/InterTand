-- TandaPay Database Schema
-- Base de datos SQLite para gestión de tandas digitales

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    wallet_address TEXT,
    payment_pointer TEXT,
    reputation_score REAL DEFAULT 5.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de tandas
CREATE TABLE IF NOT EXISTS tandas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    total_amount REAL NOT NULL,
    monthly_payment REAL NOT NULL,
    max_participants INTEGER NOT NULL,
    current_participants INTEGER DEFAULT 0,
    status TEXT DEFAULT 'recruiting', -- recruiting, active, completed, paused
    current_round INTEGER DEFAULT 0,
    created_by INTEGER NOT NULL,
    start_date DATE,
    end_date DATE,
    next_draw_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tabla de participaciones en tandas
CREATE TABLE IF NOT EXISTS tanda_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanda_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    position INTEGER, -- Posición en el sorteo (1-n)
    has_won BOOLEAN DEFAULT FALSE,
    win_date DATE,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tanda_id) REFERENCES tandas(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(tanda_id, user_id)
);

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanda_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL, -- monthly_payment, prize_payout, penalty
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    interledger_tx_id TEXT,
    payment_pointer_from TEXT,
    payment_pointer_to TEXT,
    due_date DATE,
    paid_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tanda_id) REFERENCES tandas(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabla de sorteos/rondas
CREATE TABLE IF NOT EXISTS draws (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanda_id INTEGER NOT NULL,
    round_number INTEGER NOT NULL,
    winner_user_id INTEGER NOT NULL,
    prize_amount REAL NOT NULL,
    draw_date DATE NOT NULL,
    payment_completed BOOLEAN DEFAULT FALSE,
    interledger_tx_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tanda_id) REFERENCES tandas(id),
    FOREIGN KEY (winner_user_id) REFERENCES users(id),
    UNIQUE(tanda_id, round_number)
);

-- Tabla de configuraciones de Interledger
CREATE TABLE IF NOT EXISTS wallet_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    wallet_address TEXT NOT NULL,
    payment_pointer TEXT NOT NULL,
    auth_token TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabla de transacciones Interledger
CREATE TABLE IF NOT EXISTS interledger_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id INTEGER,
    draw_id INTEGER,
    tx_id TEXT UNIQUE NOT NULL,
    from_wallet TEXT NOT NULL,
    to_wallet TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending', -- pending, completed, failed
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (payment_id) REFERENCES payments(id),
    FOREIGN KEY (draw_id) REFERENCES draws(id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_tandas_status ON tandas(status);
CREATE INDEX IF NOT EXISTS idx_tanda_participants_tanda ON tanda_participants(tanda_id);
CREATE INDEX IF NOT EXISTS idx_tanda_participants_user ON tanda_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_tanda ON payments(tanda_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_draws_tanda ON draws(tanda_id);
CREATE INDEX IF NOT EXISTS idx_interledger_tx_id ON interledger_transactions(tx_id);

-- Datos de prueba
INSERT OR IGNORE INTO users (id, name, email, wallet_address, payment_pointer) VALUES 
(1, 'Juan Pérez', 'juan@example.com', '$ilp.example.com/juan', '$wallet.example/juan'),
(2, 'María García', 'maria@example.com', '$ilp.example.com/maria', '$wallet.example/maria'),
(3, 'Carlos López', 'carlos@example.com', '$ilp.example.com/carlos', '$wallet.example/carlos');

INSERT OR IGNORE INTO tandas (id, name, description, total_amount, monthly_payment, max_participants, current_participants, status, created_by, start_date, next_draw_date) VALUES 
(1, 'Tanda Navideña 2025', 'Tanda para gastos navideños', 12000, 1000, 12, 8, 'active', 1, '2025-09-01', '2025-10-01'),
(2, 'Tanda Ahorro Familiar', 'Para el ahorro familiar del año', 24000, 2000, 12, 5, 'recruiting', 2, NULL, NULL),
(3, 'Tanda Express', 'Tanda rápida de 6 meses', 6000, 1000, 6, 6, 'active', 3, '2025-08-15', '2025-09-30');

INSERT OR IGNORE INTO tanda_participants (tanda_id, user_id, position) VALUES 
(1, 1, 1), (1, 2, 2), (1, 3, 3),
(2, 1, 1), (2, 2, 2),
(3, 1, 1), (3, 2, 2), (3, 3, 3);

INSERT OR IGNORE INTO payments (tanda_id, user_id, amount, type, status, due_date) VALUES 
(1, 1, 1000, 'monthly_payment', 'completed', '2025-09-01'),
(1, 2, 1000, 'monthly_payment', 'completed', '2025-09-01'),
(1, 3, 1000, 'monthly_payment', 'pending', '2025-09-01');