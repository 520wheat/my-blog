CREATE TABLE IF NOT EXISTS guestbook_notes (
	id TEXT PRIMARY KEY,
	nickname TEXT NOT NULL,
	content TEXT NOT NULL,
	color TEXT NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'deleted')),
	created_at TEXT NOT NULL,
	approved_at TEXT
);

CREATE INDEX IF NOT EXISTS guestbook_notes_status_created_at
	ON guestbook_notes (status, created_at DESC);
