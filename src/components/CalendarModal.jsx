import { useState } from 'react'

const CIRC = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳','㉑','㉒','㉓','㉔','㉕','㉖','㉗','㉘','㉙','㉚','㉛','㉜','㉝','㉞','㉟','㊱','㊲','㊳','㊴','㊵','㊶','㊷','㊸','㊹','㊺','㊻','㊼','㊽','㊾','㊿']
function toC(n) { return n >= 1 && n <= 50 ? CIRC[n-1] : '('+n+')' }
function pad(n) { return n < 10 ? '0'+n : ''+n }
function fmtDate(d) { return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()) }

function buildChangeDates(ph, history) {
  const start = new Date(ph.start)
  if (isNaN(start.getTime())) return {}
  const days = parseInt(ph.cyc)
  const allDates = []
  if (ph.at) {
    const atDate = new Date(ph.at)
    const midDays = Math.floor((atDate - start) / 86400000 / 2)
    allDates.push({ ds: fmtDate(start), stg: 1 })
    if (midDays > 0) allDates.push({ ds: fmtDate(new Date(start.getTime()+midDays*86400000)), stg: 2 })
    for (let i = 0; i < ph.total - 2; i++)
      allDates.push({ ds: fmtDate(new Date(atDate.getTime()+i*days*86400000)), stg: i+3 })
  } else {
    for (let i = 0; i < ph.total; i++)
      allDates.push({ ds: fmtDate(new Date(start.getTime()+i*days*86400000)), stg: i+1 })
  }
  if (!history || !history.length) {
    const set = {}; allDates.forEach(item => { set[item.ds] = { stg: item.stg, old: false } }); return set
  }
  const last = history[history.length - 1]
  const set = {}
  allDates.forEach(item => { if (item.stg < last.stage) set[item.ds] = { stg: item.stg, old: true } })
  for (let h = 0; h < history.length - 1; h++) {
    const rec = history[h], recNext = history[h+1]
    const rs = new Date(rec.date)
    for (let i = 0; i < ph.total; i++) {
      const stg = rec.stage + i; if (stg >= recNext.stage) break
      set[fmtDate(new Date(rs.getTime()+i*days*86400000))] = { stg, old: true }
    }
  }
  const ls = new Date(last.date)
  for (let i = 0; i < ph.total - last.stage + 1; i++) {
    const stg = last.stage + i; if (stg > ph.total) break
    set[fmtDate(new Date(ls.getTime()+i*days*86400000))] = { stg, old: false }
  }
  return set
}

function buildIprDates(ph, changeDates) {
  const set = new Set()
  if (!ph.ipr_stages?.length) return set
  Object.keys(changeDates).forEach(ds => {
    if (!changeDates[ds].old && ph.ipr_stages.includes(changeDates[ds].stg)) set.add(ds)
  })
  return set
}

function IprBtn({ stage, selected, onToggle }) {
  return (
    <button onClick={() => onToggle(stage)} style={{
      minWidth:'34px', height:'34px', padding:'0 4px', borderRadius:'6px',
      border: selected ? '2px solid #1d4ed8' : '1px solid #ccc',
      background: selected ? '#dbeafe' : '#f9f9f8',
      color: selected ? '#1e40af' : '#666',
      fontWeight: selected ? 700 : 400, fontSize:'13px', cursor:'pointer'
    }}>{toC(stage)}</button>
  )
}

function PhaseForm({ title, submitLabel, initial, onSubmit, onCancel }) {
  const [total, setTotal] = useState(initial?.total || '')
  const [start, setStart] = useState(initial?.start || '')
  const [cyc, setCyc]     = useState(initial?.cyc || '7')
  const [confirmed, setConfirmed] = useState(initial?.total || null)
  const [ipr, setIpr]     = useState(initial?.ipr_stages || [])

  function confirmTotal() {
    const n = parseInt(total); if (!n || n < 1) { alert('枚数を入力してください'); return }
    setConfirmed(n); setIpr(prev => prev.filter(s => s <= n))
  }
  function toggleIpr(s) { setIpr(prev => prev.includes(s) ? prev.filter(x=>x!==s) : [...prev,s].sort((a,b)=>a-b)) }

  function handleSubmit() {
    if (!total || +total < 1) { alert('総アライナー枚数を入力してください'); return }
    if (!start) { alert('開始日を入力してください'); return }
    onSubmit({ total: parseInt(total), cur: initial?.cur || 1, start, cyc, ipr_stages: ipr })
  }

  return (
    <div style={{background:'#f5f5f3',border:'1px solid #e5e5e5',borderRadius:'10px',padding:'14px',marginBottom:'10px'}}>
      <div style={{fontSize:'12px',fontWeight:600,color:'#111',marginBottom:'10px'}}>{title}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
        <div style={{gridColumn:'1/-1'}}>
          <label className="f-lbl">総アライナー枚数</label>
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            <input className="f-inp" type="number" value={total}
              onChange={e => { setTotal(e.target.value); setConfirmed(null) }}
              placeholder="8" min="1" max="60" style={{maxWidth:'120px'}} />
            <button className="btn btn-blue" style={{fontSize:'11px',padding:'5px 10px',whiteSpace:'nowrap'}} onClick={confirmTotal}>決定</button>
            {confirmed && <span style={{fontSize:'11px',color:'#166534',fontWeight:600}}>✓ {confirmed}枚</span>}
          </div>
        </div>
        {confirmed && (
          <div style={{gridColumn:'1/-1'}}>
            <label className="f-lbl" style={{marginBottom:'6px'}}>IPR処置ステージ（任意）</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
              {Array.from({length:confirmed},(_,i)=>i+1).map(s => <IprBtn key={s} stage={s} selected={ipr.includes(s)} onToggle={toggleIpr} />)}
            </div>
            {ipr.length > 0 && <div style={{marginTop:'5px',fontSize:'11px',color:'#1e40af',fontWeight:600}}>選択中：{ipr.map(toC).join('・')}</div>}
          </div>
        )}
        <div>
          <label className="f-lbl">開始日</label>
          <input className="f-inp" type="date" value={start} onChange={e=>setStart(e.target.value)} />
        </div>
        <div style={{gridColumn:'1/-1'}}>
          <label className="f-lbl">交換サイクル</label>
          <div className="seg">
            <div className={'seg-item'+(cyc==='7'?' sel-c7':'')} onClick={()=>setCyc('7')}>1週間交換（7日）</div>
            <div className={'seg-item'+(cyc==='5'?' sel-c5':'')} onClick={()=>setCyc('5')}>5日交換</div>
          </div>
        </div>
      </div>
      <div style={{display:'flex',gap:'8px',marginTop:'10px'}}>
        <button className="btn btn-blue" onClick={handleSubmit}>{submitLabel}</button>
        <button className="btn btn-outline" onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  )
}

export default function CalendarModal({
  patient: p, visitDates: vdAll, recalcHistory: rhAll,
  onClose, onToggleVisit, onSave, onAddPhase, onUpdatePhase, onAddRecalc, onResetRecalc
}) {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [year, setYear] = useState(() => {
    const s = new Date(p.phases[0]?.start || '')
    return isNaN(s.getTime()) ? new Date().getFullYear() : s.getFullYear()
  })
  const [showAddForm, setShowAddForm]       = useState(false)
  const [showRecalcForm, setShowRecalcForm] = useState(false)
  const [recalcStage, setRecalcStage]       = useState('')
  const [recalcDate, setRecalcDate]         = useState('')

  const ph       = p.phases[phaseIdx] || p.phases[0]
  const phaseNo  = ph?.phaseNo || phaseIdx + 1
  const vd       = (vdAll[phaseNo] || {})
  const history  = (rhAll[phaseNo] || [])
  const changeDates = buildChangeDates(ph, history)
  const iprDates    = buildIprDates(ph, changeDates)
  const hasOld      = Object.values(changeDates).some(v => v.old)
  const dows = ['日','月','火','水','木','金','土']

  function switchPhase(i) {
    setPhaseIdx(i); setShowAddForm(false); setShowRecalcForm(false)
    const s = new Date(p.phases[i]?.start || '')
    setYear(isNaN(s.getTime()) ? new Date().getFullYear() : s.getFullYear())
  }

  async function handleAddPhase(ph) {
    const newPhaseNo = p.phases.length + 1
    await onAddPhase(newPhaseNo, ph)
    setShowAddForm(false)
  }
  async function handleUpdatePhase(data) {
    await onUpdatePhase(phaseNo, { ...ph, ...data, cur: ph.cur })
    setShowAddForm(false)
  }
  async function handleApplyRecalc() {
    const stage = parseInt(recalcStage)
    if (!stage || stage < 2 || stage > ph.total) { alert('ステージ番号を2〜'+ph.total+'で入力してください'); return }
    if (!recalcDate) { alert('新しい開始日を入力してください'); return }
    await onAddRecalc(phaseNo, stage, recalcDate)
    setShowRecalcForm(false); setRecalcStage(''); setRecalcDate('')
  }
  async function handleResetRecalc() {
    if (!confirm('再計算の履歴をすべてリセットしますか？')) return
    await onResetRecalc(phaseNo)
  }

  function bgClick(e) { if (e.target.id === 'cal-modal-bg') onClose() }

  function doPrint() {
    let html = `<style>
@page{size:A4 portrait;margin:0}body{font-family:sans-serif;margin:0;padding:4mm;width:210mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pt{text-align:center;font-size:10px;font-weight:700;margin-bottom:3px}
.mg{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;width:100%}
.mb{border:1px solid #ccc;border-radius:2px;overflow:hidden;page-break-inside:avoid;break-inside:avoid}
.mt{background:#eee;font-size:7px;font-weight:700;text-align:center;padding:1px;border-bottom:1px solid #ccc}
.dr{display:grid;grid-template-columns:repeat(7,1fr)}
.dw{text-align:center;font-size:5.5px;font-weight:600;color:#888;padding:1px 0;background:#f5f5f5;border-bottom:1px solid #eee}
.dc{border-right:1px solid #eee;border-bottom:1px solid #eee;height:28px;overflow:hidden;display:flex;flex-direction:column;background:#fff}
.dc:nth-child(7n){border-right:none}.dc.em{background:#fafafa}
.dc.fi{background:#fee2e2}.dc.at{background:#fce7f3}.dc.vi{background:#fef9c3}.dc.ch{background:#dbeafe}.dc.cho{background:#f1f5f9}
.dc.ipr{box-shadow:inset 0 0 0 2px #1d4ed8}
.dn{font-size:5.5px;font-weight:600;color:#555;padding:1px 2px 0;text-align:left;line-height:1.2;flex-shrink:0}
.dn.sun{color:#dc2626}.dn.sat{color:#2563eb}
.pl{font-size:5px;font-weight:700;display:block;text-align:center;line-height:1.4;width:100%;flex-shrink:0}
.pf{color:#dc2626}.pat{color:#9d174d}.pv{color:#b45309}.pc{color:#1e40af}.pco{color:#94a3b8}
</style><div class="pt">${p.name}さん（${phaseNo}回目）</div><div class="mg">`
    for (let m = 0; m < 12; m++) {
      const firstDow = new Date(year, m, 1).getDay()
      const lastDay  = new Date(year, m+1, 0).getDate()
      html += `<div class="mb"><div class="mt">${m+1}月</div><div class="dr">`
      dows.forEach((d,i) => { html += `<div class="dw" style="color:${i===0?'#dc2626':i===6?'#2563eb':'#888'}">${d}</div>` })
      for (let k = 0; k < firstDow; k++) html += '<div class="dc em"></div>'
      for (let day = 1; day <= lastDay; day++) {
        const ds = year+'-'+pad(m+1)+'-'+pad(day)
        const dow = (firstDow+day-1)%7, nc = dow===0?'sun':dow===6?'sat':''
        const vt = vd[ds]||null, ci = changeDates[ds]||null, isIpr = iprDates.has(ds)
        const isOld = ci?.old
        const bgc = vt==='first'?' fi':vt==='at'?' at':(vt==='visit'||vt==='manual')?' vi':ci?(isOld?' cho':' ch'):''
        html += `<div class="dc${bgc}${isIpr?' ipr':''}"><div class="dn ${nc}">${day}</div>`
        if (vt==='first') html += '<span class="pl pf">初回</span>'
        else if (vt==='at') html += '<span class="pl pat">AT</span>'
        else if (vt==='visit'||vt==='manual') html += '<span class="pl pv">来院</span>'
        if (ci) html += `<span class="pl ${isOld?'pco':'pc'}">${toC(ci.stg)}</span>`
        html += '</div>'
      }
      const rem = (firstDow+lastDay)%7
      if (rem !== 0) for (let r = rem; r < 7; r++) html += '<div class="dc em"></div>'
      html += '</div></div>'
    }
    html += '</div>'
    const pa = document.getElementById('print-area')
    pa.innerHTML = html; pa.style.display = 'block'
    setTimeout(() => { window.print(); setTimeout(() => { pa.style.display = 'none' }, 600) }, 200)
  }

  const months = Array.from({length:12}, (_,m) => {
    const firstDow = new Date(year,m,1).getDay()
    const lastDay  = new Date(year,m+1,0).getDate()
    const cells = []
    for (let k = 0; k < firstDow; k++) cells.push({ empty:true, key:'e'+k })
    for (let day = 1; day <= lastDay; day++) {
      const ds = year+'-'+pad(m+1)+'-'+pad(day)
      cells.push({ day, ds, dow:(firstDow+day-1)%7 })
    }
    const rem = (firstDow+lastDay)%7
    if (rem !== 0) for (let r = rem; r < 7; r++) cells.push({ empty:true, key:'e2'+r+m })
    return { m, cells }
  })

  return (
    <div className="modal-bg" id="cal-modal-bg" style={{zIndex:300}} onClick={bgClick}>
      <div className="modal cal-modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-hd" style={{flexWrap:'wrap',gap:'6px'}}>
          <div style={{fontSize:'13px',fontWeight:600,color:'#111'}}>{p.name} — スケジュール</div>
          <div style={{display:'flex',gap:'5px',alignItems:'center',flexWrap:'wrap'}}>
            <button className="btn-sm btn-sm-green" onClick={doPrint}>印刷（A4縦）</button>
            <button className="btn-sm btn-sm-blue" onClick={() => onSave(phaseNo)}>保存</button>
            <button className="btn-sm btn-sm-gray" onClick={() => { setShowAddForm(f=>!f); setShowRecalcForm(false) }}>編集</button>
            <button className="btn-sm btn-sm-orange" onClick={() => { setShowRecalcForm(f=>!f); setShowAddForm(false) }}>再計算</button>
            <button className="m-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          {/* フェーズタブ */}
          <div className="cal-phase-tabs">
            {p.phases.map((ph2, i) => (
              <div key={i} className={'cal-phase-tab'+(phaseIdx===i?' on':'')} onClick={()=>switchPhase(i)}>
                {i+1}回目
              </div>
            ))}
          </div>

          {/* 追加/編集フォーム */}
          {showAddForm && (
            phaseIdx === 0 ? (
              <PhaseForm
                title="追加アライナー情報を入力"
                submitLabel="追加する"
                onSubmit={handleAddPhase}
                onCancel={() => setShowAddForm(false)}
              />
            ) : (
              <PhaseForm
                title={`${phaseNo}回目を編集`}
                submitLabel="保存する"
                initial={ph}
                onSubmit={handleUpdatePhase}
                onCancel={() => setShowAddForm(false)}
              />
            )
          )}

          {/* 再計算フォーム */}
          {showRecalcForm && (
            <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:'10px',padding:'12px 14px',marginBottom:'10px'}}>
              <div style={{fontSize:'12px',fontWeight:600,color:'#c2410c',marginBottom:'10px'}}>途中から再計算</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                <div>
                  <label className="f-lbl">再計算するステージ番号</label>
                  <input className="f-inp" type="number" value={recalcStage} onChange={e=>setRecalcStage(e.target.value)} placeholder="例: 10" min="2" />
                  <div style={{fontSize:'10px',color:'#888',marginTop:'3px'}}>このステージ以降を再計算</div>
                </div>
                <div>
                  <label className="f-lbl">新しい開始日</label>
                  <input className="f-inp" type="date" value={recalcDate} onChange={e=>setRecalcDate(e.target.value)} />
                  <div style={{fontSize:'10px',color:'#888',marginTop:'3px'}}>このステージの実際の交換日</div>
                </div>
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <button className="btn btn-blue" style={{fontSize:'12px',padding:'6px 14px'}} onClick={handleApplyRecalc}>再計算する</button>
                <button className="btn btn-outline" style={{fontSize:'12px',padding:'6px 14px'}} onClick={() => setShowRecalcForm(false)}>キャンセル</button>
              </div>
            </div>
          )}

          {/* 再計算履歴バナー */}
          {history.length > 0 && (
            <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:'8px',padding:'8px 12px',marginBottom:'8px'}}>
              <div style={{fontSize:'11px',fontWeight:600,color:'#c2410c',marginBottom:'6px'}}>再計算履歴</div>
              {history.map((h, i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'3px',fontSize:'11px'}}>
                  <span style={{color:'#92400e'}}>{i+1}回目：</span>
                  <span style={{color:'#111'}}>{toC(h.stage)}から {h.date}〜</span>
                  {i === history.length-1 && <span className="badge" style={{background:'#fed7aa',color:'#c2410c',fontSize:'9px'}}>最新</span>}
                </div>
              ))}
              <button className="btn-sm" style={{marginTop:'6px',fontSize:'10px',color:'#dc2626',borderColor:'#fca5a5'}} onClick={handleResetRecalc}>履歴をリセット</button>
            </div>
          )}

          {/* 年ナビ */}
          <div className="cal-year-nav">
            <button className="cal-year-btn" onClick={() => setYear(y=>y-1)}>‹</button>
            <span className="cal-year-lbl">{year}年</span>
            <button className="cal-year-btn" onClick={() => setYear(y=>y+1)}>›</button>
            <span style={{fontSize:'10px',color:'#999',marginLeft:'4px'}}>日付タップで来院日オン／オフ　保存→次回来院日自動更新</span>
          </div>

          {/* 凡例 */}
          <div style={{display:'flex',gap:'10px',marginBottom:'8px',fontSize:'10px',flexWrap:'wrap',alignItems:'center'}}>
            {[
              ['#fee2e2','#dc2626','初回'],
              ...(phaseIdx===0&&ph?.at ? [['#fce7f3','#9d174d','アタッチメント']] : []),
              ['#fef9c3','#b45309','来院日'],
              ['#dbeafe','#1e40af','交換日'],
              ...(iprDates.size > 0 ? [['#fff','#1d4ed8','IPR処置ステージ',true]] : []),
              ...(hasOld ? [['#f1f5f9','#94a3b8','再計算前の交換日',false,true]] : []),
            ].map(([bg,color,label,isIpr,isOld],i) => (
              <span key={i} style={{display:'flex',alignItems:'center',gap:'4px'}}>
                <span style={{display:'inline-block',width:'12px',height:'12px',background:bg,borderRadius:'2px',
                  border:isIpr?'2px solid #1d4ed8':isOld?'1px solid #cbd5e1':'none'}}></span>
                <span style={{color,fontWeight:700}}>{label}</span>
              </span>
            ))}
          </div>

          {/* カレンダー */}
          <div className="cal-months-grid">
            {months.map(({m, cells}) => (
              <div key={m} className="cal-month-box">
                <div className="cal-month-title">{m+1}月</div>
                <div className="cal-dow-row">
                  {dows.map((d,i) => <div key={i} className="cal-dow-cell" style={{color:i===0?'#dc2626':i===6?'#2563eb':'#888'}}>{d}</div>)}
                </div>
                <div className="cal-day-row">
                  {cells.map((cell, idx) => {
                    if (cell.empty) return <div key={cell.key||idx} className="cal-day-cell empty" />
                    const { day, ds, dow } = cell
                    const nc = dow===0?'sun':dow===6?'sat':''
                    const vt = vd[ds]||null
                    const ci = changeDates[ds]||null
                    const isIpr = iprDates.has(ds)
                    const isOld = ci?.old
                    const bgCls = vt==='first'?' bg-first':vt==='at'?' bg-at':(vt==='visit'||vt==='manual')?' bg-visit':ci?(isOld?' bg-chg-old':' bg-chg'):''
                    return (
                      <div key={ds} className={'cal-day-cell'+bgCls}
                        style={isIpr?{outline:'2px solid #1d4ed8',outlineOffset:'-2px'}:undefined}
                        onClick={() => onToggleVisit(phaseNo, ds)}>
                        <div className={'cal-day-num '+nc}>{day}</div>
                        {vt==='first' && <span className="cal-ev ev-first">初回</span>}
                        {vt==='at' && <span className="cal-ev ev-at" style={{fontSize:'6px'}}>アタッチメント</span>}
                        {(vt==='visit'||vt==='manual') && <span className="cal-ev ev-visit">来院</span>}
                        {ci && <span className={'cal-ev '+(isOld?'ev-chg-old':'ev-chg')}>{toC(ci.stg)}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
