import { useState } from 'react'

const CIRC = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳','㉑','㉒','㉓','㉔','㉕','㉖','㉗','㉘','㉙','㉚','㉛','㉜','㉝','㉞','㉟','㊱','㊲','㊳','㊴','㊵','㊶','㊷','㊸','㊹','㊺','㊻','㊼','㊽','㊾','㊿']

function bType(t) { return t === 'pedo' ? <span className="badge b-pedo">小児矯正</span> : <span className="badge b-adult">成人矯正</span> }
function bCyc(c) { return c === '5' ? <span className="badge b-c5">5日</span> : <span className="badge b-c7">7日</span> }
function bDoc(d) { return d ? <span className="badge b-doc">{d}</span> : <span style={{fontSize:'10px',color:'#bbb'}}>—</span> }

export default function PatientList({ patients, onOpenModal, onOpenCal }) {
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState('chart')
  const [sortDir, setSortDir] = useState('asc')

  function doSort(k) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  const filtered = patients
    .filter(p => {
      const mq = p.name.toLowerCase().includes(q.toLowerCase()) || p.chart.includes(q)
      const mt = tab === 'all' || p.type === tab
      return mq && mt
    })
    .sort((a, b) => {
      let va, vb
      if (sortKey === 'name') { va = a.name; vb = b.name }
      else if (sortKey === 'doc') { va = a.doc || ''; vb = b.doc || '' }
      else if (sortKey === 'prog') { va = a.cur / a.total; vb = b.cur / b.total }
      else if (sortKey === 'next') { va = a.next || '9999'; vb = b.next || '9999' }
      else { va = +a.chart; vb = +b.chart }
      return va < vb ? (sortDir === 'asc' ? -1 : 1) : va > vb ? (sortDir === 'asc' ? 1 : -1) : 0
    })

  const now = new Date(); const y = now.getFullYear(); const m = now.getMonth()
  const statAdult = patients.filter(p => p.type === 'adult').length
  const statPedo = patients.filter(p => p.type === 'pedo').length
  const statMonth = patients.filter(p => { if (!p.next) return false; const d = new Date(p.next); return d.getFullYear() === y && d.getMonth() === m }).length

  function SortBtn({ k, label }) {
    const cls = 'sort-btn' + (sortKey === k ? ' ' + sortDir : '')
    return <button className={cls} onClick={() => doSort(k)}>{label}</button>
  }

  return (
    <>
      <div className="stats">
        <div className="stat"><div className="stat-lbl">総患者数</div><div className="stat-val">{patients.length}</div><div className="stat-sub">登録済み</div></div>
        <div className="stat"><div className="stat-lbl">成人矯正</div><div className="stat-val">{statAdult}</div><div className="stat-sub">成人患者</div></div>
        <div className="stat"><div className="stat-lbl">小児矯正</div><div className="stat-val">{statPedo}</div><div className="stat-sub">小児患者</div></div>
        <div className="stat"><div className="stat-lbl">今月の来院</div><div className="stat-val">{statMonth}</div><div className="stat-sub">予定あり</div></div>
      </div>

      <div className="filter-row">
        <div className="tabs">
          {['all','adult','pedo'].map(t => (
            <button key={t} className={'tab' + (tab === t ? ' on' : '')} onClick={() => setTab(t)}>
              {t === 'all' ? 'すべて' : t === 'adult' ? '成人矯正' : '小児矯正'}
            </button>
          ))}
        </div>
        <input className="search-inp" type="text" placeholder="患者名・カルテ番号で検索..." value={q} onChange={e => setQ(e.target.value)} />
      </div>

      <div className="tbl-wrap">
        <div className="tbl">
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
          {filtered.length === 0 && <div style={{padding:'20px',textAlign:'center',color:'#bbb',fontSize:'12px'}}>患者が見つかりません</div>}
          {filtered.map(p => {
            const pct = Math.round(p.cur / p.total * 100)
            return (
              <div key={p.id} className="tbl-row" onClick={() => onOpenModal(p)}>
                <div style={{fontWeight:600,color:'#555',fontSize:'11px'}}>{p.chart}</div>
                <div style={{fontWeight:600,color:'#111',fontSize:'11px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                <div>{bType(p.type)}</div>
                <div>{bDoc(p.doc)}</div>
                <div>{bCyc(p.cyc)}</div>
                <div>
                  <div style={{fontSize:'10px',color:'#888'}}>{p.cur}/{p.total} ({pct}%)</div>
                  <div className="prog"><div className="prog-fill" style={{width:pct+'%'}} /></div>
                </div>
                <div style={{fontSize:'10px',color:p.next?'#111':'#bbb'}}>{p.next || '—'}</div>
                <div className="cell-ops">
                  <button className="btn-sm" onClick={e => { e.stopPropagation(); onOpenModal(p) }}>詳細</button>
                  <button className="btn-sm-green" onClick={e => { e.stopPropagation(); onOpenCal(p) }}>📅</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
