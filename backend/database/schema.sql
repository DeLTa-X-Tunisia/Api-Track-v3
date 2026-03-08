-- ============================================
-- Api-Track Database Schema
-- Module: Gestion des Bobines
-- ============================================

-- Table des fournisseurs
CREATE TABLE IF NOT EXISTS fournisseurs (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL UNIQUE,
    contact VARCHAR(255),
    telephone VARCHAR(50),
    email VARCHAR(255),
    adresse TEXT,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des grades
CREATE TABLE IF NOT EXISTS grades (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des nuances (liées aux grades)
CREATE TABLE IF NOT EXISTS nuances (
    id SERIAL PRIMARY KEY,
    grade_id INTEGER REFERENCES grades(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(grade_id, code)
);

-- Table principale des bobines
CREATE TABLE IF NOT EXISTS bobines (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(100) NOT NULL UNIQUE,
    grade_id INTEGER REFERENCES grades(id),
    nuance_id INTEGER REFERENCES nuances(id),
    epaisseur DECIMAL(10,2) NOT NULL,
    largeur DECIMAL(10,2) NOT NULL,
    poids DECIMAL(12,2) NOT NULL,
    fournisseur_id INTEGER REFERENCES fournisseurs(id),
    date_reception DATE NOT NULL,
    statut VARCHAR(50) DEFAULT 'disponible',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des photos de bobines
CREATE TABLE IF NOT EXISTS bobine_photos (
    id SERIAL PRIMARY KEY,
    bobine_id INTEGER REFERENCES bobines(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    mime_type VARCHAR(100),
    size INTEGER,
    path VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_bobines_numero ON bobines(numero);
CREATE INDEX IF NOT EXISTS idx_bobines_grade ON bobines(grade_id);
CREATE INDEX IF NOT EXISTS idx_bobines_fournisseur ON bobines(fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_bobines_date_reception ON bobines(date_reception);
CREATE INDEX IF NOT EXISTS idx_nuances_grade ON nuances(grade_id);

-- Insertion des données de référence - Grades
INSERT INTO grades (code, description) VALUES
    ('API 5L', 'American Petroleum Institute - Line Pipe'),
    ('ASTM A36', 'ASTM Standard - Carbon Structural Steel'),
    ('ASTM A572', 'ASTM Standard - High-Strength Low-Alloy Steel'),
    ('EN 10025', 'European Standard - Hot Rolled Structural Steel'),
    ('EN 10028', 'European Standard - Pressure Vessel Steel')
ON CONFLICT (code) DO NOTHING;

-- Insertion des nuances pour API 5L
INSERT INTO nuances (grade_id, code, description) VALUES
    ((SELECT id FROM grades WHERE code = 'API 5L'), 'X42', 'Grade X42 - 290 MPa min yield'),
    ((SELECT id FROM grades WHERE code = 'API 5L'), 'X46', 'Grade X46 - 317 MPa min yield'),
    ((SELECT id FROM grades WHERE code = 'API 5L'), 'X52', 'Grade X52 - 359 MPa min yield'),
    ((SELECT id FROM grades WHERE code = 'API 5L'), 'X56', 'Grade X56 - 386 MPa min yield'),
    ((SELECT id FROM grades WHERE code = 'API 5L'), 'X60', 'Grade X60 - 414 MPa min yield'),
    ((SELECT id FROM grades WHERE code = 'API 5L'), 'X65', 'Grade X65 - 448 MPa min yield'),
    ((SELECT id FROM grades WHERE code = 'API 5L'), 'X70', 'Grade X70 - 483 MPa min yield'),
    ((SELECT id FROM grades WHERE code = 'API 5L'), 'X80', 'Grade X80 - 552 MPa min yield')
ON CONFLICT (grade_id, code) DO NOTHING;

-- Insertion des nuances pour ASTM A36
INSERT INTO nuances (grade_id, code, description) VALUES
    ((SELECT id FROM grades WHERE code = 'ASTM A36'), 'A36', 'Standard Grade - 250 MPa min yield')
ON CONFLICT (grade_id, code) DO NOTHING;

-- Insertion des nuances pour ASTM A572
INSERT INTO nuances (grade_id, code, description) VALUES
    ((SELECT id FROM grades WHERE code = 'ASTM A572'), 'Grade 42', '290 MPa min yield'),
    ((SELECT id FROM grades WHERE code = 'ASTM A572'), 'Grade 50', '345 MPa min yield'),
    ((SELECT id FROM grades WHERE code = 'ASTM A572'), 'Grade 55', '380 MPa min yield'),
    ((SELECT id FROM grades WHERE code = 'ASTM A572'), 'Grade 60', '415 MPa min yield'),
    ((SELECT id FROM grades WHERE code = 'ASTM A572'), 'Grade 65', '450 MPa min yield')
ON CONFLICT (grade_id, code) DO NOTHING;

-- Insertion des nuances pour EN 10025
INSERT INTO nuances (grade_id, code, description) VALUES
    ((SELECT id FROM grades WHERE code = 'EN 10025'), 'S235JR', '235 MPa min yield'),
    ((SELECT id FROM grades WHERE code = 'EN 10025'), 'S275JR', '275 MPa min yield'),
    ((SELECT id FROM grades WHERE code = 'EN 10025'), 'S355JR', '355 MPa min yield'),
    ((SELECT id FROM grades WHERE code = 'EN 10025'), 'S355J2', '355 MPa min yield - improved'),
    ((SELECT id FROM grades WHERE code = 'EN 10025'), 'S460ML', '460 MPa min yield')
ON CONFLICT (grade_id, code) DO NOTHING;

-- Insertion des nuances pour EN 10028
INSERT INTO nuances (grade_id, code, description) VALUES
    ((SELECT id FROM grades WHERE code = 'EN 10028'), 'P235GH', 'Pressure vessel - 235 MPa'),
    ((SELECT id FROM grades WHERE code = 'EN 10028'), 'P265GH', 'Pressure vessel - 265 MPa'),
    ((SELECT id FROM grades WHERE code = 'EN 10028'), 'P355GH', 'Pressure vessel - 355 MPa'),
    ((SELECT id FROM grades WHERE code = 'EN 10028'), '16Mo3', 'Molybdenum alloy steel')
ON CONFLICT (grade_id, code) DO NOTHING;

-- Quelques fournisseurs exemples
INSERT INTO fournisseurs (nom, contact, telephone, email) VALUES
    ('ArcelorMittal', 'Service Commercial', '+33 1 XX XX XX XX', 'contact@arcelormittal.com'),
    ('Tata Steel', 'Service Commercial', '+31 XX XXX XXXX', 'sales@tatasteel.com'),
    ('ThyssenKrupp', 'Service Commercial', '+49 XX XXXX XXXX', 'info@thyssenkrupp.com'),
    ('POSCO', 'Service Commercial', '+82 XX XXXX XXXX', 'sales@posco.com'),
    ('Nippon Steel', 'Service Commercial', '+81 XX XXXX XXXX', 'contact@nipponsteel.com')
ON CONFLICT (nom) DO NOTHING;

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_bobines_updated_at ON bobines;
CREATE TRIGGER update_bobines_updated_at
    BEFORE UPDATE ON bobines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fournisseurs_updated_at ON fournisseurs;
CREATE TRIGGER update_fournisseurs_updated_at
    BEFORE UPDATE ON fournisseurs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
