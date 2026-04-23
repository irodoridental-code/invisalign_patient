import { useState } from 'react'

export default function Settings({ doctors, onAdd, onUpdate, onDelete, onReorder, onBack }) {
  const [newName, setNewName] = useState('')
  const [editingIdx, setEditingIdx] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [dragIdx, setDragIdx] = useState(null)

  async function handleAdd() {
    if (!newName.trim()) { alert('担当医名を入力してください'); return }
    if (doctors.includes(newName.trim())) { alert(newName + ' はすでに登録されています'); return }
    await onAdd(newName.trim())
    setNewName('')
  }

  async function handleDelete(name) {
    if (doctors.length <= 1) { alert('担当医は1名以上必要です'); return }
    if (!confirm(name + ' を削除しますか？')) return
    await onDelete(name)
  }

  async function handleSaveEdit(i) {
    if (editVal.trim() && editVal.trim() !== doctors[i]) {
      await onUpdate(doctors[i], editVal.trim())
    }
    setEditingIdx(null)
  }

  function handleDragStart(i) { setDragIdx(i) }
  function handleDragOver(e) { e.preventDefault() }
  async function handleDrop(i) {
    if (dragIdx === null || dragIdx === i) return
    const newOrder = [...doctors]
    const moved = newOrder.splice(dragIdx, 1)[0]
    newOrder.splice(i, 0, moved)
    await onReorder(newOrder)
    setDragIdx(null)
  }

  return (
    <>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
        <button className="btn btn-outline" style={{fontSize:'12px',padding:'5px 12px'}} onClick={onBack}>← 戻る</button>
        <span style={{fontSize:'14px',fontWeight:600,color:'#111'}}>設定</span>
      </div>
      <div className="set-wrap">
        <div className="set-title">小児矯正担当医</div>
        <div className="set-sub">名前をクリックして編集 / ドラッグして並べ替え</div>
        <div>
          {doctors.map((d, i) => (
            <div
              key={d}
              className="dr-item"
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(i)}
            >
              <span className="dr-handle">⠿</span>
              {editingIdx === i ? (
                <input
                  className="dr-inp-edit"
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onBlur={() => handleSaveEdit(i)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(i) }}
                  autoFocus
                />
              ) : (
                <span className="dr-name" onClick={() => { setEditingIdx(i); setEditVal(d) }}>{d}</span>
              )}
              <button className="sm-btn del" onClick={() => handleDelete(d)}>✕</button>
            </div>
          ))}
        </div>
        <div className="add-row">
          <input className="f-inp" value={newName} onChange={e => setNewName(e.target.value)} placeholder="担当医名を入力..." style={{flex:1}} onKeyDown={e => { if (e.key === 'Enter') handleAdd() }} />
          <button className="btn btn-blue" onClick={handleAdd}>追加</button>
        </div>
      </div>
    </>
  )
}
