CREATE TABLE accounts (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL
);

CREATE TABLE transactions (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    payee TEXT,
    primary_category TEXT
);

CREATE TABLE postings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    amount TEXT NOT NULL,
    UNIQUE (transaction_id, position)
);

CREATE TABLE transaction_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    tag TEXT NOT NULL,
    UNIQUE (transaction_id, position)
);

CREATE INDEX idx_postings_account_id ON postings (account_id);
CREATE INDEX idx_postings_transaction_id ON postings (transaction_id);
CREATE INDEX idx_transaction_tags_transaction_id ON transaction_tags (transaction_id);
