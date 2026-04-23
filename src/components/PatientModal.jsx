import { useState } from 'react'
import PatientForm from './PatientForm'

function bType(t) { return t === 'pedo' ? <span className="badge b-pedo">小児矯正</span> : <span className="badge b-adult">成人矯正</span> }

export default function PatientModal({ patient, doctors, onClose, onUpdate, onOpenCal }) {
  const [editing, setEditing] = useState(false)

  function bgClick(e) { if (e.target.id === 'modal-bg') onClose() }

  const p = patient
  const pct = Math.round(p.cur / p.total * 100)
  const chips = Array.from({ length: p.total }, (_, i) => {
    const n = i + 1; const c = n < p.cur ? 'done' : n === p.cur ? 'cur' : ''
    return <div key={n} className={'chip ' + c}>{n}</div>
  })

  return (
    <div className="modal-bg" id="modal-bg" onClick={bgClick}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <div>
            <div style={{fontSize:'13px',fontWeight:600,color:'#111'}}>{p.name}</div>
            <div style={{fontSize:'10px',color:'#999',marginTop:'2px'}}>
              カルテ番号 {p.chart} · {p.type === 'pedo' ? '小児矯正' : '成人矯正'} · {p.cyc === '5' ? '5日交換' : '1週間交換'}
              {p.type === 'pedo' && p.doc ? ' · 担当：' + p.doc : ''}
            </div>
          </div>
          <div style={{display:'flex',gap:'5px',alignItems:'center'}}>
            {!editing && <button className="btn-sm btn-sm-green" onClick={() => onOpenCal(p)}>カレンダー</button>}
            <button className="btn-sm" onClick={() => setEditing(e => !e)}>{editing ? 'キャンセル' : '編集'}</button>
            <button className="m-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          {editing ? (
            <PatientForm
              initial={p}
              doctors={doctors}
              onSubmit={async (updated) => { await onUpdate(updated); setEditing(false) }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              <div className="d-sec">基本情報</div>
              <div className="d-grid">
                <div className="d-field"><div className="d-lbl">カルテ番号</div><div className="d-val">{p.chart}</div></div>
                <div className="d-field"><div className="d-lbl">生年月日</div><div className="d-val">{p.dob}</div></div>
                <div className="d-field"><div className="d-lbl">区分</div><div className="d-val">{bType(p.type)}</div></div>
                <div className="d-field"><div className="d-lbl">交換サイクル</div><div className="d-val">{p.cyc === '5' ? '5日交換' : '1週間交換（7日）'}</div></div>
                {p.type === 'pedo' && <div className="d-field"><div className="d-lbl">小児矯正担当</div><div className="d-val">{p.doc || '担当なし'}</div></div>}
              </div>
              <div className="d-sec">治療情報</div>
              <div className="d-grid">
                <div className="d-field"><div className="d-lbl">進捗</div><div className="d-val">{p.cur}枚目 / {p.total}枚 ({pct}%)</div></div>
                <div className="d-field"><div className="d-lbl">治療開始日</div><div className="d-val">{p.start}</div></div>
                <div className="d-field"><div className="d-lbl">次回来院</div><div className="d-val">{p.next || '未設定'}</div></div>
              </div>
              <div className="d-sec">アライナー進捗タイムライン</div>
              <div className="chip-row">{chips}</div>
              <div style={{display:'flex',gap:'8px',marginTop:'6px',fontSize:'10px',color:'#888'}}>
                <span style={{display:'flex',alignItems:'center',gap:'3px'}}><span style={{width:'10px',height:'10px',borderRadius:'3px',background:'#dcfce7',border:'1px solid #86efac',display:'inline-block'}}></span>完了</span>
                <span style={{display:'flex',alignItems:'center',gap:'3px'}}><span style={{width:'10px',height:'10px',borderRadius:'3px',background:'#dbeafe',border:'1px solid #93c5fd',display:'inline-block'}}></span>現在</span>
                <span style={{display:'flex',alignItems:'center',gap:'3px'}}><span style={{width:'10px',height:'10px',borderRadius:'3px',background:'#fff',border:'1px solid #ccc',display:'inline-block'}}></span>予定</span>
              </div>
              {p.notes && <><div className="d-sec">備考</div><div style={{fontSize:'12px',color:'#555'}}>{p.notes}</div></>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
