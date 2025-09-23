

CREATE DATABASE IF NOT EXISTS inter_tand;
USE inter_tand;

-- Tabla de usuarios (con contraseña, turno y wallet address)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    turno INT NOT NULL DEFAULT 0,
    saldo DECIMAL(10,2) DEFAULT 0.00,
    wallet_address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de tandas (con current_turn, current_amount y status)
CREATE TABLE tandas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    current_amount DECIMAL(10,2) DEFAULT 0.00,
    max_participants INT NOT NULL,
    current_turn INT DEFAULT 1,
    period ENUM('semanal', 'quincenal', 'mensual') NOT NULL DEFAULT 'mensual',
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de pagos (historial con interledger_payment_id y updated_at)
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tanda_id INT,
    user_id INT,
    amount DECIMAL(10,2) NOT NULL,
    type ENUM('contribution', 'payout') NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    interledger_payment_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tanda_id) REFERENCES tandas(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabla para gestionar participaciones en tandas
CREATE TABLE tanda_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tanda_id INT,
    user_id INT,
    turn_order INT NOT NULL,
    has_received BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tanda_id) REFERENCES tandas(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY unique_tanda_user (tanda_id, user_id),
    UNIQUE KEY unique_tanda_turn (tanda_id, turn_order)
);

-- Insertar usuarios por defecto con sus wallet addresses de Interledger
INSERT INTO users (name, email, password, turno, saldo, wallet_address) VALUES
('Manuel', 'manuel@gmail.com', '12345678', 1, 10000.00, 'https://ilp.interledger-test.dev/manuel'),
('Oscar', 'oscar@gmail.com', '12345678', 2, 10000.00, 'https://ilp.interledger-test.dev/oscar'),
('Alexa', 'alexa@gmail.com', '12345678', 3, 10000.00, 'https://ilp.interledger-test.dev/alexa');

-- Nota: Las contraseñas están en texto plano para facilitar las pruebas