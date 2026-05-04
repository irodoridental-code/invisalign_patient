import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import PatientList from './components/PatientList'
import PatientForm from './components/PatientForm'
import Settings from './components/Settings'
import PatientModal from './components/PatientModal'
import CalendarModal from './components/CalendarModal'

export default function App() {
  const [page, setPage] = useState('list')
  const [patients, setPatients] = useState([])   // DB生データ
  const [phases, setPhases] = useState([])        // DB生データ
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [modalPatient, setModalPatient] = useState(null)
  const [calPatient, setCalPatient] = useState(null)
  const [visitDates, setVisitDates] = useState({})     // {pid: {phaseNo: {date: type}}}
  const [recalcHistory, setRecalcHistory] = useState({}) // {pid: {phaseNo: [{stage,date}]}}

  const showToast = useCallback((msg) => {
    setToast(msg); setTimeout(() => setToast(null), 2500)
  }, [])

  useEffect(() => {
    fetchAll()
    const subs = ['patients','phases','visit_dates','recalc_history','doctors'].map(table =>
      supabase.channel(table+'-ch')
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => fetchAll())
        .subscribe()
    )
    return () => subs.forEach(s => supabase.removeChannel(s))
  }, [])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchPatients(), fetchPhases(), fetchDoctors(), fetchVisitDates(), fetchRecalcHistory()])
    setLoading(false)
  }

  async function fetchPatients() {
    const { data } = await supabase.from('patients').select('*').order('chart_no', { ascending: true })
    if (data) setPatients(data)
  }
  async function fetchPhases() {
    const { data } = await supabase.from('phases').select('*').order('phase_no', { ascending: true })
    if (data) setPhases(data)
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
        if (!map[row.patient_id][row.phase_no]) map[row.patient_id][row.phase_no] = {}
        map[row.patient_id][row.phase_no][row.date] = row.type
      })
      setVisitDates(map)
    }
  }
  async function fetchRecalcHistory() {
    const { data } = await supabase.from('recalc_history').select('*').order('created_at', { ascending: true })
    if (data) {
      const map = {}
      data.forEach(row => {
        if (!map[row.patient_id]) map[row.patient_id] = {}
        if (!map[row.patient_id][row.phase_no]) map[row.patient_id][row.phase_no] = []
        map[row.patient_id][row.phase_no].push({ stage: row.stage, date: row.new_date })
      })
      setRecalcHistory(map)
    }
  }

  // ── 患者登録 ──
  async function addPatient(p) {
    const { data, error } = await supabase.from('patients').insert([{
      chart_no: p.chart, name: p.name, dob: p.dob === '—' ? null : p.dob,
      patient_type: p.type, doctor: p.doc || null, notes: p.notes || null
    }]).select().single()
    if (error || !data) { showToast('登録に失敗しました'); return false }
    // フェーズ1を登録
    const { error: pe } = await supabase.from('phases').insert([{
      patient_id: data.id, phase_no: 1,
      total_aligners: p.total, current_aligner: p.cur,
      start_date: p.start, at_date: p.at || null,
      cycle_days: parseInt(p.cyc), ipr_stages: p.ipr_stages || []
    }])
    if (pe) { showToast('フェーズ登録に失敗しました'); return false }
    // 来院日を登録
    await syncVisitDates(data.id, 1, p.start, p.at, '')
    showToast(p.name + 'を登録しました')
    return true
  }

  // ── 患者更新（1回目フェーズのみ） ──
  async function updatePatient(p) {
    const { error } = await supabase.from('patients').update({
      chart_no: p.chart, name: p.name, dob: p.dob === '—' ? null : p.dob,
      patient_type: p.type, doctor: p.doc || null, notes: p.notes || null
    }).eq('id', p.id)
    if (error) { showToast('更新に失敗しました'); return false }
    // フェーズ1更新
    const { error: pe } = await supabase.from('phases').update({
      total_aligners: p.total, current_aligner: p.cur,
      start_date: p.start, at_date: p.at || null,
      cycle_days: parseInt(p.cyc), ipr_stages: p.ipr_stages || []
    }).eq('patient_id', p.id).eq('phase_no', 1)
    if (pe) { showToast('フェーズ更新に失敗しました'); return false }
    await syncVisitDates(p.id, 1, p.start, p.at, '')
    showToast('変更を保存しました')
    return true
  }

  // ── 追加アライナー登録 ──
  async function addPhase(patientId, phaseNo, ph) {
    const { error } = await supabase.from('phases').insert([{
      patient_id: patientId, phase_no: phaseNo,
      total_aligners: ph.total, current_aligner: 1,
      start_date: ph.start, at_date: null,
      cycle_days: parseInt(ph.cyc), ipr_stages: ph.ipr_stages || []
    }])
    if (error) { showToast('追加アライナー登録に失敗しました'); return false }
    await syncVisitDates(patientId, phaseNo, ph.start, null, '')
    showToast(phaseNo + '回目のスケジュールを登録しました')
    return true
  }

  // ── 追加アライナー更新 ──
  async function updatePhase(patientId, phaseNo, ph) {
    const { error } = await supabase.from('phases').update({
      total_aligners: ph.total, current_aligner: ph.cur,
      start_date: ph.start, cycle_days: parseInt(ph.cyc), ipr_stages: ph.ipr_stages || []
    }).eq('patient_id', patientId).eq('phase_no', phaseNo)
    if (error) { showToast('更新に失敗しました'); return false }
    showToast('変更を保存しました')
    return true
  }

  // ── 来院日同期 ──
  async function syncVisitDates(patientId, phaseNo, start, at, next) {
    const rows = []
    if (start) rows.push({ patient_id: patientId, phase_no: phaseNo, date: start, type: 'first' })
    if (at) rows.push({ patient_id: patientId, phase_no: phaseNo, date: at, type: 'at' })
    if (next) rows.push({ patient_id: patientId, phase_no: phaseNo, date: next, type: 'visit' })
    if (rows.length > 0) {
      await supabase.from('visit_dates').upsert(rows, { onConflict: 'patient_id,phase_no,date' })
    }
  }

  // ── 来院日トグル ──
  async function toggleVisit(patientId, phaseNo, dateStr) {
    const vd = (visitDates[patientId] || {})[phaseNo] || {}
    const cur = vd[dateStr]
    if (cur === 'first' || cur === 'at') return
    if (cur === 'visit' || cur === 'manual') {
      await supabase.from('visit_dates').delete()
        .eq('patient_id', patientId).eq('phase_no', phaseNo).eq('date', dateStr)
    } else {
      await supabase.from('visit_dates').upsert(
        [{ patient_id: patientId, phase_no: phaseNo, date: dateStr, type: 'manual' }],
        { onConflict: 'patient_id,phase_no,date' }
      )
    }
    await fetchVisitDates()
  }

  // ── カレンダー保存 ──
  async function saveCalendar(patientId, phaseNo) {
    const vd = (visitDates[patientId] || {})[phaseNo] || {}
    const today = fmtDate(new Date())
    const future = Object.keys(vd).filter(k => (vd[k] === 'visit' || vd[k] === 'manual') && k >= today).sort()
    if (future.length > 0) {
      for (const k of Object.keys(vd)) {
        if (vd[k] === 'visit') {
          await supabase.from('visit_dates').update({ type: 'manual' })
            .eq('patient_id', patientId).eq('phase_no', phaseNo).eq('date', k)
        }
      }
      const newNext = future[0]
      await supabase.from('visit_dates').upsert(
        [{ patient_id: patientId, phase_no: phaseNo, date: newNext, type: 'visit' }],
        { onConflict: 'patient_id,phase_no,date' }
      )
      showToast('次回来院日を ' + newNext + ' に更新しました')
    } else {
      showToast('今日以降の来院日がありません')
    }
    await fetchVisitDates()
  }

  // ── 再計算履歴保存 ──
  async function addRecalc(patientId, phaseNo, stage, date) {
    const { error } = await supabase.from('recalc_history').insert([{
      patient_id: patientId, phase_no: phaseNo, stage, new_date: date
    }])
    if (error) { showToast('再計算の保存に失敗しました'); return false }
    await fetchRecalcHistory()
    showToast('再計算を保存しました')
    return true
  }

  // ── 再計算履歴リセット ──
  async function resetRecalc(patientId, phaseNo) {
    await supabase.from('recalc_history')
      .delete().eq('patient_id', patientId).eq('phase_no', phaseNo)
    await fetchRecalcHistory()
    showToast('再計算履歴をリセットしました')
  }
// ── 患者削除 ──
  async function deletePatient(id) {
    const { error } = await supabase.from('patients').delete().eq('id', id)
    if (error) { showToast('削除に失敗しました'); return false }
    showToast('患者を削除しました')
    return true
  }
  // ── 担当医CRUD ──
  async function addDoctor(name) {
    const { error } = await supabase.from('doctors').insert([{ name, sort_order: doctors.length }])
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

  // UI用データ変換：患者 + フェーズを結合
  const uiPatients = patients.map(p => {
    const pPhases = phases
      .filter(ph => ph.patient_id === p.id)
      .sort((a, b) => a.phase_no - b.phase_no)
      .map(ph => ({
        phaseNo: ph.phase_no,
        total: ph.total_aligners,
        cur: ph.current_aligner,
        start: ph.start_date,
        at: ph.at_date || '',
        cyc: String(ph.cycle_days),
        ipr_stages: ph.ipr_stages || []
      }))
    return {
      id: p.id, chart: p.chart_no, name: p.name, dob: p.dob || '—',
      type: p.patient_type, doc: p.doctor || '', notes: p.notes || '',
      phases: pPhases.length > 0 ? pPhases : [{
        phaseNo: 1, total: 0, cur: 1, start: '', at: '', cyc: '7', ipr_stages: []
      }]
    }
  })

  return (
    <div className="app" style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
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

      <div className="content" style={{ flex:1 }}>
        {loading && <div className="loading">データを読み込み中...</div>}
        {!loading && page === 'list' && (
          <PatientList
            patients={uiPatients}
            visitDates={visitDates}
            onOpenModal={p => setModalPatient(p)}
            onOpenCal={p => { setCalPatient(p) }}
            onOpenAddAligner={p => { setCalPatient(p) }}
            onDelete={async (id) => { await deletePatient(id) }}
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
            onAdd={addDoctor} onUpdate={updateDoctor}
            onDelete={deleteDoctor} onReorder={reorderDoctors}
            onBack={() => setPage('list')}
          />
        )}
      </div>

      {modalPatient && (
        <PatientModal
          patient={uiPatients.find(p => p.id === modalPatient.id) || modalPatient}
          doctors={doctors}
          onClose={() => setModalPatient(null)}
          onUpdate={async (p) => { const ok = await updatePatient(p); if (ok) setModalPatient(null) }}
          onUpdatePhase={async (pid, phNo, ph) => { await updatePhase(pid, phNo, ph) }}
          onOpenCal={(p) => { setModalPatient(null); setCalPatient(p) }}
        />
      )}

      {calPatient && (() => {
        const latest = uiPatients.find(p => p.id === calPatient.id) || calPatient
        return (
          <CalendarModal
            patient={latest}
            visitDates={visitDates[latest.id] || {}}
            recalcHistory={recalcHistory[latest.id] || {}}
            onClose={() => setCalPatient(null)}
            onToggleVisit={(phaseNo, date) => toggleVisit(latest.id, phaseNo, date)}
            onSave={(phaseNo) => saveCalendar(latest.id, phaseNo)}
            onAddPhase={(phaseNo, ph) => addPhase(latest.id, phaseNo, ph)}
            onUpdatePhase={(phaseNo, ph) => updatePhase(latest.id, phaseNo, ph)}
            onAddRecalc={(phaseNo, stage, date) => addRecalc(latest.id, phaseNo, stage, date)}
            onResetRecalc={(phaseNo) => resetRecalc(latest.id, phaseNo)}
          />
        )
      })()}

      {toast && <div className="toast">{toast}</div>}
      <div id="print-area" />
    </div>
  )
}
