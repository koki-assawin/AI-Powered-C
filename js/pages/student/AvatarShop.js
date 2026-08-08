// js/pages/student/AvatarShop.js — Avatar & Cosmetic Shop v1.0
// หน่วยที่ 1 ว31281 — Engagement via Avatar Customization
// Depends on: gamification.js (getPlayerStats, awardXP), achievementEngine.js

// ── Shop catalogue ────────────────────────────────────────────────────────────
const SHOP_ITEMS = [
    // ── กรอบ Avatar (Frame) ──────────────────────────────────────────────────
    { id: 'frame_blue',     cat: 'frame', name: 'กรอบฟ้าใส',     icon: '🔵', rarity: 'common',    cost: 60,   currency: 'coin',    preview: '#3b82f6', desc: 'กรอบสีฟ้าแบบเรียบง่าย' },
    { id: 'frame_green',    cat: 'frame', name: 'กรอบเขียว',      icon: '🟢', rarity: 'common',    cost: 60,   currency: 'coin',    preview: '#22c55e', desc: 'สดชื่น พลังงานดี' },
    { id: 'frame_orange',   cat: 'frame', name: 'กรอบส้มลุย',     icon: '🟠', rarity: 'uncommon',  cost: 150,  currency: 'coin',    preview: '#f97316', desc: 'แสดงถึงพลังความพยายาม' },
    { id: 'frame_purple',   cat: 'frame', name: 'กรอบม่วงจอมเวทย์', icon: '🟣', rarity: 'uncommon', cost: 150, currency: 'coin',    preview: '#a855f7', desc: 'เหมาะกับ Logic Master' },
    { id: 'frame_gold',     cat: 'frame', name: 'กรอบทองคำ',      icon: '🌟', rarity: 'rare',      cost: 5,    currency: 'crystal', preview: '#f59e0b', desc: 'สง่าราศี เหมาะกับแชมป์' },
    { id: 'frame_rainbow',  cat: 'frame', name: 'กรอบสายรุ้ง',    icon: '🌈', rarity: 'epic',      cost: 15,   currency: 'crystal', preview: 'rainbow', desc: 'หายากสุดๆ — สำหรับผู้พิเศษ' },
    { id: 'frame_legendary',cat: 'frame', name: 'กรอบ Legend',    icon: '⚡', rarity: 'legendary', cost: 50,   currency: 'crystal', preview: '#ef4444', desc: 'Legendary เท่านั้น' },

    // ── ตำแหน่ง / Title ──────────────────────────────────────────────────────
    { id: 'title_bugfighter', cat: 'title', name: 'Bug Fighter',   icon: '🐛', rarity: 'common',    cost: 80,   currency: 'coin',    preview: '🐛 Bug Fighter',    desc: 'สู้กับ Bug ไม่ยอมแพ้' },
    { id: 'title_looplord',   cat: 'title', name: 'Loop Lord',     icon: '🔄', rarity: 'uncommon',  cost: 120,  currency: 'coin',    preview: '🔄 Loop Lord',      desc: 'เชี่ยวชาญการวนซ้ำ' },
    { id: 'title_aiwhisperer',cat: 'title', name: 'AI Whisperer',  icon: '🤖', rarity: 'rare',      cost: 8,    currency: 'crystal', preview: '🤖 AI Whisperer',   desc: 'พูดคุยกับ AI ได้อย่างเชี่ยวชาญ' },
    { id: 'title_ethicshero', cat: 'title', name: 'Ethics Hero',   icon: '⚖️', rarity: 'rare',      cost: 10,   currency: 'crystal', preview: '⚖️ Ethics Hero',    desc: 'ผู้รักษาจริยธรรม AI' },
    { id: 'title_codewizard', cat: 'title', name: 'Code Wizard',   icon: '🧙', rarity: 'epic',      cost: 20,   currency: 'crystal', preview: '🧙 Code Wizard',    desc: 'จอมเวทย์แห่งโค้ด' },
    { id: 'title_legendary',  cat: 'title', name: 'God of Algorithm',icon:'👑', rarity: 'legendary', cost: 50,   currency: 'crystal', preview: '👑 God of Algorithm', desc: 'เทพแห่ง Algorithm' },

    // ── ของตกแต่ง / Accessory ────────────────────────────────────────────────
    { id: 'acc_headphones', cat: 'accessory', name: 'หูฟัง Dev',  icon: '🎧', rarity: 'common',    cost: 50,   currency: 'coin',    preview: '🎧', desc: 'นักพัฒนาสาย Music' },
    { id: 'acc_glasses',    cat: 'accessory', name: 'แว่น Hacker', icon: '🕶️', rarity: 'common',    cost: 50,   currency: 'coin',    preview: '🕶️', desc: 'สไตล์ Hacker' },
    { id: 'acc_crown',      cat: 'accessory', name: 'มงกุฎแชมป์', icon: '👑', rarity: 'rare',      cost: 8,    currency: 'crystal', preview: '👑', desc: 'สำหรับผู้ที่อยู่บน Leaderboard' },
    { id: 'acc_fire',       cat: 'accessory', name: 'เปลวไฟ',     icon: '🔥', rarity: 'epic',      cost: 18,   currency: 'crystal', preview: '🔥', desc: 'สำหรับสาย Streak ไม่มีหยุด' },
    { id: 'acc_star',       cat: 'accessory', name: 'ดาว Legend',  icon: '⭐', rarity: 'legendary', cost: 50,   currency: 'crystal', preview: '⭐', desc: 'ดาวที่หายากที่สุด' },
];

const RARITY_META = {
    common:    { label: 'ทั่วไป',    color: '#64748b', bg: '#1e293b', border: '#334155' },
    uncommon:  { label: 'หายาก',    color: '#22c55e', bg: '#052e16', border: '#166534' },
    rare:      { label: 'หายากมาก', color: '#3b82f6', bg: '#0c1a3a', border: '#1e40af' },
    epic:      { label: 'Epic',      color: '#a855f7', bg: '#1e0a3a', border: '#6b21a8' },
    legendary: { label: 'Legendary', color: '#f59e0b', bg: '#2a1500', border: '#92400e' },
};

// ── AvatarPreview ─────────────────────────────────────────────────────────────
const _AvatarPreview = ({ rankTier, frame, title, accessory }) => {
    const frameItem = SHOP_ITEMS.find(i => i.id === frame);
    const titleItem = SHOP_ITEMS.find(i => i.id === title);
    const accItem   = SHOP_ITEMS.find(i => i.id === accessory);

    const getBorderStyle = () => {
        if (!frameItem) return { border: '3px solid #475569' };
        if (frameItem.preview === 'rainbow') return {
            border: '3px solid transparent',
            background: 'linear-gradient(135deg,#f59e0b,#ef4444,#a855f7,#3b82f6,#22c55e) border-box',
        };
        return { border: `3px solid ${frameItem.preview}`, boxShadow: `0 0 12px ${frameItem.preview}55` };
    };

    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
                <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 36, ...getBorderStyle(),
                }}>
                    {rankTier?.icon || '🥚'}
                </div>
                {accItem && (
                    <div style={{ position: 'absolute', top: -4, right: -4, fontSize: 22 }}>
                        {accItem.preview}
                    </div>
                )}
            </div>
            {titleItem && (
                <div style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, marginTop: 2 }}>
                    {titleItem.preview}
                </div>
            )}
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {rankTier?.name || '?'}
            </div>
        </div>
    );
};

// ── ShopItem card ─────────────────────────────────────────────────────────────
const _ShopItemCard = ({ item, owned, equipped, onBuy, onEquip, coinBalance, crystalBalance }) => {
    const rm = RARITY_META[item.rarity];
    const canAfford = item.currency === 'coin' ? coinBalance >= item.cost : crystalBalance >= item.cost;
    const currencyIcon = item.currency === 'coin' ? '🪙' : '💎';

    return (
        <div style={{
            background: rm.bg, border: `1px solid ${equipped ? '#f59e0b' : rm.border}`,
            borderRadius: 12, padding: '12px 10px', textAlign: 'center',
            boxShadow: equipped ? '0 0 10px #f59e0b55' : 'none',
            transition: 'transform .15s',
            cursor: 'default',
        }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>{item.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', marginBottom: 2 }}>{item.name}</div>
            <div style={{ fontSize: 10, color: rm.color, marginBottom: 4, fontWeight: 700 }}>
                {rm.label}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8, minHeight: 28 }}>{item.desc}</div>

            {/* Cost badge */}
            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700,
                color: item.currency === 'coin' ? '#fbbf24' : '#c084fc',
                background: '#0f172a', borderRadius: 6, padding: '2px 8px', marginBottom: 8,
            }}>
                {currencyIcon} {item.cost}
            </div>

            {/* Action button */}
            <div>
                {equipped ? (
                    <div style={{
                        fontSize: 11, color: '#fbbf24', fontWeight: 700,
                        padding: '4px 0', borderRadius: 6, background: '#2a1500',
                    }}>
                        ✓ กำลังใช้งาน
                    </div>
                ) : owned ? (
                    <button onClick={() => onEquip(item)} style={{
                        width: '100%', padding: '4px 0', borderRadius: 6, border: '1px solid #475569',
                        background: '#1e293b', color: '#94a3b8', fontSize: 11, cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
                    }}>
                        ✓ มีแล้ว — สวมใส่
                    </button>
                ) : (
                    <button onClick={() => onBuy(item)} disabled={!canAfford} style={{
                        width: '100%', padding: '4px 0', borderRadius: 6, border: 'none',
                        background: canAfford ? `linear-gradient(135deg,${rm.color},#1e293b)` : '#1e293b',
                        color: canAfford ? '#fff' : '#475569', fontSize: 11,
                        cursor: canAfford ? 'pointer' : 'not-allowed', fontFamily: "'Prompt',sans-serif", fontWeight: 600,
                    }}>
                        {canAfford ? `ซื้อ ${currencyIcon} ${item.cost}` : 'ไม่พอ'}
                    </button>
                )}
            </div>
        </div>
    );
};

// ── Main AvatarShop ───────────────────────────────────────────────────────────
const AvatarShop = () => {
    const { user } = useAuth();
    const [stats,    setStats]   = React.useState(null);
    const [loading,  setLoading] = React.useState(true);
    const [tab,      setTab]     = React.useState('frame'); // frame | title | accessory
    const [toast,    setToast]   = React.useState(null);
    const [buying,   setBuying]  = React.useState(false);

    const showToast = (msg, type = 'ok') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // ── Load playerStats (real-time) ──────────────────────────────────────────
    React.useEffect(() => {
        if (!user?.uid) return;
        const unsub = db.collection('playerStats').doc(user.uid)
            .onSnapshot(snap => {
                if (snap.exists) setStats({ id: user.uid, ...snap.data() });
                else getPlayerStats(user.uid).then(s => setStats(s));
                setLoading(false);
            }, () => setLoading(false));
        return () => unsub();
    }, [user]);

    const ownedItems  = stats?.ownedItems  || [];
    const equipped    = {
        frame:     stats?.equippedFrame     || null,
        title:     stats?.equippedTitle     || null,
        accessory: stats?.equippedAccessory || null,
    };
    const coinBalance    = stats?.codeCoin || 0;
    const crystalBalance = stats?.crystal  || 0;
    const rankTier       = typeof getRankFromXP === 'function' ? getRankFromXP(stats?.xp || 0) : null;

    // ── Buy ───────────────────────────────────────────────────────────────────
    const handleBuy = async (item) => {
        if (buying || !user?.uid) return;
        setBuying(true);
        try {
            const balance = item.currency === 'coin' ? coinBalance : crystalBalance;
            if (balance < item.cost) { showToast('ยอดไม่พอ', 'err'); return; }
            if (ownedItems.includes(item.id)) { showToast('มีแล้ว', 'err'); return; }

            const ref = db.collection('playerStats').doc(user.uid);
            const field = item.currency === 'coin' ? 'codeCoin' : 'crystal';
            await ref.update({
                [field]: firebase.firestore.FieldValue.increment(-item.cost),
                ownedItems: firebase.firestore.FieldValue.arrayUnion(item.id),
            });

            // Auto-equip when buying
            const equipField = item.cat === 'frame' ? 'equippedFrame'
                : item.cat === 'title' ? 'equippedTitle' : 'equippedAccessory';
            await ref.update({ [equipField]: item.id });

            showToast(`ซื้อ "${item.name}" สำเร็จ! ✨`, 'ok');

            // Log purchase event
            try {
                db.collection('shopPurchases').add({
                    uid: user.uid, itemId: item.id, cost: item.cost,
                    currency: item.currency, purchasedAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
            } catch (_) {}
        } catch (e) {
            showToast('เกิดข้อผิดพลาด ลองใหม่', 'err');
        } finally {
            setBuying(false);
        }
    };

    // ── Equip ─────────────────────────────────────────────────────────────────
    const handleEquip = async (item) => {
        if (!user?.uid) return;
        const equipField = item.cat === 'frame' ? 'equippedFrame'
            : item.cat === 'title' ? 'equippedTitle' : 'equippedAccessory';
        try {
            await db.collection('playerStats').doc(user.uid).update({ [equipField]: item.id });
            showToast(`สวมใส่ "${item.name}" แล้ว!`, 'ok');
        } catch (_) { showToast('ไม่สามารถสวมใส่ได้', 'err'); }
    };

    const TAB_LABELS = {
        frame:     '🖼️ กรอบ',
        title:     '📛 ตำแหน่ง',
        accessory: '🎭 ของตกแต่ง',
    };

    const visibleItems = SHOP_ITEMS.filter(i => i.cat === tab);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="Avatar Shop" />

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 70, right: 20, zIndex: 9999,
                    background: toast.type === 'ok' ? '#166534' : '#991b1b',
                    color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13,
                    boxShadow: '0 4px 12px rgba(0,0,0,.4)', fontFamily: "'Prompt',sans-serif",
                }}>
                    {toast.msg}
                </div>
            )}

            <main style={{ maxWidth: 780, margin: '0 auto', padding: '24px 16px' }}>

                {loading ? (
                    <div style={{ textAlign: 'center', paddingTop: 80 }}>
                        <Spinner text="กำลังโหลด Shop..." />
                    </div>
                ) : (
                    <>
                        {/* ── Header ─────────────────────────────────────────────── */}
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>🛒 CodeAvatar Shop</h1>
                            <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                                แต่งแต้ม Avatar ของคุณด้วย CodeCoin และ Crystal
                            </p>
                        </div>

                        {/* ── Currency + Preview ─────────────────────────────────── */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 24,
                            background: '#1e293b', borderRadius: 14, padding: 16,
                        }}>
                            <div>
                                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>ยอดคงเหลือ</div>
                                <div style={{ display: 'flex', gap: 24 }}>
                                    <div>
                                        <span style={{ fontSize: 22, fontWeight: 800, color: '#fbbf24' }}>
                                            🪙 {coinBalance.toLocaleString()}
                                        </span>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>CodeCoin</div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: 22, fontWeight: 800, color: '#c084fc' }}>
                                            💎 {crystalBalance.toLocaleString()}
                                        </span>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>Crystal</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: 11, color: '#475569', marginTop: 8 }}>
                                    💡 หา CodeCoin ได้จากการส่งงาน / ทำ Mini Game / Streak รายวัน
                                </div>
                            </div>
                            <div style={{ borderLeft: '1px solid #334155', paddingLeft: 16 }}>
                                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, textAlign: 'center' }}>
                                    Avatar ปัจจุบัน
                                </div>
                                <_AvatarPreview
                                    rankTier={rankTier}
                                    frame={equipped.frame}
                                    title={equipped.title}
                                    accessory={equipped.accessory}
                                />
                            </div>
                        </div>

                        {/* ── Category Tabs ──────────────────────────────────────── */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            {Object.entries(TAB_LABELS).map(([key, label]) => (
                                <button key={key} onClick={() => setTab(key)} style={{
                                    flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
                                    background: tab === key ? '#3b82f6' : '#1e293b',
                                    color: tab === key ? '#fff' : '#64748b',
                                    fontFamily: "'Prompt',sans-serif", fontSize: 13, cursor: 'pointer', fontWeight: 600,
                                }}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* ── Item Grid ──────────────────────────────────────────── */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                            gap: 12,
                        }}>
                            {visibleItems.map(item => (
                                <_ShopItemCard
                                    key={item.id}
                                    item={item}
                                    owned={ownedItems.includes(item.id)}
                                    equipped={equipped[item.cat] === item.id}
                                    onBuy={handleBuy}
                                    onEquip={handleEquip}
                                    coinBalance={coinBalance}
                                    crystalBalance={crystalBalance}
                                />
                            ))}
                        </div>

                        {/* ── Earn tips ──────────────────────────────────────────── */}
                        <div style={{
                            marginTop: 28, background: '#1e293b', borderRadius: 12, padding: 16,
                            border: '1px solid #334155',
                        }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 8 }}>
                                💰 วิธีหา CodeCoin & Crystal
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: '#94a3b8' }}>
                                <div>🪙 ส่งงานได้คะแนน: +2–10 coin</div>
                                <div>🪙 เล่น Mini Game: +coin ตามคะแนน</div>
                                <div>🪙 Streak รายวัน 7 วัน: +10 coin</div>
                                <div>💎 Achievement พิเศษ: +crystal</div>
                                <div>💎 Rank ขึ้น Level 5/10: +crystal</div>
                                <div>💎 ผ่าน Ethics Quiz 100%: +2 crystal</div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};
