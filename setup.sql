-- تم حذف سطر CREATE DATABASE لأنه ممنوع في الاستضافة المشتركة

-- ==================== DEVICES ====================
CREATE TABLE IF NOT EXISTS devices (
    id   INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL
);

-- الأجهزة الـ 8
INSERT IGNORE INTO devices (id, name) VALUES
  (1, 'PS 1'), (2, 'PS 2'), (3, 'PS 3'), (4, 'PS 4'),
  (5, 'PS 5'), (6, 'PS 6'), (7, 'PS 7'), (8, 'PS 8');

-- ==================== SESSIONS ====================
CREATE TABLE IF NOT EXISTS sessions (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    device_id   INT NOT NULL,
    started_at  DATETIME NOT NULL,
    ended_at    DATETIME DEFAULT NULL,
    rate        DECIMAL(8,2) NOT NULL DEFAULT 0,
    duration_s  INT DEFAULT 0,
    time_cost   DECIMAL(8,2) DEFAULT 0,
    cons_drink  INT DEFAULT 0,
    cons_chips  INT DEFAULT 0,
    cons_choc   INT DEFAULT 0,
    cons_cost   DECIMAL(8,2) DEFAULT 0,
    total       DECIMAL(8,2) DEFAULT 0,
    FOREIGN KEY (device_id) REFERENCES devices(id)
);

-- ==================== EXPENSES ====================
CREATE TABLE IF NOT EXISTS expenses (
    id     INT PRIMARY KEY AUTO_INCREMENT,
    name   VARCHAR(100) NOT NULL,
    amount DECIMAL(8,2) NOT NULL,
    note   VARCHAR(255) DEFAULT '',
    date   DATE NOT NULL
);

-- ==================== SETTINGS ====================
CREATE TABLE IF NOT EXISTS settings (
    skey VARCHAR(50) PRIMARY KEY,
    sval VARCHAR(255) NOT NULL
);

-- القيم الافتراضية
INSERT IGNORE INTO settings (skey, sval) VALUES
  ('rate',     '20'),
  ('drink',    '15'),
  ('chips',    '10'),
  ('choc',     '10'),
  ('password', '1234');