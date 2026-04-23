import { useState } from 'react'

const CIRC = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳','㉑','㉒','㉓','㉔','㉕','㉖','㉗','㉘','㉙','㉚','㉛','㉜','㉝','㉞','㉟','㊱','㊲','㊳','㊴','㊵','㊶','㊷','㊸','㊹','㊺','㊻','㊼','㊽','㊾','㊿']
function toC(n) { return n >= 1 && n <= 50 ? CIRC[n - 1] : '(' + n + ')' }
function pad(n) { return n < 10 ? '0' + n : '' + n }
function fmtDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }

function buildChangeDates(p) {
  const set = {}
  const start = new Date(p.start)
  if (isNaN(start.getTime())) return set
  const days = parseInt(p.cyc)
  for (let i = 0; i < p.total; i++) {
    const d = new Date(start.getTime() + i * days * 86400000)
    set[fmtDate(d)] = i + 1
  }
  return set
}

export default function CalendarModal({ patient: p, visitDates: vd, onClose, onToggleVisit, onSave }) {
  const [year, setYear] = useState(() => {
    const s = new Date(p.start)
    return isNaN(s.getTime()) ? new Date().getFullYear() : s.getFullYear()
  })

  const changeDates = buildChangeDates(p)
  const dows = ['日','月','火','水','木','金','土']

  function bgClick(e) { if (e.target.id === 'cal-modal-bg') onClose() }

  function doPrint() {
    const html = buildPrintHTML()
    const pa = document.getElementById('print-area')
    pa.innerHTML = html
    pa.style.display = 'block'
    setTimeout(() => { window.print(); setTimeout(() => { pa.style.display = 'none' }, 600) }, 200)
  }

  function buildPrintHTML() {
    let html = `<style>
@page{size:A4 portrait;margin:5mm}body{font-family:sans-serif;margin:0;padding:0}
.pt{text-align:center;font-size:11px;font-weight:700;margin-bottom:4px}
.mg{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.mb{border:1px solid #ccc;border-radius:3px;overflow:hidden;page-break-inside:avoid}
.mt{background:#eee;font-size:8px;font-weight:700;text-align:center;padding:2px;border-bottom:1px solid #ccc}
.dr{display:grid;grid-template-columns:repeat(7,1fr)}
.dw{text-align:center;font-size:6px;font-weight:600;color:#888;padding:1px 0;background:#f5f5f5;border-bottom:1px solid #eee}
.dc{border-right:1px solid #eee;border-bottom:1px solid #eee;height:34px;overflow:hidden;display:flex;flex-direction:column;background:#fff}
.dc:nth-child(7n){border-right:none}.dc.em{background:#fafafa}
.dc.fi{background:#fee2e2}.dc.vi{background:#fef9c3}.dc.ch{background:#dbeafe}
.dn{font-size:6.5px;font-weight:600;color:#555;padding:1px 2px 0;text-align:left;line-height:1.2;flex-shrink:0}
.dn.sun{color:#dc2626}.dn.sat{color:#2563eb}
.pl{font-size:6px;font-weight:700;display:block;text-align:center;line-height:1.5;width:100%;flex-shrink:0}
.pf{color:#dc2626}.pv{color:#b45309}.pc{color:#1e40af}
</style><div class="pt">${p.name}さん</div><div class="mg">`

    for (let m = 0; m < 12; m++) {
      const firstDow = new Date(year, m, 1).getDay()
      const lastDay = new Date(year, m + 1, 0).getDate()
      html += `<div class="mb"><div class="mt">${m + 1}月</div><div class="dr">`
      dows.forEach((d, i) => { html += `<div class="dw" style="color:${i===0?'#dc2626':i===6?'#2563eb':'#888'}">${d}</div>` })
      for (let k = 0; k < firstDow; k++) html += '<div class="dc em"></div>'
      for (let day = 1; day <= lastDay; day++) {
        const ds = year + '-' + pad(m + 1) + '-' + pad(day)
        const dow = (firstDow + day - 1) % 7
        const nc = dow === 0 ? 'sun' : dow === 6 ? 'sat' : ''
        const vt = vd[ds] || null
        const chg = changeDates[ds] || null
        const bgc = vt === 'first' ? ' fi' : (vt === 'visit' || vt === 'manual') ? ' vi' : chg ? ' ch' : ''
        html += `<div class="dc${bgc}"><div class="dn ${nc}">${day}</div>`
        if (vt === 'first') html += '<span class="pl pf">初回</span>'
        else if (vt === 'visit' || vt === 'manual') html += '<span class="pl pv">来院</span>'
        if (chg) html += `<span class="pl pc">${toC(chg)}</span>`
        html += '</div>'
      }
      const rem = (firstDow + lastDay) % 7
      if (rem !== 0) for (let r = rem; r < 7; r++) html += '<div class="dc em"></div>'
      html += '</div></div>'
    }
    html += '</div>'
    return html
  }

  const months = Array.from({ length: 12 }, (_, m) => {
    const firstDow = new Date(year, m, 1).getDay()
    const lastDay = new Date(year, m + 1, 0).getDate()
    const cells = []
    for (let k = 0; k < firstDow; k++) cells.push({ empty: true, key: 'e' + k })
    for (let day = 1; day <= lastDay; day++) {
      const ds = year + '-' + pad(m + 1) + '-' + pad(day)
      const dow = (firstDow + day - 1) % 7
      cells.push({ day, ds, dow })
    }
    const rem = (firstDow + lastDay) % 7
    if (rem !== 0) for (let r = rem; r < 7; r++) cells.push({ empty: true, key: 'e2' + r + m })
    return { m, cells }
  })

  return (
    <div className="modal-bg" id="cal-modal-bg" style={{zIndex:300}} onClick={bgClick}>
      <div className="modal cal-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <div id="cal-title" style={{fontSize:'13px',fontWeight:600,color:'#111'}}>{p.name} — スケジュール</div>
          <div style={{display:'flex',gap:'5px',alignItems:'center'}}>
            <button className="btn-sm btn-sm-green" onClick={doPrint}>印刷（A4縦）</button>
            <button className="btn-sm btn-sm-blue" onClick={onSave}>保存</button>
            <button className="m-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          <div className="cal-year-nav">
            <button className="cal-year-btn" onClick={() => setYear(y => y - 1)}>‹</button>
            <span className="cal-year-lbl">{year}年</span>
            <button className="cal-year-btn" onClick={() => setYear(y => y + 1)}>›</button>
            <span style={{fontSize:'10px',color:'#999',marginLeft:'4px'}}>日付タップで来院日オン／オフ　保存→次回来院日自動更新</span>
          </div>
          <div style={{display:'flex',gap:'12px',marginBottom:'8px',fontSize:'10px',flexWrap:'wrap',alignItems:'center'}}>
            <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{display:'inline-block',width:'12px',height:'12px',background:'#fee2e2',borderRadius:'2px'}}></span><span style={{color:'#dc2626',fontWeight:700}}>初回</span></span>
            <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{display:'inline-block',width:'12px',height:'12px',background:'#fef9c3',borderRadius:'2px'}}></span><span style={{color:'#b45309',fontWeight:700}}>来院日（タップで設定）</span></span>
            <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{display:'inline-block',width:'12px',height:'12px',background:'#dbeafe',borderRadius:'2px'}}></span><span style={{color:'#1e40af',fontWeight:700}}>交換日</span></span>
          </div>
          <div className="cal-months-grid">
            {months.map(({ m, cells }) => (
              <div key={m} className="cal-month-box">
                <div className="cal-month-title">{m + 1}月</div>
                <div className="cal-dow-row">
                  {dows.map((d, i) => <div key={i} className="cal-dow-cell" style={{color:i===0?'#dc2626':i===6?'#2563eb':'#888'}}>{d}</div>)}
                </div>
                <div className="cal-day-row">
                  {cells.map((cell, idx) => {
                    if (cell.empty) return <div key={cell.key || idx} className="cal-day-cell empty" />
                    const { day, ds, dow } = cell
                    const nc = dow === 0 ? 'sun' : dow === 6 ? 'sat' : ''
                    const vt = vd[ds] || null
                    const chg = changeDates[ds] || null
                    const bgCls = vt === 'first' ? ' bg-first' : (vt === 'visit' || vt === 'manual') ? ' bg-visit' : chg ? ' bg-chg' : ''
                    return (
                      <div key={ds} className={'cal-day-cell' + bgCls} onClick={() => onToggleVisit(ds)}>
                        <div className={'cal-day-num ' + nc}>{day}</div>
                        {vt === 'first' && <span className="cal-ev ev-first">初回</span>}
                        {(vt === 'visit' || vt === 'manual') && <span className="cal-ev ev-visit">来院</span>}
                        {chg && <span className="cal-ev ev-chg">{chg}</span>}
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
