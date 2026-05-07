-- IQRA D1 Schema
-- "إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ"

-- Table: ayat
-- Stores the text and basic metadata of each verse.
CREATE TABLE IF NOT EXISTS ayat (
    id          TEXT PRIMARY KEY,  -- "2:255"
    surah       INTEGER NOT NULL,
    ayah        INTEGER NOT NULL,
    arabic      TEXT NOT NULL,
    english     TEXT NOT NULL,
    juz         INTEGER,
    page        INTEGER,
    source      TEXT DEFAULT 'api.quran.com',
    verified    INTEGER DEFAULT 1,
    created_at  INTEGER DEFAULT (unixepoch())
);

-- Table: patterns
-- Stores discovered patterns and their metadata.
CREATE TABLE IF NOT EXISTS patterns (
    id TEXT PRIMARY KEY, -- UUID or unique identifier
    type TEXT NOT NULL, -- 'numerical', 'semantic', 'linguistic'
    discovery_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    data JSON NOT NULL, -- Details of the pattern
    significance_score REAL DEFAULT 0.0,
    is_verified BOOLEAN DEFAULT FALSE
);

-- Table: trust_chain
-- The immutable log of all actions and intentions.
CREATE TABLE IF NOT EXISTS trust_chain (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    action TEXT NOT NULL,
    intention TEXT,
    input_hash TEXT,
    output_hash TEXT,
    safety_score REAL
);
