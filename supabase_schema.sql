-- ============================================================
--  InvisAlign Pro - Supabase テーブル定義
--  Supabase Dashboard > SQL Editor に貼り付けて実行してください
-- ============================================================

-- 患者テーブル
CREATE TABLE patients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_no        TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  dob             DATE,
  total_aligners  INTEGER NOT NULL,
  current_aligner INTEGER NOT NULL DEFAULT 1,
  start_date      DATE,
  next_visit      DATE,
  cycle_days      INTEGER NOT NULL DEFAULT 7,
  patient_type    TEXT NOT NULL CHECK (patient_type IN ('adult','pedo')),
  doctor          TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 担当医テーブル
CREATE TABLE doctors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 来院日テーブル
CREATE TABLE visit_dates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('first','visit','manual')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, date)
);

-- インデックス
CREATE INDEX idx_visit_dates_patient ON visit_dates(patient_id);

-- Realtime 有効化
ALTER PUBLICATION supabase_realtime ADD TABLE patients;
ALTER PUBLICATION supabase_realtime ADD TABLE doctors;
ALTER PUBLICATION supabase_realtime ADD TABLE visit_dates;

-- Row Level Security（今は全員読み書き可能 - 必要に応じて制限してください）
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all" ON patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON doctors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON visit_dates FOR ALL USING (true) WITH CHECK (true);

-- 初期担当医データ
INSERT INTO doctors (name, sort_order) VALUES
  ('中原', 0),
  ('田上', 1),
  ('高本', 2),
  ('渡邊', 3),
  ('古川', 4),
  ('三嶋', 5),
  ('亀崎', 6);
