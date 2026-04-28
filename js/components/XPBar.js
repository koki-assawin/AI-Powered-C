// js/components/XPBar.js — Compact XP / Rank progress bar
// Requires: gamification.js (RANK_TIERS, getRankFromXP, getNextRankXP)

const XPBar = ({ stats, compact = false }) => {
    if (!stats) return null;

    const xp       = stats.xp       || 0;
    const coin     = stats.codeCoin  || 0;
    const crystal  = stats.crystal   || 0;
    const streak   = stats.streakDays || 0;

    const tier     = getRankFromXP(xp);
    const nextXP   = getNextRankXP(xp);
    const prevXP   = tier.minXP;
    const progress = nextXP
        ? Math.min(100, Math.round(((xp - prevXP) / (nextXP - prevXP)) * 100))
        : 100;

    // ── compact mode: just icon + bar (for navbar or small widget) ──
    if (compact) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 160 }}>
                <span title={tier.name} style={{ fontSize: 18 }}>{tier.icon}</span>
                <div style={{ flex: 1 }}>
                    <div style={{
                        height: 6, borderRadius: 3,
                        background: 'rgba(255,255,255,0.15)',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${progress}%`,
                            background: tier.color,
                            transition: 'width 0.6s ease',
                        }} />
                    </div>
                </div>
                <span style={{ fontSize: 12, color: '#d1d5db', whiteSpace: 'nowrap' }}>
                    {xp.toLocaleString()} XP
                </span>
            </div>
        );
    }

    // ── Full mode: card with rank name, progress, currencies, streak ──
    return (
        <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            border: `1px solid ${tier.color}44`,
            borderRadius: 16,
            padding: '20px 24px',
            color: '#f1f5f9',
        }}>
            {/* Header: icon + rank name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 36 }}>{tier.icon}</span>
                <div>
                    <div style={{ fontSize: 13, color: '#94a3b8' }}>ระดับ {tier.level}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: tier.color }}>
                        {tier.name}
                    </div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: 13, color: '#94a3b8' }}>XP สะสม</div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{xp.toLocaleString()}</div>
                </div>
            </div>

            {/* XP progress bar */}
            <div style={{ marginBottom: 4 }}>
                <div style={{
                    height: 10, borderRadius: 5,
                    background: 'rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        height: '100%', borderRadius: 5,
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${tier.color}99, ${tier.color})`,
                        transition: 'width 0.8s ease',
                    }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#64748b' }}>
                    <span>{prevXP.toLocaleString()} XP</span>
                    {nextXP
                        ? <span>ถัดไป: {nextXP.toLocaleString()} XP ({nextXP - xp} อีก)</span>
                        : <span style={{ color: tier.color }}>🎉 ระดับสูงสุด!</span>
                    }
                </div>
            </div>

            {/* Currencies + Streak */}
            <div style={{
                display: 'flex', gap: 12, marginTop: 14,
                flexWrap: 'wrap',
            }}>
                <_StatChip icon="🪙" label="CodeCoin" value={coin.toLocaleString()} color="#fbbf24" />
                <_StatChip icon="💎" label="Crystal"  value={crystal.toLocaleString()} color="#67e8f9" />
                <_StatChip icon="🔥" label="Streak"   value={`${streak} วัน`}         color="#f97316" />
            </div>
        </div>
    );
};

const _StatChip = ({ icon, label, value, color }) => (
    <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${color}33`,
        borderRadius: 10,
        padding: '6px 12px',
        display: 'flex', alignItems: 'center', gap: 6,
        flex: '1 1 auto', minWidth: 90,
    }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color }}>{value}</div>
        </div>
    </div>
);
