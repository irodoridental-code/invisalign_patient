-- =============================================
-- InvisAlign Pro - Supabase スキーマ（最終版）
-- =============================================

-- 患者テーブル
CREATE TABLE patients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_no        TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  dob             DATE,
  patient_type    TEXT NOT NULL CHECK (patient_type IN ('adult','pedo')),
  doctor          TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- フェーズテーブル（1回目・追加アライナー）
CREATE TABLE phases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID REFERENCES patients(id) ON DELETE CASCADE,
  phase_no        INTEGER NOT NULL DEFAULT 1,
  total_aligners  INTEGER NOT NULL,
  current_aligner INTEGER NOT NULL DEFAULT 1,
  start_date      DATE,
  at_date         DATE,
  cycle_days      INTEGER NOT NULL DEFAULT 7,
  ipr_stages      INTEGER[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 来院日テーブル（フェーズ別）
CREATE TABLE visit_dates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID REFERENCES patients(id) ON DELETE CASCADE,
  phase_no        INTEGER NOT NULL DEFAULT 1,
  date            DATE NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('first','at','visit','manual')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, phase_no, date)
);

-- 再計算履歴テーブル
CREATE TABLE recalc_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID REFERENCES patients(id) ON DELETE CASCADE,
  phase_no        INTEGER NOT NULL DEFAULT 1,
  stage           INTEGER NOT NULL,
  new_date        DATE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 担当医テーブル
CREATE TABLE doctors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS（全許可）
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE recalc_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all" ON patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON phases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON visit_dates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON recalc_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON doctors FOR ALL USING (true) WITH CHECK (true);

-- 担当医初期データ
INSERT INTO doctors (name, sort_order) VALUES
  ('中原', 0), ('田上', 1), ('高本', 2), ('渡邊', 3),
  ('古川', 4), ('三嶋', 5), ('亀崎', 6);
