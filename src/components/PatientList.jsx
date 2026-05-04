import { useState } from 'react'

const CIRC = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳','㉑','㉒','㉓','㉔','㉕','㉖','㉗','㉘','㉙','㉚']
function toC(n) { return n >= 1 && n <= 30 ? CIRC[n-1] : '('+n+')' }

function bType(t) { return t==='pedo'?<span className="badge b-pedo">小児矯正</span>:<span className="badge b-adult">成人矯正</span> }
function bCyc(c)  { return c==='5'?<span className="badge b-c5">5日</span>:<span className="badge b-c7">7日</span> }
function bDoc(d)  { return d?<span className="badge b-doc">{d}</span>:<span style={{fontSize:'10px',color:'#bbb'}}>—</span> }

function getNext(p, visitDates) {
  const lp = p.phases[p.phases.length - 1]
  const vd = (visitDates[p.id] || {})[lp?.phaseNo] || {}
  const today = new Date().toISOString().split('T')[0]
  return Object.keys(vd).filter(k => (vd[k]==='visit'||vd[k]==='manual') && k >= today).sort()[0] || ''
}

export default function PatientList({ patients, visitDates={}, onOpenModal, onOpenCal, onOpenAddAligner, onDelete }) {
  const [tab, setTab]   = useState('all')
  const [q, setQ]       = useState('')
  const [sKey, setSKey] = useState('chart')
  const [sDir, setSDir] = useState('asc')

  function doSort(k) {
    if (sKey === k) setSDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSKey(k); setSDir('asc') }
  }

  const now = new Date()
  const totalCount = patients.length
  const adultCount = patients.filter(p => p.type === 'adult').length
  const pedoCount  = patients.filter(p => p.type === 'pedo').length
  const monthCount = patients.filter(p => {
    const n = getNext(p, visitDates)
    if (!n) return false
    const d = new Date(n)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  const list = patients
    .filter(p => (p.name.toLowerCase().includes(q.toLowerCase()) || p.chart.includes(q)) && (tab === 'all' || p.type === tab))
    .sort((a, b) => {
      const lpa = a.phases[a.phases.length-1] || {}
      const lpb = b.phases[b.phases.length-1] || {}
      let va, vb
      if (sKey === 'name')   { va = a.name; vb = b.name }
      else if (sKey === 'doc')  { va = a.doc||''; vb = b.doc||'' }
      else if (sKey === 'prog') { va = lpa.cur/lpa.total||0; vb = lpb.cur/lpb.total||0 }
      else if (sKey === 'next') { va = getNext(a,visitDates)||'9999'; vb = getNext(b,visitDates)||'9999' }
      else { va = +a.chart; vb = +b.chart }
      return va < vb ? (sDir==='asc'?-1:1) : va > vb ? (sDir==='asc'?1:-1) : 0
    })

  function SortBtn({ k, label }) {
    const active = sKey === k
    return (
      <button className={'sort-btn'+(active?' '+sDir:'')} onClick={() => doSort(k)}>{label}</button>
    )
  }

  return (
    <>
      <div className="stats">
        <div className="stat"><div className="stat-lbl">総患者数</div><div className="stat-val">{totalCount}</div><div className="stat-sub">登録済み</div></div>
        <div className="stat"><div className="stat-lbl">成人矯正</div><div className="stat-val">{adultCount}</div><div className="stat-sub">成人患者</div></div>
        <div className="stat"><div className="stat-lbl">小児矯正</div><div className="stat-val">{pedoCount}</div><div className="stat-sub">小児患者</div></div>
        <div className="stat"><div className="stat-lbl">今月の来院</div><div className="stat-val">{monthCount}</div><div className="stat-sub">予定あり</div></div>
      </div>
      <div className="filter-row">
        <div className="tabs">
          {['all','adult','pedo'].map(t => (
            <button key={t} className={'tab'+(tab===t?' on':'')} onClick={() => setTab(t)}>
              {t==='all'?'すべて':t==='adult'?'成人矯正':'小児矯正'}
            </button>
          ))}
        </div>
        <input className="search-inp" value={q} onChange={e=>setQ(e.target.value)} placeholder="患者名・カルテ番号で検索..." />
      </div>
      <div className="tbl-wrap"><div className="tbl">
        <div className="tbl-hd">
          <div><SortBtn k="chart" label="カルテ番号" /></div>
          <div><SortBtn k="name" label="患者名" /></div>
          <div>区分</div>
          <div><SortBtn k="doc" label="担当" /></div>
          <div>交換</div>
          <div><SortBtn k="prog" label="進捗" /></div>
          <div><SortBtn k="next" label="次回来院日" /></div>
          <div>操作</div>
        </div>
        {list.length === 0 && <div style={{padding:'20px',textAlign:'center',color:'#bbb',fontSize:'12px'}}>患者が見つかりません</div>}
        {list.map(p => {
          const lp = p.phases[p.phases.length-1] || {}
          const pct = lp.total ? Math.round(lp.cur/lp.total*100) : 0
          const nxt = getNext(p, visitDates)
          const hasExtra = p.phases.length > 1
          return (
            <div key={p.id} className="tbl-row" onClick={() => onOpenModal(p)}>
              <div style={{fontWeight:600,color:'#555',fontSize:'11px'}}>{p.chart}</div>
              <div style={{fontWeight:600,color:'#111',fontSize:'11px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {p.name}
                {hasExtra && <span className="badge b-add" style={{marginLeft:'4px'}}>追加アライナー</span>}
              </div>
              <div>{bType(p.type)}</div>
              <div>{bDoc(p.doc)}</div>
              <div>{bCyc(lp.cyc||'7')}</div>
              <div>
                <div style={{fontSize:'10px',color:'#888'}}>{lp.cur}/{lp.total} ({pct}%)</div>
                <div className="prog"><div className="prog-fill" style={{width:pct+'%'}}></div></div>
              </div>
              <div style={{fontSize:'10px',color:nxt?'#111':'#bbb'}}>{nxt||'—'}</div>
              <div className="cell-ops">
                <button className="btn-sm" onClick={e=>{e.stopPropagation();onOpenModal(p)}}>編集</button>
                <button className="btn-sm-green" onClick={e=>{e.stopPropagation();onOpenCal(p)}}>📅</button>
                <button className="btn-sm-gray" onClick={e=>{e.stopPropagation();onOpenAddAligner(p)}}>＋追加アライナー</button>
                <button className="btn-sm" style={{color:'#dc2626',borderColor:'#fca5a5'}} onClick={e=>{e.stopPropagation();if(confirm(p.name+'を削除しますか？この操作は取り消せません。'))onDelete(p.id)}}>削除</button>
              </div>
            </div>
          )
        })}
      </div></div>
    </>
  )
}
