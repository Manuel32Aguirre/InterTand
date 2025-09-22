-- TandaPay Database Schema
-- Base de datos MySQL para gestión de tandas digitales

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    wallet_address VARCHAR(255),
    payment_pointer VARCHAR(255),
    reputation_score DECIMAL(3,1) DEFAULT 5.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de tandas
CREATE TABLE IF NOT EXISTS tandas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    total_amount DECIMAL(10,2) NOT NULL,
    monthly_payment DECIMAL(10,2) NOT NULL,
    max_participants INT NOT NULL,
    current_participants INT DEFAULT 0,
    status ENUM('recruiting','active','completed','paused') DEFAULT 'recruiting',
    current_round INT DEFAULT 0,
    created_by INT NOT NULL,
    start_date DATE,
    end_date DATE,
    next_draw_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tabla de participaciones en tandas
CREATE TABLE IF NOT EXISTS tanda_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tanda_id INT NOT NULL,
    user_id INT NOT NULL,
    position INT,
    has_won BOOLEAN DEFAULT FALSE,
    win_date DATE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tanda_id) REFERENCES tandas(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(tanda_id, user_id)
);

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tanda_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type ENUM('monthly_payment','prize_payout','penalty') NOT NULL,
    status ENUM('pending','processing','completed','failed') DEFAULT 'pending',
    interledger_tx_id VARCHAR(255),
    payment_pointer_from VARCHAR(255),
    payment_pointer_to VARCHAR(255),
    due_date DATE,
    paid_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tanda_id) REFERENCES tandas(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabla de sorteos/rondas
CREATE TABLE IF NOT EXISTS draws (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tanda_id INT NOT NULL,
    round_number INT NOT NULL,
    winner_user_id INT NOT NULL,
    prize_amount DECIMAL(10,2) NOT NULL,
    draw_date DATE NOT NULL,
    payment_completed BOOLEAN DEFAULT FALSE,
    interledger_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tanda_id) REFERENCES tandas(id),
    FOREIGN KEY (winner_user_id) REFERENCES users(id),
    UNIQUE(tanda_id, round_number)
);

-- Tabla de configuraciones de Interledger
CREATE TABLE IF NOT EXISTS wallet_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    payment_pointer VARCHAR(255) NOT NULL,
    auth_token TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabla de transacciones Interledger
CREATE TABLE IF NOT EXISTS interledger_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT,
    draw_id INT,
    tx_id VARCHAR(255) UNIQUE NOT NULL,
    from_wallet VARCHAR(255) NOT NULL,
    to_wallet VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status ENUM('pending','completed','failed') DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(id),
    FOREIGN KEY (draw_id) REFERENCES draws(id)
);

-- Índices
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_tandas_status ON tandas(status);
CREATE INDEX idx_tanda_participants_tanda ON tanda_participants(tanda_id);
CREATE INDEX idx_tanda_participants_user ON tanda_participants(user_id);
CREATE INDEX idx_payments_tanda ON payments(tanda_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_draws_tanda ON draws(tanda_id);
CREATE INDEX idx_interledger_tx_id ON interledger_transactions(tx_id);

-- Datos de prueba
INSERT IGNORE INTO users (id, name, email, wallet_address, payment_pointer) VALUES 
(1, 'Juan Pérez', 'juan@example.com', '$ilp.example.com/juan', '$wallet.example/juan'),
(2, 'María García', 'maria@example.com', '$ilp.example.com/maria', '$wallet.example/maria'),
(3, 'Carlos López', 'carlos@example.com', '$ilp.example.com/carlos', '$wallet.example/carlos');

INSERT IGNORE INTO tandas (id, name, description, total_amount, monthly_payment, max_participants, current_participants, status, created_by, start_date, next_draw_date) VALUES 
(1, 'Tanda Navideña 2025', 'Tanda para gastos navideños', 12000, 1000, 12, 8, 'active', 1, '2025-09-01', '2025-10-01'),
(2, 'Tanda Ahorro Familiar', 'Para el ahorro familiar del año', 24000, 2000, 12, 5, 'recruiting', 2, NULL, NULL),
(3, 'Tanda Express', 'Tanda rápida de 6 meses', 6000, 1000, 6, 6, 'active', 3, '2025-08-15', '2025-09-30');

INSERT IGNORE INTO tanda_participants (tanda_id, user_id, position) VALUES 
(1, 1, 1), (1, 2, 2), (1, 3, 3),
(2, 1, 1), (2, 2, 2),
(3, 1, 1), (3, 2, 2), (3, 3, 3);

INSERT IGNORE INTO payments (tanda_id, user_id, amount, type, status, due_date) VALUES 
(1, 1, 1000, 'monthly_payment', 'completed', '2025-09-01'),
(1, 2, 1000, 'monthly_payment', 'completed', '2025-09-01'),
(1, 3, 1000, 'monthly_payment', 'pending', '2025-09-01');
