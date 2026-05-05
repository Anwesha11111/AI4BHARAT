-- ============================================================
-- TenderMind Supabase Schema
-- Run this in the Supabase SQL editor to create all tables.
-- Safe to re-run (uses IF NOT EXISTS).
-- ============================================================

CREATE TABLE IF NOT EXISTS vendors (
	id SERIAL NOT NULL, 
	name VARCHAR UNIQUE, 
	registration_number VARCHAR, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(), 
	PRIMARY KEY (id), 
	UNIQUE (registration_number)
);

CREATE INDEX IF NOT EXISTS ix_vendors_id ON vendors (id);

CREATE TABLE IF NOT EXISTS tenders (
	id SERIAL NOT NULL, 
	title VARCHAR, 
	description TEXT, 
	file_path VARCHAR, 
	raw_text TEXT, 
	status VARCHAR NOT NULL DEFAULT 'uploaded', 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(), 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_tenders_id ON tenders (id);
CREATE INDEX IF NOT EXISTS ix_tenders_title ON tenders (title);
CREATE INDEX IF NOT EXISTS ix_tenders_status ON tenders (status);

CREATE TABLE IF NOT EXISTS audit_log (
	id SERIAL NOT NULL, 
	entity_type VARCHAR, 
	entity_id INTEGER, 
	action VARCHAR, 
	old_value JSON, 
	new_value JSON, 
	actor VARCHAR, 
	timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(), 
	reason TEXT, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_audit_log_id ON audit_log (id);
-- Composite index for fast per-entity lookups
CREATE INDEX IF NOT EXISTS ix_audit_log_entity ON audit_log (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS criteria (
	id SERIAL NOT NULL, 
	tender_id INTEGER, 
	text TEXT, 
	type VARCHAR, 
	weight FLOAT DEFAULT 1.0, 
	PRIMARY KEY (id), 
	FOREIGN KEY(tender_id) REFERENCES tenders (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_criteria_id ON criteria (id);
CREATE INDEX IF NOT EXISTS ix_criteria_tender_id ON criteria (tender_id);

CREATE TABLE IF NOT EXISTS bidders (
	id SERIAL NOT NULL, 
	tender_id INTEGER, 
	vendor_id INTEGER, 
	folder_path VARCHAR, 
	status VARCHAR NOT NULL DEFAULT 'uploaded', 
	submission_date TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tender_id) REFERENCES tenders (id) ON DELETE CASCADE, 
	FOREIGN KEY(vendor_id) REFERENCES vendors (id)
);

CREATE INDEX IF NOT EXISTS ix_bidders_id ON bidders (id);
CREATE INDEX IF NOT EXISTS ix_bidders_tender_id ON bidders (tender_id);
CREATE INDEX IF NOT EXISTS ix_bidders_status ON bidders (status);

CREATE TABLE IF NOT EXISTS documents (
	id SERIAL NOT NULL, 
	tender_id INTEGER NOT NULL, 
	bidder_id INTEGER, 
	text TEXT NOT NULL, 
	page INTEGER NOT NULL DEFAULT 1, 
	file_name VARCHAR NOT NULL, 
	source_type VARCHAR NOT NULL, 
	language VARCHAR DEFAULT 'unknown', 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tender_id) REFERENCES tenders (id) ON DELETE CASCADE, 
	FOREIGN KEY(bidder_id) REFERENCES bidders (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_documents_id ON documents (id);
-- Composite index for efficient chunk retrieval per tender/bidder
CREATE INDEX IF NOT EXISTS ix_documents_tender_bidder ON documents (tender_id, bidder_id);

CREATE TABLE IF NOT EXISTS verdicts (
	id SERIAL NOT NULL, 
	bidder_id INTEGER, 
	criterion_id INTEGER, 
	status VARCHAR, 
	confidence FLOAT, 
	reasoning TEXT, 
	evidence_citation JSON, 
	is_human_reviewed BOOLEAN DEFAULT FALSE, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(bidder_id) REFERENCES bidders (id) ON DELETE CASCADE, 
	FOREIGN KEY(criterion_id) REFERENCES criteria (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_verdicts_id ON verdicts (id);
CREATE INDEX IF NOT EXISTS ix_verdicts_bidder_id ON verdicts (bidder_id);

CREATE TABLE IF NOT EXISTS corrections (
	id SERIAL NOT NULL, 
	verdict_id INTEGER, 
	old_status VARCHAR, 
	new_status VARCHAR, 
	reviewer_id VARCHAR, 
	reason TEXT, 
	timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(verdict_id) REFERENCES verdicts (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_corrections_id ON corrections (id);
