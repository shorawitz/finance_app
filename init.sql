-- Create database schema for finance tracker
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Accounts table (checking, savings)
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('checking', 'savings')),
    nickname VARCHAR(255) NOT NULL,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payees table
CREATE TABLE payees (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payee accounts table (credit cards, loans, utilities, etc.)
CREATE TABLE payee_accounts (
    id SERIAL PRIMARY KEY,
    payee_id INTEGER NOT NULL REFERENCES payees(id) ON DELETE CASCADE,
    account_label VARCHAR(255) NOT NULL,
    account_number VARCHAR(100),
    category VARCHAR(100) NOT NULL DEFAULT 'other',
    interest_type VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (interest_type IN ('none', 'pif', 'compound', 'loan')),
    interest_rate DECIMAL(5, 4) DEFAULT 0.0000,
    current_balance DECIMAL(12, 2) DEFAULT 0.00,
    principal_balance DECIMAL(12, 2) DEFAULT 0.00,
    accrued_interest DECIMAL(12, 2) DEFAULT 0.00,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deposits table
CREATE TABLE deposits (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    source VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transfers table
CREATE TABLE transfers (
    id SERIAL PRIMARY KEY,
    from_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    to_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (from_account_id != to_account_id)
);

-- Payments table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    checking_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    payee_account_id INTEGER NOT NULL REFERENCES payee_accounts(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    principal_applied DECIMAL(12, 2) DEFAULT 0.00,
    interest_applied DECIMAL(12, 2) DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_payees_user_id ON payees(user_id);
CREATE INDEX idx_payee_accounts_payee_id ON payee_accounts(payee_id);
CREATE INDEX idx_deposits_account_id ON deposits(account_id);
CREATE INDEX idx_deposits_date ON deposits(date);
CREATE INDEX idx_transfers_from_account ON transfers(from_account_id);
CREATE INDEX idx_transfers_to_account ON transfers(to_account_id);
CREATE INDEX idx_transfers_date ON transfers(date);
CREATE INDEX idx_payments_checking_account ON payments(checking_account_id);
CREATE INDEX idx_payments_payee_account ON payments(payee_account_id);
CREATE INDEX idx_payments_date ON payments(date);

-- Insert sample user for development
INSERT INTO users (email, hashed_password, full_name) VALUES 
('finance_user', '$2b$12$dummy_hash_for_demo', 'Test User');

-- Insert sample data
INSERT INTO accounts (user_id, type, nickname, balance) VALUES 
(1, 'checking', 'Main Checking', 3000.00),
(1, 'checking', 'Bills Checking', 1200.00),
(1, 'savings', 'Emergency Savings', 8750.00);

INSERT INTO payees (user_id, name) VALUES 
(1, 'Chase'),
(1, 'Xcel Energy');

INSERT INTO payee_accounts (payee_id, account_label, account_number, category, interest_type, interest_rate, current_balance, principal_balance, accrued_interest, due_date) VALUES 
(1, 'Amazon Visa #1234', '****1234', 'credit card', 'compound', 0.1800, 1000.00, 800.00, 200.00, '2025-10-10'),
(1, 'Amazon Store Card #567', 'LOAN-567', 'car loan', 'loan', 0.0600, 9800.00, 9700.00, 100.00, '2025-10-05'),
(2, 'Starlink', 'ACC-445', 'utilities', 'none', 0.0000, 140.00, 140.00, 0.00, '2025-10-12');