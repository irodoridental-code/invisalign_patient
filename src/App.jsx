import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import PatientList from './components/PatientList'
import PatientForm from './components/PatientForm'
import Settings from './components/Settings'
import PatientModal from './components/PatientModal'
import CalendarModal from './components/CalendarModal'

export default function App() {
  const [page, setPage] = useState('list') // list | add | settings
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [modalPatient, setModalPatient] = useState(null)
  const [calPatient, setCalPatient] = useState(null)
  const [visitDates, setVisitDates] = useState({}) // {patientId: {dateStr: 'first'|'visit'|'manual'}}

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  // ── 初期データ取得 ──
  useEffect(() => {
    fetchAll()
    // Supabase Realtime subscriptions
    const patientSub = supabase
      .channel('patients-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => fetchPatients())
      .subscribe()
    const doctorSub = supabase
      .channel('doctors-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctors' }, () => fetchDoctors())
      .subscribe()
    const visitSub = supabase
      .channel('visits-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visit_dates' }, () => fetchVisitDates())
      .subscribe()
    return () => {
      supabase.removeChannel(patientSub)
      supabase.removeChannel(doctorSub)
      supabase.removeChannel(visitSub)
    }
  }, [])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchPatients(), fetchDoctors(), fetchVisitDates()])
    setLoading(false)
  }

  async function fetchPatients() {
    const { data } = await supabase.from('patients').select('*').order('chart_no', { ascending: true })
    if (data) setPatients(data)
  }

  async function fetchDoctors() {
    const { data } = await supabase.from('doctors').select('*').order('sort_order', { ascending: true })
    if (data) setDoctors(data.map(d => d.name))
  }

  async function fetchVisitDates() {
    const { data } = await supabase.from('visit_dates').select('*')
    if (data) {
      const map = {}
      data.forEach(row => {
        if (!map[row.patient_id]) map[row.patient_id] = {}
        map[row.patient_id][row.date] = row.type
      })
      setVisitDates(map)
    }
  }

  // ── 患者CRUD ──
  async function addPatient(p) {
    const { error } = await supabase.from('patients').insert([{
      chart_no: p.chart, name: p.name, dob: p.dob === '—' ? null : p.dob,
      total_aligners: p.total, current_aligner: p.cur,
      start_date: p.start, next_visit: p.next || null,
      cycle_days: parseInt(p.cyc), patient_type: p.type, doctor: p.doc || null, notes: p.notes || null
    }])
    if (error) { showToast('登録に失敗しました'); return false }
    // visit_dates 登録
    await syncVisitDates(p)
    showToast(p.name + '（カルテ番号：' + p.chart + '）を登録しました')
    return true
  }

  async function updatePatient(p) {
    const { error } = await supabase.from('patients').update({
      chart_no: p.chart, name: p.name, dob: p.dob === '—' ? null : p.dob,
      total_aligners: p.total, current_aligner: p.cur,
      start_date: p.start, next_visit: p.next || null,
      cycle_days: parseInt(p.cyc), patient_type: p.type, doctor: p.doc || null, notes: p.notes || null
    }).eq('id', p.id)
    if (error) { showToast('更新に失敗しました'); return false }
    await syncVisitDates(p)
    showToast('変更を保存しました')
    return true
  }

  async function syncVisitDates(p) {
    // start_date → first, next_visit → visit を upsert
    const rows = []
    if (p.start && p.start !== '—') rows.push({ patient_id: p.id, date: p.start, type: 'first' })
    if (p.next) rows.push({ patient_id: p.id, date: p.next, type: 'visit' })
    if (rows.length > 0) {
      await supabase.from('visit_dates').upsert(rows, { onConflict: 'patient_id,date' })
    }
  }

  // ── 来院日トグル ──
  async function toggleVisit(patientId, dateStr) {
    const vd = visitDates[patientId] || {}
    const cur = vd[dateStr]
    if (cur === 'first') return
    if (cur === 'visit' || cur === 'manual') {
      await supabase.from('visit_dates').delete().eq('patient_id', patientId).eq('date', dateStr)
    } else {
      await supabase.from('visit_dates').upsert([{ patient_id: patientId, date: dateStr, type: 'manual' }], { onConflict: 'patient_id,date' })
    }
    await fetchVisitDates()
  }

  // ── カレンダー保存（次回来院日を自動更新） ──
  async function saveCalendar(patient) {
    const vd = visitDates[patient.id] || {}
    const today = fmtDate(new Date())
    const future = Object.keys(vd).filter(k => (vd[k] === 'visit' || vd[k] === 'manual') && k >= today).sort()
    let newNext = ''
    if (future.length > 0) {
      // 既存visitをmanualに変換
      for (const k of Object.keys(vd)) {
        if (vd[k] === 'visit') {
          await supabase.from('visit_dates').update({ type: 'manual' }).eq('patient_id', patient.id).eq('date', k)
        }
      }
      newNext = future[0]
      await supabase.from('visit_dates').upsert([{ patient_id: patient.id, date: newNext, type: 'visit' }], { onConflict: 'patient_id,date' })
      await supabase.from('patients').update({ next_visit: newNext }).eq('id', patient.id)
      showToast('次回来院日を ' + newNext + ' に更新しました')
    } else {
      await supabase.from('patients').update({ next_visit: null }).eq('id', patient.id)
      showToast('今日以降の来院日がありません。次回来院日をクリアしました')
    }
    await fetchAll()
  }

  // ── 担当医CRUD ──
  async function addDoctor(name) {
    const maxOrder = doctors.length
    const { error } = await supabase.from('doctors').insert([{ name, sort_order: maxOrder }])
    if (error) showToast('追加に失敗しました')
  }
  async function updateDoctor(oldName, newName) {
    await supabase.from('doctors').update({ name: newName }).eq('name', oldName)
  }
  async function deleteDoctor(name) {
    await supabase.from('doctors').delete().eq('name', name)
  }
  async function reorderDoctors(newOrder) {
    for (let i = 0; i < newOrder.length; i++) {
      await supabase.from('doctors').update({ sort_order: i }).eq('name', newOrder[i])
    }
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n }
  function fmtDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }

  // patients を UI用に変換（DB column名 → 旧key名）
  function toUI(p) {
    return {
      id: p.id, chart: p.chart_no, name: p.name, dob: p.dob || '—',
      total: p.total_aligners, cur: p.current_aligner,
      start: p.start_date, next: p.next_visit || '',
      cyc: String(p.cycle_days), type: p.patient_type, doc: p.doctor || '', notes: p.notes || ''
    }
  }

  const uiPatients = patients.map(toUI)

  return (
    <div className="app" style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      {/* Topbar */}
      <div className="topbar">
        <span className="logo">InvisAlign Pro</span>
        <div className="top-right">
          <button className="icon-btn" title="設定" onClick={() => setPage('settings')}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button className="btn btn-blue" style={{ fontSize:'12px', padding:'6px 12px' }} onClick={() => setPage('add')}>＋ 新規患者</button>
        </div>
      </div>

      {/* Content */}
      <div className="content" style={{ flex:1 }}>
        {loading && <div className="loading">データを読み込み中...</div>}
        {!loading && page === 'list' && (
          <PatientList
            patients={uiPatients}
            onOpenModal={p => setModalPatient(p)}
            onOpenCal={p => setCalPatient(p)}
          />
        )}
        {!loading && page === 'add' && (
          <PatientForm
            doctors={doctors}
            onSubmit={async (p) => { const ok = await addPatient(p); if (ok) setPage('list') }}
            onCancel={() => setPage('list')}
          />
        )}
        {!loading && page === 'settings' && (
          <Settings
            doctors={doctors}
            onAdd={addDoctor}
            onUpdate={updateDoctor}
            onDelete={deleteDoctor}
            onReorder={reorderDoctors}
            onBack={() => setPage('list')}
          />
        )}
      </div>

      {/* 詳細モーダル */}
      {modalPatient && (
        <PatientModal
          patient={modalPatient}
          doctors={doctors}
          onClose={() => setModalPatient(null)}
          onUpdate={async (p) => { const ok = await updatePatient(p); if (ok) { setModalPatient(null) } }}
          onOpenCal={(p) => { setModalPatient(null); setCalPatient(p) }}
        />
      )}

      {/* カレンダーモーダル */}
      {calPatient && (
        <CalendarModal
          patient={calPatient}
          visitDates={visitDates[calPatient.id] || {}}
          onClose={() => setCalPatient(null)}
          onToggleVisit={(date) => toggleVisit(calPatient.id, date)}
          onSave={() => saveCalendar(calPatient)}
        />
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      <div id="print-area" />
    </div>
  )
}
