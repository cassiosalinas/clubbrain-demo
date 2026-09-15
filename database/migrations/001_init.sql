-- MVP Vasco — Identity layer (camada 2: Identity + Data resolution)
-- Espelha o dominio Core de ontology/vasco_sports_ontology_v1.yaml.
-- Esta e a fonte de verdade transacional de "quem e quem"; o Knowledge
-- Graph (Neo4j) e materializado a partir daqui + dos demais dominios.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE club (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    founded_year INT,
    primary_color TEXT,
    crest_url TEXT
);

CREATE TABLE person (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name_hash TEXT NOT NULL,
    email_hash TEXT,
    phone_hash TEXT,
    cpf_hash TEXT,
    birth_date DATE,
    city TEXT,
    state TEXT,
    country TEXT,
    source_systems TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_person_email_hash ON person (email_hash);

CREATE TABLE fan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES person (id) ON DELETE CASCADE,
    fan_since DATE,
    favorite_player_id UUID,
    lifetime_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    acquisition_channel TEXT,
    UNIQUE (person_id)
);

CREATE TABLE employee (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES person (id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES club (id),
    department TEXT,
    role_title TEXT,
    hired_at DATE,
    UNIQUE (person_id)
);

CREATE TABLE membership (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fan_id UUID NOT NULL REFERENCES fan (id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
    monthly_value NUMERIC(10, 2) NOT NULL,
    started_at DATE NOT NULL,
    renews_at DATE NOT NULL,
    cancelled_at DATE
);

CREATE INDEX idx_membership_fan_id ON membership (fan_id);
CREATE INDEX idx_membership_status ON membership (status);
CREATE INDEX idx_membership_renews_at ON membership (renews_at);
