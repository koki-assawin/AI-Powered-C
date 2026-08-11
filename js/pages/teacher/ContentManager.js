// js/pages/teacher/ContentManager.js - CMS สำหรับครู v1.1 (per-course)

const _CM_UNITS = [
    { id:1, title:'หน่วยที่ 1', name:'โครงสร้างโปรแกรม C + I/O',  icon:'🏗️', color:'#3b82f6' },
    { id:2, title:'หน่วยที่ 2', name:'โครงสร้างการตัดสินใจ',       icon:'🔀', color:'#8b5cf6' },
    { id:3, title:'หน่วยที่ 3', name:'โครงสร้างการวนซ้ำ',          icon:'🔄', color:'#10b981' },
    { id:4, title:'หน่วยที่ 4', name:'อาร์เรย์และฟังก์ชัน',        icon:'📦', color:'#f59e0b' },
    { id:5, title:'หน่วยที่ 5', name:'Mini Project + AI Ethics',  icon:'🚀', color:'#ef4444' },
];

const _CM_BUILTIN_TOPICS = {
    1: [{id:'u1t1',title:'โครงสร้างโปรแกรม Hello World'},{id:'u1t2',title:'ชนิดข้อมูลและตัวแปร'},
        {id:'u1t3',title:'ตัวดำเนินการ (Operators)'},{id:'u1t4',title:'printf และ Format Specifier'},
        {id:'u1t5',title:'scanf รับข้อมูล'},{id:'u1t6',title:'Flowchart และ Pseudocode'}],
    2: [{id:'u2t1',title:'if และ if-else'},{id:'u2t2',title:'Nested if และ if-else if'},
        {id:'u2t3',title:'switch-case'},{id:'u2t4',title:'ตัวดำเนินการเชิงตรรกะ'}],
    3: [{id:'u3t1',title:'for loop'},{id:'u3t2',title:'while และ do-while loop'},
        {id:'u3t3',title:'break, continue และ Nested Loop'}],
    4: [{id:'u4t1',title:'ฟังก์ชัน (Function)'},{id:'u4t2',title:'Array 1 มิติ'},
        {id:'u4t3',title:'Array 2 มิติและ Bubble Sort'},{id:'u4t4',title:'Debugging — หา Error'}],
    5: [{id:'u5t1',title:'Mini Project'},{id:'u5t2',title:'AI ช่วยเขียนโปรแกรม'},
        {id:'u5t3',title:'จริยธรรม AI และ Peer Review'}],
};

const _CM_RESOURCE_TYPES = [
    { value:'video', label:'🎬 วิดีโอ (YouTube URL)', placeholder:'https://www.youtube.com/watch?v=...' },
    { value:'pdf',   label:'📄 PDF (URL หรือ Google Drive)',  placeholder:'https://drive.google.com/...' },
    { value:'link',  label:'🔗 ลิงก์เว็บ',           placeholder:'https://...' },
    { value:'image', label:'🖼️ รูปภาพ (URL)',          placeholder:'https://...jpg' },
];

// ── Course Picker ──────────────────────────────────────────
function _CM_CoursePicker({ uid }) {
    const [courses, setCourses] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!uid) return;
        // Load courses where teacher is owner or co-teacher
        const unsub = db.collection('courses')
            .where('teacherId', '==', uid)
            .onSnapshot(snap => {
                setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() }))
                    .filter(c => c.status !== 'archived'));
                setLoading(false);
            }, () => setLoading(false));
        return () => unsub();
    }, [uid]);

    const langMeta = {
        c:      { icon: '🔵', label: 'C' },
        cpp:    { icon: '🟣', label: 'C++' },
        python: { icon: '🟡', label: 'Python' },
        java:   { icon: '🔴', label: 'Java' },
    };

    return (
        <div>
            <div style={{textAlign:'center',marginBottom:32}}>
                <div style={{fontSize:40,marginBottom:8}}>📖</div>
                <h2 style={{margin:'0 0 6px',fontSize:22,fontWeight:700,color:'#1e293b'}}>จัดการเนื้อหา Learning Hub</h2>
                <p style={{margin:0,fontSize:14,color:'#64748b'}}>เลือกรายวิชาที่ต้องการจัดการเนื้อหาการเรียนรู้</p>
            </div>

            {loading ? (
                <div style={{textAlign:'center',padding:'40px 0',color:'#9ca3af'}}>กำลังโหลดรายวิชา...</div>
            ) : courses.length === 0 ? (
                <div style={{textAlign:'center',padding:'40px 0',color:'#9ca3af'}}>
                    <div style={{fontSize:36,marginBottom:10}}>📭</div>
                    <p>ไม่พบรายวิชา กรุณาสร้างรายวิชาก่อน</p>
                    <a href="#/teacher/courses" style={{color:'#2563eb',fontWeight:600}}>→ ไปสร้างรายวิชา</a>
                </div>
            ) : (
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>
                    {courses.map(c => {
                        const lm = langMeta[c.language] || { icon: '💻', label: c.language || 'C' };
                        return (
                            <div key={c.id}
                                onClick={() => { window.location.hash = `#/teacher/content?course=${c.id}`; }}
                                style={{background:'white',borderRadius:14,padding:20,border:'1px solid #e2e8f0',
                                    cursor:'pointer',transition:'all .15s',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}
                                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.1)'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.04)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                                    <span style={{fontSize:28}}>{lm.icon}</span>
                                    <div>
                                        <div style={{fontWeight:700,fontSize:14,color:'#1e293b',lineHeight:1.3}}>{c.title}</div>
                                        <div style={{fontSize:11,color:'#64748b'}}>{lm.label} · {c.grade || ''} ห้อง {c.room || ''}</div>
                                    </div>
                                </div>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                    <span style={{fontSize:11,background:'#eff6ff',color:'#1d4ed8',borderRadius:6,padding:'2px 8px'}}>
                                        เทอม {c.semester}/{c.academicYear || ''}
                                    </span>
                                    <span style={{fontSize:13,color:'#2563eb',fontWeight:600}}>จัดการเนื้อหา →</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Resource row in form ───────────────────────────────────
function _CM_ResourceRow({ res, onChange, onDelete }) {
    const typeInfo = _CM_RESOURCE_TYPES.find(t => t.value === res.type) || _CM_RESOURCE_TYPES[0];
    return (
        <div style={{display:'flex',gap:8,alignItems:'center',background:'#f8fafc',borderRadius:8,padding:8,marginBottom:6,border:'1px solid #e2e8f0'}}>
            <select value={res.type} onChange={e => onChange({ ...res, type: e.target.value })}
                style={{fontSize:12,padding:'4px 6px',borderRadius:6,border:'1px solid #d1d5db',background:'white',fontFamily:'inherit'}}>
                {_CM_RESOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input value={res.url} onChange={e => onChange({ ...res, url: e.target.value })}
                placeholder={typeInfo.placeholder}
                style={{flex:2,fontSize:12,padding:'4px 8px',borderRadius:6,border:'1px solid #d1d5db',fontFamily:'inherit'}} />
            <input value={res.title} onChange={e => onChange({ ...res, title: e.target.value })}
                placeholder="ชื่อ (ไม่บังคับ)"
                style={{flex:1,fontSize:12,padding:'4px 8px',borderRadius:6,border:'1px solid #d1d5db',fontFamily:'inherit'}} />
            <button onClick={onDelete}
                style={{background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:6,padding:'4px 8px',cursor:'pointer',fontSize:12}}>
                ✕
            </button>
        </div>
    );
}

// ── Topic form modal ───────────────────────────────────────
function _CM_TopicForm({ topic, courseId, isC, unitId: defaultUnitId, onSave, onClose }) {
    const isNew = !topic?.id;
    const [form, setForm] = React.useState({
        title:          topic?.title || '',
        icon:           topic?.icon || '📖',
        content:        topic?.content || '',
        unitId:         topic?.unitId || defaultUnitId || (isC ? 1 : null),
        parentTopicId:  topic?.parentTopicId || '',
        resources:      topic?.resources || [],
        isPublished:    topic?.isPublished ?? true,
    });
    const [saving, setSaving] = React.useState(false);
    const { userDoc } = useAuth();

    const addResource = () => setForm(f => ({ ...f, resources: [...f.resources, { type:'link', url:'', title:'' }] }));
    const updateRes = (i, val) => setForm(f => { const r = [...f.resources]; r[i] = val; return { ...f, resources: r }; });
    const deleteRes = (i) => setForm(f => ({ ...f, resources: f.resources.filter((_,idx) => idx !== i) }));

    const handleSave = async () => {
        if (!form.title.trim()) { alert('กรุณากรอกหัวข้อ'); return; }
        setSaving(true);
        try {
            const data = {
                courseId,
                unitId:        form.unitId || null,
                title:         form.title.trim(),
                icon:          form.icon.trim() || '📖',
                content:       form.content.trim(),
                parentTopicId: form.parentTopicId || null,
                resources:     form.resources.filter(r => r.url.trim()),
                isPublished:   form.isPublished,
                updatedAt:     serverTimestamp(),
                createdBy:     userDoc?.id || '',
            };
            if (isNew) {
                // Get all topics for course, sort client-side to find max order (avoids composite index)
                const snap = await db.collection('learningTopics')
                    .where('courseId','==',courseId).get();
                const maxOrder = snap.empty ? 0 : Math.max(...snap.docs.map(d => d.data().order || 0));
                data.order = maxOrder + 1;
                data.createdAt = serverTimestamp();
                await db.collection('learningTopics').add(data);
            } else {
                await db.collection('learningTopics').doc(topic.id).update(data);
            }
            onSave();
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const builtins = isC ? (_CM_BUILTIN_TOPICS[form.unitId] || []) : [];

    return (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
            <div style={{background:'white',borderRadius:16,width:'100%',maxWidth:660,maxHeight:'90vh',overflow:'auto',padding:24,boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
                    <h3 style={{margin:0,fontSize:18,fontWeight:700}}>{isNew ? '➕ เพิ่มหัวข้อใหม่' : '✏️ แก้ไขหัวข้อ'}</h3>
                    <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#6b7280'}}>✕</button>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'60px 1fr',gap:10,marginBottom:14}}>
                    <div>
                        <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:4}}>ไอคอน</label>
                        <input value={form.icon} onChange={e => setForm(f => ({...f, icon:e.target.value}))} maxLength={4}
                            style={{width:'100%',fontSize:22,textAlign:'center',padding:'6px',borderRadius:8,border:'1px solid #d1d5db',fontFamily:'inherit'}} />
                    </div>
                    <div>
                        <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:4}}>หัวข้อ *</label>
                        <input value={form.title} onChange={e => setForm(f => ({...f, title:e.target.value}))}
                            placeholder="ชื่อหัวข้อ"
                            style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #d1d5db',fontSize:14,fontFamily:'inherit'}} />
                    </div>
                </div>

                {/* Unit selector — C courses only */}
                {isC && (
                    <div style={{marginBottom:14}}>
                        <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:4}}>หน่วยการเรียน</label>
                        <select value={form.unitId || ''} onChange={e => setForm(f => ({...f, unitId: parseInt(e.target.value)||null, parentTopicId:''}))}
                            style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #d1d5db',fontSize:13,fontFamily:'inherit',background:'white'}}>
                            <option value="">— ไม่ระบุหน่วย —</option>
                            {_CM_UNITS.map(u => <option key={u.id} value={u.id}>{u.icon} {u.title}: {u.name}</option>)}
                        </select>
                    </div>
                )}

                {/* Parent topic linking — C courses only, when unit selected */}
                {isC && builtins.length > 0 && (
                    <div style={{marginBottom:14}}>
                        <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:4}}>
                            📎 แนบกับหัวข้อพื้นฐาน (ถ้าต้องการ)
                        </label>
                        <select value={form.parentTopicId} onChange={e => setForm(f => ({...f, parentTopicId:e.target.value}))}
                            style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #d1d5db',fontSize:13,fontFamily:'inherit',background:'white'}}>
                            <option value="">— ไม่แนบ (แสดงเป็นหัวข้อใหม่) —</option>
                            {builtins.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                        </select>
                        <p style={{fontSize:11,color:'#6b7280',marginTop:3}}>ถ้าแนบ เนื้อหานี้จะปรากฏใต้หัวข้อพื้นฐานนั้น</p>
                    </div>
                )}

                <div style={{marginBottom:14}}>
                    <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:4}}>📝 เนื้อหา</label>
                    <textarea value={form.content} onChange={e => setForm(f => ({...f, content:e.target.value}))}
                        rows={6} placeholder="อธิบายเนื้อหา หรือเพิ่มสรุป / ตัวอย่างเพิ่มเติม..."
                        style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #d1d5db',fontSize:13,lineHeight:1.7,fontFamily:'inherit',resize:'vertical'}} />
                </div>

                <div style={{marginBottom:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                        <label style={{fontSize:12,fontWeight:600,color:'#374151'}}>🔗 สื่อและไฟล์แนบ</label>
                        <button onClick={addResource}
                            style={{background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bfdbfe',borderRadius:6,padding:'4px 12px',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit'}}>
                            + เพิ่มสื่อ
                        </button>
                    </div>
                    {form.resources.map((r,i) => (
                        <_CM_ResourceRow key={i} res={r} onChange={v => updateRes(i,v)} onDelete={() => deleteRes(i)} />
                    ))}
                    {form.resources.length === 0 && (
                        <p style={{fontSize:12,color:'#9ca3af',textAlign:'center',padding:'12px 0'}}>กดปุ่ม "+ เพิ่มสื่อ" เพื่อแนบวิดีโอ PDF หรือลิงก์</p>
                    )}
                </div>

                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151'}}>สถานะ:</label>
                    <button onClick={() => setForm(f => ({...f, isPublished: !f.isPublished}))}
                        style={{background: form.isPublished ? '#dcfce7':'#f1f5f9',
                            color: form.isPublished ? '#166534':'#475569',
                            border:'none',borderRadius:8,padding:'6px 14px',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>
                        {form.isPublished ? '✅ เผยแพร่แล้ว' : '🔒 ซ่อน (Draft)'}
                    </button>
                </div>

                <div style={{display:'flex',gap:10}}>
                    <button onClick={onClose}
                        style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #d1d5db',background:'white',cursor:'pointer',fontSize:14,fontFamily:'inherit'}}>
                        ยกเลิก
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        style={{flex:2,padding:'10px',borderRadius:8,border:'none',background:'#2563eb',color:'white',cursor:'pointer',fontSize:14,fontWeight:700,fontFamily:'inherit',opacity:saving?.6:1}}>
                        {saving ? 'กำลังบันทึก...' : (isNew ? '➕ เพิ่มหัวข้อ' : '💾 บันทึกการแก้ไข')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Topic card ─────────────────────────────────────────────
function _CM_TopicCard({ topic, onEdit, onDelete, onMoveUp, onMoveDown, isFirst, isLast, isC }) {
    const [confirmDel, setConfirmDel] = React.useState(false);
    const unit = isC ? _CM_UNITS.find(u => u.id === topic.unitId) : null;

    return (
        <div style={{background:'white',borderRadius:10,padding:'12px 16px',marginBottom:8,
            border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:12,
            boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
            <div style={{display:'flex',flexDirection:'column',gap:2}}>
                <button onClick={onMoveUp} disabled={isFirst}
                    style={{background:'none',border:'none',cursor:'pointer',fontSize:14,opacity:isFirst?.3:1,padding:'1px 4px'}}>▲</button>
                <button onClick={onMoveDown} disabled={isLast}
                    style={{background:'none',border:'none',cursor:'pointer',fontSize:14,opacity:isLast?.3:1,padding:'1px 4px'}}>▼</button>
            </div>

            <span style={{fontSize:20}}>{topic.icon || '📖'}</span>

            <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:14,color:'#1e293b',display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                    {topic.title}
                    {!topic.isPublished && <span style={{fontSize:10,background:'#fef3c7',color:'#92400e',borderRadius:4,padding:'1px 6px'}}>Draft</span>}
                    {unit && <span style={{fontSize:10,background:unit.color+'18',color:unit.color,borderRadius:4,padding:'1px 6px'}}>{unit.title}</span>}
                    {topic.parentTopicId && <span style={{fontSize:10,background:'#eff6ff',color:'#1d4ed8',borderRadius:4,padding:'1px 6px'}}>แนบกับหัวข้อพื้นฐาน</span>}
                </div>
                {topic.content && (
                    <div style={{fontSize:12,color:'#6b7280',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%',marginTop:2}}>
                        {topic.content.slice(0,80)}{topic.content.length > 80 ? '...' : ''}
                    </div>
                )}
                {topic.resources?.length > 0 && (
                    <div style={{marginTop:4,display:'flex',gap:4,flexWrap:'wrap'}}>
                        {topic.resources.map((r,i) => (
                            <span key={i} style={{fontSize:10,background:'#f1f5f9',borderRadius:4,padding:'1px 6px',color:'#475569'}}>
                                {r.type === 'video' ? '🎬' : r.type === 'pdf' ? '📄' : r.type === 'image' ? '🖼️' : '🔗'}
                                {r.title || r.type}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {confirmDel ? (
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <span style={{fontSize:12,color:'#dc2626',fontWeight:600}}>ลบ?</span>
                    <button onClick={onDelete}
                        style={{background:'#dc2626',color:'white',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:12}}>
                        ยืนยัน
                    </button>
                    <button onClick={() => setConfirmDel(false)}
                        style={{background:'#f1f5f9',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:12}}>
                        ยกเลิก
                    </button>
                </div>
            ) : (
                <div style={{display:'flex',gap:6}}>
                    <button onClick={onEdit}
                        style={{background:'#eff6ff',color:'#1d4ed8',border:'none',borderRadius:6,padding:'5px 12px',cursor:'pointer',fontSize:12,fontWeight:600}}>
                        ✏️ แก้ไข
                    </button>
                    <button onClick={() => setConfirmDel(true)}
                        style={{background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:6,padding:'5px 10px',cursor:'pointer',fontSize:12}}>
                        🗑️
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Per-course Content Manager ─────────────────────────────
function _CM_CourseView({ courseId }) {
    const [course, setCourse] = React.useState(null);
    const [topics, setTopics] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [showForm, setShowForm] = React.useState(false);
    const [editTopic, setEditTopic] = React.useState(null);
    const [activeUnit, setActiveUnit] = React.useState(null); // null = all (non-C), or unitId

    React.useEffect(() => {
        // Load course info
        db.collection('courses').doc(courseId).get().then(snap => {
            if (snap.exists) setCourse({ id: snap.id, ...snap.data() });
        }).catch(() => {});

        // Load topics for this course
        setLoading(true);
        const unsub = db.collection('learningTopics')
            .where('courseId', '==', courseId)
            .onSnapshot(snap => {
                const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                // Sort client-side to avoid composite index requirement
                items.sort((a, b) => (a.order || 0) - (b.order || 0));
                setTopics(items);
                setLoading(false);
            }, err => {
                console.error('learningTopics load error:', err);
                setLoading(false);
            });
        return () => unsub();
    }, [courseId]);

    const isC = (course?.language || 'c') === 'c';

    // Set default activeUnit when course loads
    React.useEffect(() => {
        if (isC && activeUnit === null) setActiveUnit(1);
    }, [isC]);

    const handleDelete = async (id) => {
        try { await db.collection('learningTopics').doc(id).delete(); }
        catch (err) { alert('ลบไม่สำเร็จ: ' + err.message); }
    };

    const swapOrder = async (idx, dir, list) => {
        const other = idx + dir;
        if (other < 0 || other >= list.length) return;
        const a = list[idx], b = list[other];
        const batch = db.batch();
        batch.update(db.collection('learningTopics').doc(a.id), { order: b.order || 0 });
        batch.update(db.collection('learningTopics').doc(b.id), { order: a.order || 0 });
        await batch.commit();
    };

    const langMeta = { c:'C (ภาษาซี)', cpp:'C++', python:'Python', java:'Java' };
    const visibleTopics = isC
        ? topics.filter(t => (t.unitId || 1) === (activeUnit || 1))
        : topics;

    return (
        <div>
            {/* Header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
                <div>
                    <a href="#/teacher/content" style={{fontSize:13,color:'#2563eb',textDecoration:'none',fontWeight:600,display:'inline-flex',alignItems:'center',gap:4,marginBottom:8}}>
                        ← รายวิชาทั้งหมด
                    </a>
                    <h2 style={{margin:'0 0 4px',fontSize:20,fontWeight:700,color:'#1e293b'}}>
                        📖 {course ? course.title : 'กำลังโหลด...'}
                    </h2>
                    {course && (
                        <p style={{margin:0,fontSize:13,color:'#64748b'}}>
                            {langMeta[course.language] || course.language} · {course.grade} ห้อง {course.room} ·
                            <a href={`#/student/tools?course=${courseId}`} target="_blank" style={{color:'#2563eb',marginLeft:6}}>ดูหน้านักเรียน ↗</a>
                        </p>
                    )}
                </div>
                <button onClick={() => { setEditTopic(null); setShowForm(true); }}
                    style={{background:'#2563eb',color:'white',border:'none',borderRadius:10,
                        padding:'10px 20px',cursor:'pointer',fontSize:14,fontWeight:700,fontFamily:'inherit'}}>
                    ➕ เพิ่มหัวข้อใหม่
                </button>
            </div>

            {/* Unit tabs (C only) */}
            {isC && (
                <div style={{display:'flex',gap:8,marginBottom:20,overflowX:'auto',paddingBottom:4}}>
                    {_CM_UNITS.map(u => (
                        <button key={u.id} onClick={() => setActiveUnit(u.id)}
                            style={{whiteSpace:'nowrap',padding:'7px 14px',borderRadius:20,border:'2px solid',
                                borderColor: activeUnit === u.id ? u.color : '#e2e8f0',
                                background: activeUnit === u.id ? u.color : 'white',
                                color: activeUnit === u.id ? 'white' : '#374151',
                                fontWeight:600,fontSize:12,cursor:'pointer',transition:'all .15s',fontFamily:'inherit'}}>
                            {u.icon} {u.title}
                            <span style={{marginLeft:6,opacity:.7,fontSize:10}}>
                                ({topics.filter(t=>(t.unitId||1)===u.id).length})
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Built-in topics reference (C only) */}
            {isC && activeUnit && (
                <details style={{marginBottom:16}}>
                    <summary style={{cursor:'pointer',fontSize:13,fontWeight:600,color:'#475569',padding:'8px 12px',
                        background:'white',borderRadius:8,border:'1px solid #e2e8f0',userSelect:'none'}}>
                        📖 หัวข้อพื้นฐาน Built-in ใน{_CM_UNITS.find(u=>u.id===activeUnit)?.title} — คลิกเพื่อดู
                    </summary>
                    <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:8,padding:12,marginTop:6}}>
                        {(_CM_BUILTIN_TOPICS[activeUnit]||[]).map(b => (
                            <div key={b.id} style={{fontSize:13,padding:'4px 8px',color:'#374151',borderBottom:'1px solid #f1f5f9'}}>
                                📌 {b.title}
                            </div>
                        ))}
                    </div>
                </details>
            )}

            {/* Topic list */}
            <div style={{background:'white',borderRadius:14,padding:20,border:'1px solid #e2e8f0'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                    <h3 style={{margin:0,fontSize:15,fontWeight:700,color:'#1e293b'}}>
                        {isC ? `เนื้อหา${_CM_UNITS.find(u=>u.id===activeUnit)?.title || ''} (${visibleTopics.length} หัวข้อ)` : `เนื้อหาทั้งหมด (${topics.length} หัวข้อ)`}
                    </h3>
                </div>

                {loading ? (
                    <div style={{textAlign:'center',padding:'40px 0',color:'#9ca3af'}}>กำลังโหลด...</div>
                ) : visibleTopics.length === 0 ? (
                    <div style={{textAlign:'center',padding:'40px 0',color:'#9ca3af'}}>
                        <div style={{fontSize:40,marginBottom:12}}>📭</div>
                        <p style={{marginBottom:16}}>ยังไม่มีเนื้อหา{isC ? `ใน${_CM_UNITS.find(u=>u.id===activeUnit)?.title}` : ''}</p>
                        <button onClick={() => { setEditTopic(null); setShowForm(true); }}
                            style={{background:'#2563eb',color:'white',border:'none',borderRadius:8,
                                padding:'10px 24px',cursor:'pointer',fontSize:14,fontWeight:700,fontFamily:'inherit'}}>
                            ➕ เพิ่มหัวข้อแรก
                        </button>
                    </div>
                ) : (
                    visibleTopics.map((t, idx) => (
                        <_CM_TopicCard key={t.id} topic={t} isC={isC}
                            isFirst={idx === 0} isLast={idx === visibleTopics.length - 1}
                            onEdit={() => { setEditTopic(t); setShowForm(true); }}
                            onDelete={() => handleDelete(t.id)}
                            onMoveUp={() => swapOrder(idx, -1, visibleTopics)}
                            onMoveDown={() => swapOrder(idx, 1, visibleTopics)}
                        />
                    ))
                )}
            </div>

            {/* Bulk actions */}
            {visibleTopics.length > 0 && (
                <div style={{marginTop:12,display:'flex',gap:10,justifyContent:'flex-end'}}>
                    <button onClick={async () => {
                        const batch = db.batch();
                        visibleTopics.forEach(t => batch.update(db.collection('learningTopics').doc(t.id), { isPublished: true }));
                        await batch.commit();
                    }} style={{background:'#dcfce7',color:'#166534',border:'none',borderRadius:8,padding:'6px 14px',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit'}}>
                        ✅ เผยแพร่ทั้งหมด
                    </button>
                    <button onClick={async () => {
                        const batch = db.batch();
                        visibleTopics.forEach(t => batch.update(db.collection('learningTopics').doc(t.id), { isPublished: false }));
                        await batch.commit();
                    }} style={{background:'#fef3c7',color:'#92400e',border:'none',borderRadius:8,padding:'6px 14px',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit'}}>
                        🔒 ซ่อนทั้งหมด
                    </button>
                </div>
            )}

            {/* Form modal */}
            {showForm && (
                <_CM_TopicForm
                    topic={editTopic}
                    courseId={courseId}
                    isC={isC}
                    unitId={activeUnit}
                    onSave={() => setShowForm(false)}
                    onClose={() => setShowForm(false)}
                />
            )}
        </div>
    );
}

// ── Main ContentManager (router) ───────────────────────────
const ContentManager = () => {
    const { userDoc } = useAuth();
    // Read courseId from URL
    const getCourseId = () => {
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        return params.get('course') || null;
    };
    const [courseId, setCourseId] = React.useState(getCourseId);

    // Re-read courseId on hash change (e.g. back link)
    React.useEffect(() => {
        const handler = () => setCourseId(getCourseId());
        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }, []);

    return (
        <div className="min-h-screen" style={{background:'#f8fafc'}}>
            <Navbar title="AI-Powered Coding Coach" subtitle="จัดการเนื้อหาการเรียนรู้" />
            <div className="max-w-5xl mx-auto px-4 py-6">
                {courseId
                    ? <_CM_CourseView courseId={courseId} />
                    : <_CM_CoursePicker uid={userDoc?.id} />
                }
            </div>
        </div>
    );
};
