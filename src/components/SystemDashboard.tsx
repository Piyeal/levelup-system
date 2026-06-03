"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { signOut } from "next-auth/react";
import {
  Dumbbell, Apple, Moon, Smartphone, Code2, Brain, Plus, Check, X,
  Trophy, Flame, Zap, Shield, Swords, Settings as Cog, Trash2,
  ScrollText, BarChart3, Star, ChevronRight, Crown, AlertTriangle, LogOut,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import {
  DIFFICULTY, CATEGORY_COLOR, ACHIEVEMENTS, CATEGORIES, type Difficulty,
} from "@/lib/constants";
import type { GameState } from "@/lib/game";

const CAT_ICON: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Fitness: Dumbbell, Nutrition: Apple, Sleep: Moon, "Screen Time": Smartphone,
  Work: Code2, "Mental Health": Brain, Custom: Star,
};
const ACH_ICON: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Zap, Dumbbell, Flame, Apple, Moon, Code2, Brain, Star, Crown,
};

export default function SystemDashboard() {
  const [state, setState] = useState<GameState | null>(null);
  const [tab, setTab] = useState("quests");
  const [toasts, setToasts] = useState<{ id: number; text: string; color: string }[]>([]);
  const [levelUp, setLevelUp] = useState<{ level: number; rank: { name: string; color: string } } | null>(null);
  const [achievePop, setAchievePop] = useState<(typeof ACHIEVEMENTS)[number] | null>(null);
  const [form, setForm] = useState<{ title: string; category: string; difficulty: Difficulty }>({
    title: "", category: "Custom", difficulty: "Medium",
  });

  const prevLevel = useRef<number | null>(null);
  const prevUnlocked = useRef<Set<string> | null>(null);
  const toastId = useRef(0);

  const pushToast = (text: string, color = "#4db5ff") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text, color }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200);
  };

  // Apply a new state from the server and fire animations off the diff.
  const applyState = useCallback((next: GameState, prevXp?: number) => {
    if (prevXp !== undefined) {
      const delta = next.player.totalXp - prevXp;
      if (delta > 0) pushToast(`+${delta} XP`, "#4db5ff");
    }
    if (prevLevel.current !== null && next.derived.level > prevLevel.current) {
      setLevelUp({ level: next.derived.level, rank: next.derived.rank });
    }
    if (prevUnlocked.current) {
      const fresh = next.unlocked.find((id) => !prevUnlocked.current!.has(id));
      if (fresh) {
        const ach = ACHIEVEMENTS.find((a) => a.id === fresh);
        if (ach) setTimeout(() => setAchievePop(ach), 350);
      }
    }
    prevLevel.current = next.derived.level;
    prevUnlocked.current = new Set(next.unlocked);
    setState(next);
  }, []);

  // initial load
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data: GameState = await res.json();
        prevLevel.current = data.derived.level;
        prevUnlocked.current = new Set(data.unlocked);
        setState(data);
      }
    })();
  }, []);

  const api = async (url: string, opts: RequestInit, prevXp?: number) => {
    const res = await fetch(url, opts);
    if (res.ok) applyState(await res.json(), prevXp);
  };

  const toggle = (id: string) =>
    api("/api/quests/toggle", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    }, state?.player.totalXp);

  const addCustom = () => {
    if (!form.title.trim()) return;
    api("/api/quests/custom", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setForm({ title: "", category: "Custom", difficulty: "Medium" });
    pushToast("Quest added", "#ffcb47");
  };

  const del = (id: string) => api(`/api/quests/${id}`, { method: "DELETE" });

  const savePlayer = (patch: Record<string, unknown>) =>
    api("/api/player", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });

  const reset = () => {
    prevLevel.current = 1;
    prevUnlocked.current = new Set();
    api("/api/reset", { method: "POST" });
    pushToast("System reset", "#ff5c7a");
  };

  const grouped = useMemo(() => {
    const g: Record<string, GameState["quests"]> = {};
    (state?.quests || []).forEach((q) => { (g[q.category] ||= []).push(q); });
    return g;
  }, [state?.quests]);

  if (!state) return <div style={S.boot}>INITIALIZING THE SYSTEM…</div>;

  const { player, derived, weekly } = state;
  const rank = derived.rank;
  const gradeColor =
    ({ S: "#ffcb47", A: "#5ad1a0", B: "#4db5ff", C: "#8b9eff", D: "#ff9d5c", F: "#ff5c7a" } as Record<string, string>)[
      weekly.grade
    ];

  return (
    <div style={S.root}>
      <div style={S.scan} />

      <header style={S.header}>
        <div style={S.brand}>
          <Swords size={18} color="#4db5ff" />
          <span className="glow-text" style={S.brandText}>THE&nbsp;SYSTEM</span>
        </div>
        <div style={S.headerRight}>
          <div className="rank-badge" style={{ ...S.rankBadge, color: rank.color, borderColor: rank.color, boxShadow: `0 0 14px ${rank.color}66, inset 0 0 12px ${rank.color}22` }}>
            {rank.short}
          </div>
          <span style={S.uname}>{player.username}</span>
          <button onClick={() => signOut({ callbackUrl: "/login" })} style={S.logout} title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <section className="panel" style={S.statPanel}>
        <div style={S.statGrid}>
          <Stat label="RANK" value={rank.name} color={rank.color} icon={Shield} />
          <Stat label="LEVEL" value={derived.level} color="#4db5ff" icon={Star} big />
          <Stat label="STREAK" value={`${player.streak}d`} color="#ff9d5c" icon={Flame} sub={`best ${player.bestStreak}d`} />
          <Stat label="QUESTS" value={player.totalCompleted} color="#5ad1a0" icon={Check} sub="completed" />
        </div>
        <div>
          <div style={S.xpLabelRow}>
            <span style={{ color: "#9fc2ee", letterSpacing: 1 }}>EXPERIENCE</span>
            <span style={{ color: "#cfe8ff", fontFamily: "Orbitron, sans-serif" }}>
              {Math.round(derived.xpInLevel)} / {derived.xpForNext}
            </span>
          </div>
          <div style={S.xpBarBg}>
            <div className="xp-fill" style={{ ...S.xpBarFill, width: `${derived.pct}%` }} />
          </div>
        </div>
      </section>

      <nav style={S.tabs}>
        {([
          ["quests", "QUESTS", ScrollText],
          ["stats", "STATS", BarChart3],
          ["achievements", "TROPHIES", Trophy],
          ["settings", "SYSTEM", Cog],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className="tab-btn"
            style={{ ...S.tab, ...(tab === id ? S.tabActive : {}) }}>
            <Icon size={15} /> <span>{label}</span>
          </button>
        ))}
      </nav>

      <main style={S.main}>
        {tab === "quests" && (
          <>
            <h2 style={S.h2}>
              Daily Quests <span style={S.dim}>· {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
            </h2>
            {Object.entries(grouped).map(([cat, qs]) => {
              const Icon = CAT_ICON[cat] || Star;
              const color = CATEGORY_COLOR[cat] || "#ffcb47";
              const doneN = qs.filter((q) => q.done).length;
              return (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <div style={S.catHead}>
                    <Icon size={15} color={color} />
                    <span style={{ color, ...S.catTitle }}>{cat}</span>
                    <span style={S.catCount}>{doneN}/{qs.length}</span>
                  </div>
                  {qs.map((q) => {
                    const d = DIFFICULTY[q.difficulty as Difficulty];
                    return (
                      <div key={q.id} className="quest" style={{ ...S.quest, ...(q.done ? S.questDone : {}) }}>
                        <button className="check" onClick={() => toggle(q.id)}
                          style={{ ...S.check, ...(q.done ? { background: d.color, borderColor: d.color } : { borderColor: d.color }) }}>
                          {q.done && <Check size={14} color="#06101f" strokeWidth={3} />}
                        </button>
                        <div style={{ flex: 1 }}>
                          <div style={{ ...S.questTitle, textDecoration: q.done ? "line-through" : "none", opacity: q.done ? 0.55 : 1 }}>{q.title}</div>
                          <div style={S.questMeta}>
                            <span style={{ ...S.diffTag, color: d.color, borderColor: `${d.color}55` }}>{q.difficulty}</span>
                            <span style={{ color: "#5ad1a0", fontFamily: "Orbitron, sans-serif", fontSize: 11 }}>+{q.xp} XP</span>
                          </div>
                        </div>
                        <button className="del" style={S.del} onClick={() => del(q.id)}><X size={14} /></button>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <div className="panel" style={S.addPanel}>
              <div style={{ ...S.catTitle, color: "#ffcb47", marginBottom: 10 }}>＋ Forge a Custom Quest</div>
              <input className="inp" style={S.input} placeholder="Quest title…" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addCustom()} />
              <div style={S.formRow}>
                <select className="inp" style={S.select} value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <select className="inp" style={S.select} value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}>
                  {(Object.keys(DIFFICULTY) as Difficulty[]).map((dk) => (
                    <option key={dk} value={dk}>{dk} · {DIFFICULTY[dk].xp}xp</option>
                  ))}
                </select>
                <button className="primary-btn" style={S.addBtn} onClick={addCustom}><Plus size={16} /> Add</button>
              </div>
            </div>
          </>
        )}

        {tab === "stats" && (
          <>
            <h2 style={S.h2}>Weekly Evaluation</h2>
            <div className="panel" style={S.reportCard}>
              <div style={S.reportLeft}>
                <div style={{ fontSize: 11, color: "#9fc2ee", letterSpacing: 2 }}>WEEKLY GRADE</div>
                <div style={{ ...S.gradeBig, color: gradeColor, textShadow: `0 0 24px ${gradeColor}` }}>{weekly.grade}</div>
                <div style={S.dim}>{weekly.completed}/{weekly.total} quests · {Math.round(weekly.ratio * 100)}%</div>
              </div>
              <div style={S.reportRight}>
                {Object.entries(weekly.cat).map(([k, v]) => (
                  <div key={k} style={S.miniStat}>
                    <span style={{ color: CATEGORY_COLOR[k] }}>{k}</span>
                    <b style={{ color: "#cfe8ff" }}>{v}</b>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel" style={S.chartPanel}>
              <div style={{ ...S.catTitle, color: "#4db5ff", marginBottom: 12 }}>XP — Last 7 Days</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weekly.chart} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c2c4a" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#7f9bc4", fontSize: 11 }} axisLine={{ stroke: "#1c2c4a" }} tickLine={false} />
                  <YAxis tick={{ fill: "#7f9bc4", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgba(77,181,255,0.08)" }}
                    contentStyle={{ background: "#0a1426", border: "1px solid #234", borderRadius: 8, color: "#cfe8ff", fontSize: 12 }} />
                  <Bar dataKey="xp" radius={[4, 4, 0, 0]}>
                    {weekly.chart.map((_, i) => <Cell key={i} fill="#4db5ff" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="panel" style={S.logPanel}>
              <div style={{ ...S.catTitle, color: "#5ad1a0", marginBottom: 10 }}>Activity History</div>
              {state.log.length === 0 && <div style={S.dim}>No activity yet. Complete a quest to begin.</div>}
              {state.log.map((e, i) => (
                <div key={i} style={S.logRow}>
                  <span style={{ color: e.xp < 0 ? "#ff5c7a" : "#9fc2ee", display: "flex", alignItems: "center", gap: 6 }}>
                    {e.xp < 0 ? <AlertTriangle size={12} /> : <ChevronRight size={12} />}{e.text}
                  </span>
                  <span style={{ color: e.xp < 0 ? "#ff5c7a" : "#5ad1a0", fontFamily: "Orbitron, sans-serif", fontSize: 12 }}>
                    {e.xp > 0 ? "+" : ""}{e.xp}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "achievements" && (
          <>
            <h2 style={S.h2}>Achievements <span style={S.dim}>· {state.unlocked.length}/{ACHIEVEMENTS.length}</span></h2>
            <div style={S.achGrid}>
              {ACHIEVEMENTS.map((a) => {
                const got = state.unlocked.includes(a.id);
                const Icon = ACH_ICON[a.icon] || Star;
                return (
                  <div key={a.id} className={got ? "ach unlocked" : "ach"} style={{ ...S.achCard, ...(got ? S.achOn : S.achOff) }}>
                    <Icon size={22} color={got ? "#ffcb47" : "#3b4d6b"} />
                    <div style={{ ...S.achName, color: got ? "#ffe9a8" : "#52688c" }}>{a.name}</div>
                    <div style={{ ...S.achDesc, color: got ? "#9fc2ee" : "#3b4d6b" }}>{a.desc}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "settings" && (
          <>
            <h2 style={S.h2}>System Configuration</h2>
            <div className="panel" style={S.addPanel}>
              <label style={S.fieldLabel}>Hunter Name</label>
              <input className="inp" style={S.input} defaultValue={player.username}
                onBlur={(e) => savePlayer({ username: e.target.value })} />
              <div style={S.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={S.fieldLabel}>Protein Goal (g)</label>
                  <input className="inp" type="number" style={S.input} defaultValue={player.proteinGoal}
                    onBlur={(e) => savePlayer({ proteinGoal: +e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.fieldLabel}>Gym Goal (days/wk)</label>
                  <input className="inp" type="number" style={S.input} defaultValue={player.gymGoal}
                    onBlur={(e) => savePlayer({ gymGoal: +e.target.value })} />
                </div>
              </div>
            </div>
            <div className="panel" style={{ ...S.addPanel, borderColor: "rgba(255,92,122,0.35)" }}>
              <div style={{ color: "#ff8aa3", fontSize: 13, marginBottom: 10 }}>Reset all progress (cannot be undone).</div>
              <button className="danger-btn" style={S.dangerBtn} onClick={reset}>
                <Trash2 size={15} /> Reset The System
              </button>
            </div>
            <p style={{ ...S.dim, fontSize: 11, textAlign: "center", marginTop: 16 }}>
              Consistency &gt; perfection. Missing one day won&apos;t break you — long streaks are what level you up.
            </p>
          </>
        )}
      </main>

      <div style={S.toastWrap}>
        {toasts.map((t) => (
          <div key={t.id} className="xp-toast" style={{ ...S.toast, color: t.color, borderColor: t.color, textShadow: `0 0 12px ${t.color}` }}>
            {t.text}
          </div>
        ))}
      </div>

      {levelUp && (
        <div style={S.overlay} onClick={() => setLevelUp(null)}>
          <div className="levelup-card" style={S.levelCard} onClick={(e) => e.stopPropagation()}>
            <div style={S.levelArise}>[ NOTIFICATION ]</div>
            <div className="glow-text" style={S.levelHeading}>LEVEL UP</div>
            <div style={S.levelNum}>{levelUp.level}</div>
            <div style={{ color: levelUp.rank.color, fontFamily: "Orbitron, sans-serif", letterSpacing: 2, marginTop: 6 }}>
              {levelUp.rank.name}
            </div>
            <button className="primary-btn" style={{ ...S.addBtn, marginTop: 22, justifyContent: "center" }} onClick={() => setLevelUp(null)}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {achievePop && (
        <div className="ach-pop" style={S.achPop} onClick={() => setAchievePop(null)}>
          <Trophy size={26} color="#ffcb47" />
          <div>
            <div style={{ fontSize: 10, color: "#ffcb47", letterSpacing: 2 }}>ACHIEVEMENT UNLOCKED</div>
            <div style={{ color: "#ffe9a8", fontFamily: "Orbitron, sans-serif", fontSize: 15 }}>{achievePop.name}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color, icon: Icon, big, sub }: {
  label: string; value: React.ReactNode; color: string;
  icon: React.ComponentType<{ size?: number; color?: string }>; big?: boolean; sub?: string;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={S.statTop}><Icon size={13} color={color} /><span style={S.statLabel}>{label}</span></div>
      <div style={{ ...S.statValue, color, fontSize: big ? 30 : 18 }}>{value}</div>
      {sub && <div style={S.statSub}>{sub}</div>}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  boot: { minHeight: "100vh", display: "grid", placeItems: "center", color: "#4db5ff", fontFamily: "Orbitron, monospace", letterSpacing: 3 },
  root: { position: "relative", minHeight: "100vh", maxWidth: 720, margin: "0 auto", padding: "16px 14px 60px", color: "#cfe8ff", background: "radial-gradient(900px 500px at 50% -10%, #0e2042 0%, #070b16 55%, #05070d 100%)", overflow: "hidden" },
  scan: { position: "fixed", inset: 0, pointerEvents: "none", background: "repeating-linear-gradient(0deg, rgba(77,181,255,0.025) 0px, rgba(77,181,255,0.025) 1px, transparent 1px, transparent 3px)", zIndex: 0 },
  header: { position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  brand: { display: "flex", alignItems: "center", gap: 8 },
  brandText: { fontFamily: "Orbitron, sans-serif", fontWeight: 700, letterSpacing: 4, fontSize: 15, color: "#4db5ff" },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  uname: { fontSize: 13, color: "#9fc2ee", letterSpacing: 1 },
  logout: { background: "transparent", border: "1px solid #1c3358", borderRadius: 8, color: "#6f8bb5", padding: 6, cursor: "pointer", display: "grid", placeItems: "center" },
  rankBadge: { width: 30, height: 30, borderRadius: 8, border: "1.5px solid", display: "grid", placeItems: "center", fontFamily: "Orbitron, sans-serif", fontWeight: 700, fontSize: 14 },
  statPanel: { position: "relative", zIndex: 1, padding: "16px 16px 18px", marginBottom: 14 },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 },
  statTop: { display: "flex", alignItems: "center", justifyContent: "center", gap: 4 },
  statLabel: { fontSize: 9, letterSpacing: 1.5, color: "#6f8bb5" },
  statValue: { fontFamily: "Orbitron, sans-serif", fontWeight: 700, lineHeight: 1.1, marginTop: 4 },
  statSub: { fontSize: 9, color: "#5d77a0", marginTop: 2 },
  xpLabelRow: { display: "flex", justifyContent: "space-between", fontSize: 11, letterSpacing: 1, marginBottom: 6 },
  xpBarBg: { height: 12, borderRadius: 7, background: "rgba(10,22,46,0.9)", border: "1px solid #1c3358", overflow: "hidden" },
  xpBarFill: { height: "100%", borderRadius: 7, background: "linear-gradient(90deg,#1e6fff,#4db5ff,#6ad9ff)", boxShadow: "0 0 14px #4db5ffaa", transition: "width .6s cubic-bezier(.22,1,.36,1)" },
  tabs: { position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 16 },
  tab: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 4px", borderRadius: 9, border: "1px solid #15294a", background: "rgba(10,20,40,0.5)", color: "#6f8bb5", fontSize: 11, letterSpacing: 1, fontFamily: "'Chakra Petch',sans-serif", cursor: "pointer" },
  tabActive: { color: "#4db5ff", borderColor: "#2a6fd0", background: "rgba(20,50,95,0.6)", boxShadow: "0 0 14px rgba(77,181,255,0.25)" },
  main: { position: "relative", zIndex: 1 },
  h2: { fontFamily: "Orbitron, sans-serif", fontSize: 16, letterSpacing: 1, color: "#dcecff", margin: "4px 0 14px" },
  dim: { color: "#6f8bb5", fontWeight: 400, fontSize: 13 },
  catHead: { display: "flex", alignItems: "center", gap: 7, marginBottom: 8 },
  catTitle: { fontFamily: "Orbitron, sans-serif", fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" },
  catCount: { marginLeft: "auto", fontSize: 11, color: "#6f8bb5", fontFamily: "Orbitron, sans-serif" },
  quest: { display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", marginBottom: 7, borderRadius: 11, border: "1px solid #16294a", background: "linear-gradient(135deg, rgba(13,26,50,0.85), rgba(8,16,32,0.85))" },
  questDone: { borderColor: "#1d3a2e", background: "linear-gradient(135deg, rgba(12,30,24,0.6), rgba(8,18,20,0.6))" },
  check: { width: 24, height: 24, minWidth: 24, borderRadius: 7, border: "2px solid", background: "transparent", display: "grid", placeItems: "center", cursor: "pointer" },
  questTitle: { fontSize: 14, color: "#dcecff" },
  questMeta: { display: "flex", alignItems: "center", gap: 8, marginTop: 4 },
  diffTag: { fontSize: 9, letterSpacing: 1, padding: "2px 7px", borderRadius: 6, border: "1px solid", fontFamily: "Orbitron, sans-serif" },
  del: { background: "transparent", border: "none", color: "#3b4d6b", cursor: "pointer", padding: 4 },
  addPanel: { padding: 16, marginTop: 8, marginBottom: 8 },
  fieldLabel: { display: "block", fontSize: 11, letterSpacing: 1, color: "#7f9bc4", marginBottom: 5 },
  input: { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 9, background: "rgba(6,14,28,0.9)", border: "1px solid #1c3358", color: "#dcecff", fontSize: 14, fontFamily: "'Chakra Petch',sans-serif", outline: "none", marginBottom: 10 },
  formRow: { display: "flex", gap: 8, alignItems: "flex-end" },
  select: { flex: 1, padding: "10px 8px", borderRadius: 9, background: "rgba(6,14,28,0.9)", border: "1px solid #1c3358", color: "#dcecff", fontSize: 12, fontFamily: "'Chakra Petch',sans-serif", outline: "none" },
  addBtn: { display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 9, border: "1px solid #2a6fd0", background: "linear-gradient(135deg,#1e6fff,#2a9fff)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Chakra Petch',sans-serif" },
  dangerBtn: { display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 9, border: "1px solid #ff5c7a55", background: "rgba(60,12,24,0.6)", color: "#ff8aa3", fontSize: 13, cursor: "pointer", fontFamily: "'Chakra Petch',sans-serif" },
  reportCard: { display: "flex", gap: 16, padding: 18, marginBottom: 14 },
  reportLeft: { textAlign: "center", minWidth: 110 },
  gradeBig: { fontFamily: "Orbitron, sans-serif", fontWeight: 800, fontSize: 64, lineHeight: 1, margin: "4px 0" },
  reportRight: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 7 },
  miniStat: { display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid #14233f", paddingBottom: 5 },
  chartPanel: { padding: 16, marginBottom: 14 },
  logPanel: { padding: 16 },
  logRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #122039", fontSize: 13 },
  achGrid: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 },
  achCard: { padding: 16, borderRadius: 12, textAlign: "center", border: "1px solid" },
  achOn: { borderColor: "#ffcb4755", background: "linear-gradient(135deg, rgba(45,38,12,0.6), rgba(20,16,6,0.6))", boxShadow: "0 0 16px rgba(255,203,71,0.12)" },
  achOff: { borderColor: "#16294a", background: "rgba(8,16,32,0.5)" },
  achName: { fontFamily: "Orbitron, sans-serif", fontSize: 13, marginTop: 8 },
  achDesc: { fontSize: 11, marginTop: 4, lineHeight: 1.4 },
  toastWrap: { position: "fixed", bottom: 30, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, zIndex: 50, pointerEvents: "none" },
  toast: { fontFamily: "Orbitron, sans-serif", fontWeight: 700, fontSize: 20, padding: "6px 18px", borderRadius: 10, border: "1px solid", background: "rgba(5,10,22,0.85)" },
  overlay: { position: "fixed", inset: 0, background: "rgba(3,6,14,0.86)", display: "grid", placeItems: "center", zIndex: 60, backdropFilter: "blur(3px)" },
  levelCard: { textAlign: "center", padding: "32px 44px", borderRadius: 16, border: "1px solid #2a6fd0", background: "linear-gradient(160deg, rgba(14,32,66,0.96), rgba(7,12,26,0.96))", boxShadow: "0 0 40px rgba(77,181,255,0.4), inset 0 0 30px rgba(77,181,255,0.1)" },
  levelArise: { fontFamily: "Orbitron, sans-serif", fontSize: 11, letterSpacing: 3, color: "#6ad9ff", marginBottom: 8 },
  levelHeading: { fontFamily: "Orbitron, sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: 4, color: "#4db5ff" },
  levelNum: { fontFamily: "Orbitron, sans-serif", fontWeight: 800, fontSize: 76, color: "#6ad9ff", textShadow: "0 0 30px #4db5ff", lineHeight: 1, marginTop: 6 },
  achPop: { position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderRadius: 12, border: "1px solid #ffcb4766", background: "linear-gradient(135deg, rgba(40,32,10,0.96), rgba(18,14,5,0.96))", boxShadow: "0 0 30px rgba(255,203,71,0.3)", zIndex: 70, cursor: "pointer" },
};
