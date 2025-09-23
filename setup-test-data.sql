-- Script para configurar la base de datos completa con datos de prueba
-- Ejecutar este script para probar todos los endpoints de la API

USE inter_tand;

-- Limpiar datos existentes (opcional, solo para testing)
-- DELETE FROM payments;
-- DELETE FROM tanda_participants;
-- DELETE FROM tandas;
-- DELETE FROM users;

-- Insertar usuarios de prueba con wallets
INSERT INTO users (name, email, password, turno, wallet_address) VALUES
('Alice Johnson', 'alice@interledger-test.dev', '$2b$10$mockhashedpassword1', 1, 'https://ilp.interledger-test.dev/alice'),
('Bob Smith', 'bob@interledger-test.dev', '$2b$10$mockhashedpassword2', 2, 'https://ilp.interledger-test.dev/bob'),
('Carol Williams', 'carol@interledger-test.dev', '$2b$10$mockhashedpassword3', 3, 'https://ilp.interledger-test.dev/carol'),
('David Brown', 'david@interledger-test.dev', '$2b$10$mockhashedpassword4', 4, 'https://ilp.interledger-test.dev/david'),
('Eve Davis', 'eve@interledger-test.dev', '$2b$10$mockhashedpassword5', 5, 'https://ilp.interledger-test.dev/eve')
ON DUPLICATE KEY UPDATE 
name = VALUES(name), 
wallet_address = VALUES(wallet_address);

-- Insertar tandas de prueba
INSERT INTO tandas (name, total_amount, current_amount, max_participants, current_turn, period, status) VALUES
('Tanda Mensual Desarrolladores', 5000.00, 1250.00, 4, 1, 'mensual', 'active'),
('Tanda Semanal Estudiantes', 2000.00, 500.00, 4, 2, 'semanal', 'active'),
('Tanda Quincenal Profesionales', 10000.00, 2500.00, 4, 1, 'quincenal', 'active')
ON DUPLICATE KEY UPDATE 
name = VALUES(name), 
current_amount = VALUES(current_amount);

-- Insertar participantes en las tandas
INSERT INTO tanda_participants (tanda_id, user_id, turn_order, has_received) VALUES
-- Tanda 1: Desarrolladores
(1, 1, 1, TRUE),   -- Alice ya recibió
(1, 2, 2, FALSE),  -- Bob es el siguiente
(1, 3, 3, FALSE),  -- Carol
(1, 4, 4, FALSE),  -- David

-- Tanda 2: Estudiantes  
(2, 2, 1, FALSE),  -- Bob
(2, 3, 2, FALSE),  -- Carol
(2, 4, 3, FALSE),  -- David
(2, 5, 4, FALSE),  -- Eve

-- Tanda 3: Profesionales
(3, 1, 1, FALSE),  -- Alice
(3, 2, 2, FALSE),  -- Bob
(3, 3, 3, FALSE),  -- Carol
(3, 5, 4, FALSE)   -- Eve
ON DUPLICATE KEY UPDATE 
turn_order = VALUES(turn_order);

-- Insertar algunos pagos de ejemplo
INSERT INTO payments (tanda_id, user_id, amount, type, status, interledger_payment_id) VALUES
-- Contribuciones a Tanda 1
(1, 1, 1250.00, 'contribution', 'completed', 'ilp_payment_001_alice'),
(1, 2, 1250.00, 'contribution', 'completed', 'ilp_payment_002_bob'),
(1, 3, 1250.00, 'contribution', 'pending', 'ilp_payment_003_carol'),

-- Payout a Alice (ya recibió)
(1, 1, 5000.00, 'payout', 'completed', 'ilp_payout_001_alice'),

-- Contribuciones a Tanda 2
(2, 2, 500.00, 'contribution', 'completed', 'ilp_payment_004_bob'),
(2, 3, 500.00, 'contribution', 'processing', 'ilp_payment_005_carol'),

-- Contribuciones a Tanda 3
(3, 1, 2500.00, 'contribution', 'completed', 'ilp_payment_006_alice'),
(3, 2, 2500.00, 'contribution', 'failed', 'ilp_payment_007_bob_failed')
ON DUPLICATE KEY UPDATE 
status = VALUES(status);

-- Verificar los datos insertados
SELECT '=== USUARIOS ===' as info;
SELECT id, name, email, wallet_address FROM users;

SELECT '=== TANDAS ===' as info;
SELECT id, name, total_amount, current_amount, max_participants, current_turn, status FROM tandas;

SELECT '=== PARTICIPANTES ===' as info;
SELECT tp.tanda_id, t.name as tanda_name, tp.user_id, u.name as user_name, tp.turn_order, tp.has_received 
FROM tanda_participants tp
JOIN tandas t ON tp.tanda_id = t.id
JOIN users u ON tp.user_id = u.id
ORDER BY tp.tanda_id, tp.turn_order;

SELECT '=== PAGOS ===' as info;
SELECT p.id, p.tanda_id, t.name as tanda_name, u.name as user_name, p.amount, p.type, p.status, p.interledger_payment_id
FROM payments p
JOIN tandas t ON p.tanda_id = t.id
JOIN users u ON p.user_id = u.id
ORDER BY p.tanda_id, p.created_at;