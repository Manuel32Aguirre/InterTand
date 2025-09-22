

CREATE DATABASE IF NOT EXISTS inter_tand;
USE inter_tand;

-- Tabla de usuarios (solo lo básico)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de tandas (información básica)
CREATE TABLE tandas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    max_participants INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de pagos (historial simple)
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tanda_id INT,
    user_id INT,
    amount DECIMAL(10,2) NOT NULL,
    type ENUM('contribution', 'payout') NOT NULL,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tanda_id) REFERENCES tandas(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
