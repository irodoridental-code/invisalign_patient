import { useState } from 'react'
import PatientForm from './PatientForm'

const CIRC = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳','㉑','㉒','㉓','㉔','㉕','㉖','㉗','㉘','㉙','㉚','㉛','㉜','㉝','㉞','㉟','㊱','㊲','㊳','㊴','㊵','㊶','㊷','㊸','㊹','㊺','㊻','㊼','㊽','㊾','㊿']
function toC(n) { return n >= 1 && n <= 50 ? CIRC[n-1] : '('+n+')' }
function toKatakana(v) { return v.replace(/[\u3041-\u3096]/g, c => String.fromCharCode(c.charCodeAt(0)+0x60)) }

function bType(t) {
  return t === 'pedo'
    ? <span className="badge b-pedo">小児矯正</span>
    : <span className="badge b-adult">成人矯正</span>
}

export default function PatientModal({ patient, doctors, onClose, onUpdate, onUpdatePhase, onOpenCal }) {
  const [editing, setEditing] = useState(false)

  function bgClick(e) { if (e.target.id === 'modal-bg') onClose() }

  const p  = patient
  const ph = p.phases?.[0]

  return (
    <div className="modal-bg" id="modal-bg" onClick={bgClick}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-hd">
          <div>
            <div style={{fontSize:'13px',fontWeight:600,color:'#111'}}>{p.name}</div>
            <div style={{fontSize:'10px',color:'#999',marginTop:'2px'}}>
              カルテ番号 {p.chart} · {p.type==='pedo'?'小児矯正':'成人矯正'} · {ph?.cyc==='5'?'5日交換':'1週間交換'}
              {p.type==='pedo'&&p.doc?' · 担当：'+p.doc:''}
            </div>
          </div>
          <div style={{display:'flex',gap:'5px',alignItems:'center'}}>
            <button className="btn-sm btn-sm-green" onClick={() => onOpenCal(p)}>カレンダー</button>
            <button className="m-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          {/* 編集フォーム（常に表示） */}
          <PatientForm
            initial={p}
            doctors={doctors}
            onSubmit={async (updated) => { await onUpdate(updated); onClose() }}
            onCancel={onClose}
          />

          {/* 追加アライナー情報 */}
          {p.phases?.length > 1 && (
            <>
              {p.phases.slice(1).map((ph2, i) => {
                const pi = i + 1
                const iprTxt = ph2.ipr_stages?.length ? ph2.ipr_stages.map(toC).join('・') : 'なし'
                return (
                  <div key={pi} style={{marginTop:'12px',paddingTop:'12px',borderTop:'1px solid #eee'}}>
                    <div style={{fontSize:'10px',fontWeight:600,color:'#999',marginBottom:'6px'}}>
                      {pi+1}回目（追加アライナー）
                      <button className="btn-sm" style={{marginLeft:'8px',fontSize:'10px'}} onClick={() => onOpenCal(p)}>カレンダーで編集</button>
                    </div>
                    <div className="d-grid">
                      <div className="d-field"><div className="d-lbl">総枚数</div><div className="d-val">{ph2.total}枚</div></div>
                      <div className="d-field"><div className="d-lbl">現在</div><div className="d-val">{ph2.cur}枚目</div></div>
                      <div className="d-field"><div className="d-lbl">開始日</div><div className="d-val">{ph2.start}</div></div>
                      <div className="d-field"><div className="d-lbl">サイクル</div><div className="d-val">{ph2.cyc==='5'?'5日':'7日'}</div></div>
                      <div className="d-field" style={{gridColumn:'1/-1'}}><div className="d-lbl">IPRステージ</div><div className="d-val">{iprTxt}</div></div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
