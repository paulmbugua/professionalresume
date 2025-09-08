-- organizations
CREATE TABLE IF NOT EXISTS organizations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  slug              TEXT UNIQUE,
  logo_url          TEXT,
  signature_url     TEXT,
  certificate_title TEXT NOT NULL DEFAULT 'Certificate of Completion',
  default_pass_mark INTEGER NOT NULL DEFAULT 70,          -- colleges/lower schools can override per assignment
  quiz_time_limit_s INTEGER NOT NULL DEFAULT 900,         -- 15 minutes default
  allow_retry       BOOLEAN NOT NULL DEFAULT FALSE,       -- institutional policy
  email_domain      TEXT,                                 -- optional: restrict invites by domain
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- org memberships
CREATE TABLE IF NOT EXISTS org_memberships (
  org_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL CHECK (role IN ('owner','admin','instructor','learner')),
  email     TEXT,              -- capture invite email
  invited_by INTEGER,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at  TIMESTAMPTZ,
  PRIMARY KEY (org_id, user_id)
);

-- subscription (simple seats + features json)
CREATE TABLE IF NOT EXISTS org_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tier        TEXT NOT NULL CHECK (tier IN ('starter','pro','enterprise')),
  seats       INTEGER NOT NULL DEFAULT 50,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ
);

-- course assignments (shareable link)
CREATE TABLE IF NOT EXISTS org_course_assignments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id      UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title_override TEXT,
  pass_mark      INTEGER,               -- null uses org.default_pass_mark
  timer_s        INTEGER,               -- null uses org.quiz_time_limit_s
  max_attempts   INTEGER NOT NULL DEFAULT 1,
  due_at         TIMESTAMPTZ,           -- optional hard deadline
  invite_code    TEXT UNIQUE NOT NULL,  -- used in the link
  created_by     INTEGER NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- attempts (single attempt enforced)
CREATE TABLE IF NOT EXISTS org_quiz_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES org_course_assignments(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at        TIMESTAMPTZ NOT NULL,
  submitted_at  TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','submitted','expired','locked')),
  score_pct     INTEGER,
  pass_mark     INTEGER,
  passed        BOOLEAN,
  answers       JSONB DEFAULT '[]'::jsonb,
  UNIQUE (assignment_id, user_id)
);

-- helper index for analytics
CREATE INDEX IF NOT EXISTS idx_org_attempts_org_time ON org_quiz_attempts (org_id, started_at);
