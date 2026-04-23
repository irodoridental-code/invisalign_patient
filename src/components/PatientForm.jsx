import { useState } from 'react'

const CIRC = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳','㉑','㉒','㉓','㉔','㉕','㉖','㉗','㉘','㉙','㉚','㉛','㉜','㉝','㉞','㉟','㊱','㊲','㊳','㊴','㊵','㊶','㊷','㊸','㊹','㊺','㊻','㊼','㊽','㊾','㊿']
function toC(n) { return n >= 1 && n <= 50 ? CIRC[n - 1] : '(' + n + ')' }

export default function PatientForm({ doctors, onSubmit, onCancel, initial = null }) {
  const [name, setName]   = useState(initial?.name || '')
  const [chart, setChart] = useState(initial?.chart || '')
  const [dob, setDob]     = useState(initial?.dob === '—' ? '' : (initial?.dob || ''))
  const [type, setType]   = useState(initial?.type || 'adult')
  const [doc, setDoc]     = useState(initial?.doc || '')
  const [total, setTotal] = useState(initial?.total || '')
  const [cur, setCur]     = useState(initial?.cur || '')
  const [start, setStart] = useState(initial?.start || '')
  const [next, setNext]   = useState(initial?.next || '')
  const [cyc, setCyc]     = useState(initial?.cyc || '7')
  const [notes, setNotes] = useState(initial?.notes || '')

  // IPR
  const [confirmedTotal, setConfirmedTotal] = useState(initial?.total || null)
  const [iprStages, setIprStages] = useState(initial?.ipr_stages || [])

  function handleConfirmTotal() {
    const n = parseInt(total)
    if (!n || n < 1) { alert('総アライナー枚数を先に入力してください'); return }
    setConfirmedTotal(n)
    setIprStages(prev => prev.filter(s => s <= n))
  }

  function toggleIpr(stage) {
    setIprStages(prev =>
      prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage].sort((a, b) => a - b)
    )
  }

  async function handleSubmit() {
    if (!name)                   { alert('患者名を入力してください'); return }
    if (!chart || isNaN(+chart)) { alert('カルテ番号を数字で入力してください'); return }
    if (!total || +total < 1)    { alert('総アライナー枚数を入力してください'); return }
    const p = {
      id: initial?.id,
      chart, name, dob: dob || '—',
      total: parseInt(total),
      cur: Math.min(parseInt(cur) || 1, parseInt(total)),
      start: start || new Date().toISOString().split('T')[0],
      next: next || '', cyc, type,
      doc: type === 'pedo' ? doc : '',
      notes,
      ipr_stages: iprStages,
    }
    await onSubmit(p)
  }

  const docOpts = [{ l: '担当なし', v: '' }, ...doctors.map(d => ({ l: d, v: d }))]

  return (
    <div className="form-wrap">
      <div className="f-sec" style={{marginTop:0}}>基本情報</div>
      <div className="f-grid">
        <div>
          <label className="f-lbl">患者名（カタカナ）</label>
          <input className="f-inp" value={name} onChange={e => setName(e.target.value)} placeholder="ヤマダ ハナコ" />
        </div>
        <div>
          <label className="f-lbl">カルテ番号（数字のみ）</label>
          <input className="f-inp" type="number" value={chart} onChange={e => setChart(e.target.value)} placeholder="1001" min="1" />
        </div>
        <div>
          <label className="f-lbl">生年月日（任意）</label>
          <input className="f-inp" type="date" value={dob} onChange={e => setDob(e.target.value)} />
        </div>
      </div>

      <div className="f-sec">区分</div>
      <label className="f-lbl">矯正の種別</label>
      <div className="seg">
        <div className={'seg-item' + (type === 'adult' ? ' sel-adult' : '')} onClick={() => setType('adult')}>成人矯正</div>
        <div className={'seg-item' + (type === 'pedo'  ? ' sel-pedo'  : '')} onClick={() => setType('pedo')}>小児矯正</div>
      </div>
      {type === 'pedo' && (
        <div style={{marginTop:'10px'}}>
          <label className="f-lbl">小児矯正担当</label>
          <div className="seg">
            {docOpts.map(o => (
              <div key={o.v}
                className={'seg-item' + (doc === o.v ? (o.v === '' ? ' sel-nodoc' : ' sel-doc') : '')}
                onClick={() => setDoc(o.v)}
              >{o.l}</div>
            ))}
          </div>
        </div>
      )}

      <div className="f-sec">治療情報</div>
      <div className="f-grid">
        {/* 総アライナー枚数 ＋ 決定ボタン */}
        <div style={{gridColumn:'1/-1'}}>
          <label className="f-lbl">総アライナー枚数</label>
          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
            <input
              className="f-inp"
              type="number"
              value={total}
              onChange={e => { setTotal(e.target.value); setConfirmedTotal(null) }}
              placeholder="20" min="1" max="60"
              style={{maxWidth:'140px'}}
            />
            <button className="btn btn-blue" style={{fontSize:'12px', padding:'7px 14px', whiteSpace:'nowrap'}} onClick={handleConfirmTotal}>
              決定
            </button>
            {confirmedTotal && (
              <span style={{fontSize:'11px', color:'#166534', fontWeight:600}}>✓ {confirmedTotal}枚で確定</span>
            )}
          </div>
        </div>

        {/* IPR ステージ選択（決定後に表示）：丸数字 */}
        {confirmedTotal && (
          <div style={{gridColumn:'1/-1'}}>
            <label className="f-lbl" style={{marginBottom:'6px'}}>
              IPR処置ステージ
              <span style={{fontSize:'10px', color:'#888', fontWeight:400, marginLeft:'6px'}}>
                処置が必要なステージをタップして選択
              </span>
            </label>
            <div style={{display:'flex', flexWrap:'wrap', gap:'5px'}}>
              {Array.from({length: confirmedTotal}, (_, i) => i + 1).map(stage => {
                const sel = iprStages.includes(stage)
                return (
                  <button
                    key={stage}
                    onClick={() => toggleIpr(stage)}
                    title={'ステージ' + stage}
                    style={{
                      minWidth:'34px', height:'34px', padding:'0 4px',
                      borderRadius:'6px',
                      border: sel ? '2px solid #1d4ed8' : '1px solid #ccc',
                      background: sel ? '#dbeafe' : '#f9f9f8',
                      color: sel ? '#1e40af' : '#666',
                      fontWeight: sel ? 700 : 400,
                      fontSize:'13px',
                      cursor:'pointer',
                      transition:'all .12s',
                    }}
                  >
                    {toC(stage)}
                  </button>
                )
              })}
            </div>
            {iprStages.length > 0 && (
              <div style={{marginTop:'6px', fontSize:'11px', color:'#1e40af', fontWeight:600}}>
                選択中：{iprStages.map(toC).join('・')}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="f-lbl">現在のアライナー番号</label>
          <input className="f-inp" type="number" value={cur} onChange={e => setCur(e.target.value)} placeholder="1" min="1" max="60" />
        </div>
        <div>
          <label className="f-lbl">治療開始日</label>
          <input className="f-inp" type="date" value={start} onChange={e => setStart(e.target.value)} />
        </div>
        <div>
          <label className="f-lbl">次回来院日</label>
          <input className="f-inp" type="date" value={next} onChange={e => setNext(e.target.value)} />
        </div>
        <div style={{gridColumn:'1/-1'}}>
          <label className="f-lbl">交換サイクル</label>
          <div className="seg">
            <div className={'seg-item' + (cyc === '7' ? ' sel-c7' : '')} onClick={() => setCyc('7')}>1週間交換（7日）</div>
            <div className={'seg-item' + (cyc === '5' ? ' sel-c5' : '')} onClick={() => setCyc('5')}>5日交換</div>
          </div>
        </div>
      </div>

      <div style={{marginTop:'10px'}}>
        <label className="f-lbl">備考</label>
        <textarea className="f-inp" rows="3" style={{resize:'vertical'}} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <div style={{display:'flex', gap:'8px', marginTop:'12px'}}>
        <button className="btn btn-blue" onClick={handleSubmit}>{initial ? '変更を保存' : '患者を登録する'}</button>
        <button className="btn btn-outline" onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  )
}
