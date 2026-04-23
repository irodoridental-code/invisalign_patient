import { useState } from 'react'

export default function PatientForm({ doctors, onSubmit, onCancel, initial = null }) {
  const [name, setName] = useState(initial?.name || '')
  const [chart, setChart] = useState(initial?.chart || '')
  const [dob, setDob] = useState(initial?.dob === '—' ? '' : (initial?.dob || ''))
  const [type, setType] = useState(initial?.type || 'adult')
  const [doc, setDoc] = useState(initial?.doc || '')
  const [total, setTotal] = useState(initial?.total || '')
  const [cur, setCur] = useState(initial?.cur || '')
  const [start, setStart] = useState(initial?.start || '')
  const [next, setNext] = useState(initial?.next || '')
  const [cyc, setCyc] = useState(initial?.cyc || '7')
  const [notes, setNotes] = useState(initial?.notes || '')

  async function handleSubmit() {
    if (!name) { alert('患者名を入力してください'); return }
    if (!chart || isNaN(+chart)) { alert('カルテ番号を数字で入力してください'); return }
    if (!total || +total < 1) { alert('総アライナー枚数を入力してください'); return }
    const p = {
      id: initial?.id,
      chart, name, dob: dob || '—',
      total: parseInt(total), cur: Math.min(parseInt(cur) || 1, parseInt(total)),
      start: start || new Date().toISOString().split('T')[0],
      next: next || '', cyc, type,
      doc: type === 'pedo' ? doc : '',
      notes
    }
    await onSubmit(p)
  }

  const docOpts = [{ l: '担当なし', v: '' }, ...doctors.map(d => ({ l: d, v: d }))]

  return (
    <div className="form-wrap">
      <div className="f-sec" style={{marginTop:0}}>基本情報</div>
      <div className="f-grid">
        <div><label className="f-lbl">患者名（カタカナ）</label><input className="f-inp" value={name} onChange={e => setName(e.target.value)} placeholder="ヤマダ ハナコ" /></div>
        <div><label className="f-lbl">カルテ番号（数字のみ）</label><input className="f-inp" type="number" value={chart} onChange={e => setChart(e.target.value)} placeholder="1001" min="1" /></div>
        <div><label className="f-lbl">生年月日</label><input className="f-inp" type="date" value={dob} onChange={e => setDob(e.target.value)} /></div>
      </div>

      <div className="f-sec">区分</div>
      <label className="f-lbl">矯正の種別</label>
      <div className="seg">
        <div className={'seg-item' + (type === 'adult' ? ' sel-adult' : '')} onClick={() => setType('adult')}>成人矯正</div>
        <div className={'seg-item' + (type === 'pedo' ? ' sel-pedo' : '')} onClick={() => setType('pedo')}>小児矯正</div>
      </div>
      {type === 'pedo' && (
        <div style={{marginTop:'10px'}}>
          <label className="f-lbl">小児矯正担当</label>
          <div className="seg">
            {docOpts.map(o => (
              <div key={o.v} className={'seg-item' + (doc === o.v ? (o.v === '' ? ' sel-nodoc' : ' sel-doc') : '')} onClick={() => setDoc(o.v)}>{o.l}</div>
            ))}
          </div>
        </div>
      )}

      <div className="f-sec">治療情報</div>
      <div className="f-grid">
        <div><label className="f-lbl">総アライナー枚数</label><input className="f-inp" type="number" value={total} onChange={e => setTotal(e.target.value)} placeholder="20" min="1" max="60" /></div>
        <div><label className="f-lbl">現在のアライナー番号</label><input className="f-inp" type="number" value={cur} onChange={e => setCur(e.target.value)} placeholder="1" min="1" max="60" /></div>
        <div><label className="f-lbl">治療開始日</label><input className="f-inp" type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
        <div><label className="f-lbl">次回来院日</label><input className="f-inp" type="date" value={next} onChange={e => setNext(e.target.value)} /></div>
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
      <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
        <button className="btn btn-blue" onClick={handleSubmit}>{initial ? '変更を保存' : '患者を登録する'}</button>
        <button className="btn btn-outline" onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  )
}
