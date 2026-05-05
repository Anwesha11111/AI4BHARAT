CREATE TABLE vendors (
	id SERIAL NOT NULL, 
	name VARCHAR, 
	registration_number VARCHAR, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (registration_number)
);

CREATE UNIQUE INDEX ix_vendors_name ON vendors (name);
CREATE INDEX ix_vendors_id ON vendors (id);

CREATE TABLE tenders (
	id SERIAL NOT NULL, 
	title VARCHAR, 
	description TEXT, 
	file_path VARCHAR, 
	raw_text TEXT, 
	status VARCHAR NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX ix_tenders_id ON tenders (id);
CREATE INDEX ix_tenders_title ON tenders (title);

CREATE TABLE audit_log (
	id SERIAL NOT NULL, 
	entity_type VARCHAR, 
	entity_id INTEGER, 
	action VARCHAR, 
	old_value JSON, 
	new_value JSON, 
	actor VARCHAR, 
	timestamp TIMESTAMP WITHOUT TIME ZONE, 
	reason TEXT, 
	PRIMARY KEY (id)
);

CREATE INDEX ix_audit_log_id ON audit_log (id);

CREATE TABLE criteria (
	id SERIAL NOT NULL, 
	tender_id INTEGER, 
	text TEXT, 
	type VARCHAR, 
	weight FLOAT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(tender_id) REFERENCES tenders (id)
);

CREATE INDEX ix_criteria_id ON criteria (id);

CREATE TABLE bidders (
	id SERIAL NOT NULL, 
	tender_id INTEGER, 
	vendor_id INTEGER, 
	folder_path VARCHAR, 
	status VARCHAR NOT NULL, 
	submission_date TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(tender_id) REFERENCES tenders (id), 
	FOREIGN KEY(vendor_id) REFERENCES vendors (id)
);

CREATE INDEX ix_bidders_id ON bidders (id);

CREATE TABLE documents (
	id SERIAL NOT NULL, 
	tender_id INTEGER NOT NULL, 
	bidder_id INTEGER, 
	text TEXT NOT NULL, 
	page INTEGER NOT NULL, 
	file_name VARCHAR NOT NULL, 
	source_type VARCHAR NOT NULL, 
	language VARCHAR, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(tender_id) REFERENCES tenders (id), 
	FOREIGN KEY(bidder_id) REFERENCES bidders (id)
);

CREATE INDEX ix_documents_id ON documents (id);

CREATE TABLE verdicts (
	id SERIAL NOT NULL, 
	bidder_id INTEGER, 
	criterion_id INTEGER, 
	status VARCHAR, 
	confidence FLOAT, 
	reasoning TEXT, 
	evidence_citation JSON, 
	is_human_reviewed BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(bidder_id) REFERENCES bidders (id), 
	FOREIGN KEY(criterion_id) REFERENCES criteria (id)
);

CREATE INDEX ix_verdicts_id ON verdicts (id);

CREATE TABLE corrections (
	id SERIAL NOT NULL, 
	verdict_id INTEGER, 
	old_status VARCHAR, 
	new_status VARCHAR, 
	reviewer_id VARCHAR, 
	reason TEXT, 
	timestamp TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(verdict_id) REFERENCES verdicts (id)
);

CREATE INDEX ix_corrections_id ON corrections (id);
