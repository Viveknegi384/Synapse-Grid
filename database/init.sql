-- ============================================================
-- Agentic Research Grid - Database Schema
-- ============================================================

-- Table: research_sessions
-- Stores each user-initiated research job
CREATE TABLE IF NOT EXISTS research_sessions (
    id          SERIAL PRIMARY KEY,
    user_query  TEXT        NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- Table: research_reports
-- Stores the final Markdown report produced for a session
CREATE TABLE IF NOT EXISTS research_reports (
    id              SERIAL PRIMARY KEY,
    session_id      INTEGER     NOT NULL,
    report_content  TEXT        NOT NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_report_session
        FOREIGN KEY (session_id)
        REFERENCES research_sessions(id)
        ON DELETE CASCADE
);

-- Table: agent_logs
-- Stores real-time action logs from each AI agent for live UI streaming
CREATE TABLE IF NOT EXISTS agent_logs (
    id           SERIAL PRIMARY KEY,
    session_id   INTEGER      NOT NULL,
    agent_name   VARCHAR(50)  NOT NULL,
    log_message  TEXT         NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_log_session
        FOREIGN KEY (session_id)
        REFERENCES research_sessions(id)
        ON DELETE CASCADE
);
