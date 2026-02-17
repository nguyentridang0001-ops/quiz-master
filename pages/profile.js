// pages/profile.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import Header from "../components/Header";
import { FiChevronLeft, FiInfo } from "react-icons/fi";
import { useSession } from "next-auth/react";

/* client-only Charts component */
const Charts = dynamic(
  () =>
    Promise.resolve(function InnerCharts({ pieData, barData, COLORS }) {
      const {
        ResponsiveContainer,
        PieChart,
        Pie,
        Cell,
        BarChart,
        Bar,
        XAxis,
        YAxis,
        Tooltip,
      } = require("recharts");

      return (
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
          <div style={{ width: 220, height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={40} outerRadius={60} label>
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ color: "var(--muted)" }}>
              Total badges: <strong>{pieData[0]?.value ?? 0}</strong>
            </div>
            <div style={{ color: "var(--muted)", marginTop: 8 }}>Recent attempts</div>

            <div style={{ height: 200, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="score" fill="#7c3aed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    }),
  { ssr: false }
);

/* =========================
   BADGE DEFINITIONS (CHUẨN)
   ========================= */
const BADGE_LIST = [
  // attempts
  { id: "newbie", name: "🥉 Newbie", desc: "Hoàn thành quiz đầu tiên", type: "attempts" },
  { id: "explorer", name: "🥈 Quiz Explorer", desc: "Hoàn thành 10 quiz", type: "attempts" },
  { id: "addict", name: "🥇 Quiz Addict", desc: "Hoàn thành 50 quiz", type: "attempts" },
  { id: "master", name: "💎 Quiz Master", desc: "Hoàn thành 200 quiz", type: "attempts" },

  // score
  { id: "perfect", name: "🎯 Perfect Score", desc: "Đạt full điểm 1 lần", type: "score" },
  { id: "streak10", name: "🔥 Win Streak", desc: "Đúng liên tiếp 10 câu trong 1 lần làm", type: "score" },
  { id: "nomistakes5", name: "🧠 No Mistakes", desc: "Full điểm 5 quiz liên tiếp", type: "score" },

  // create (future)
  { id: "builder", name: "🛠️ Question Builder", desc: "Tạo 5 bộ đề", type: "create" },
  { id: "factory", name: "🏭 Factory Mode", desc: "Tạo 30 bộ đề", type: "create" },
  { id: "multilang", name: "✍️ Multi-language", desc: "Tạo quiz bằng ít nhất 2 ngôn ngữ", type: "create" },

  // difficulty / boss
  { id: "hardcore", name: "🧨 Hardcore", desc: "Hoàn thành quiz độ khó hard", type: "difficulty" },
  { id: "bossfight", name: "🐉 Boss Fight", desc: "Hoàn thành quiz có 20 câu trở lên", type: "difficulty" },
];

function safeParseJSON(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/* =========================
   BADGE ENGINE
   ========================= */
function computeBadgesFromBoard(board) {
  const attempts = Array.isArray(board) ? board : [];
  const totalAttempts = attempts.length;

  const fullScoreAttempts = attempts.filter((a) => {
    const c = Number(a.correct) || 0;
    const t = Number(a.total) || 0;
    return t > 0 && c === t;
  });

  const hasBossFight = attempts.some((a) => (Number(a.total) || 0) >= 20);
  const hasStreak10 = attempts.some((a) => (Number(a.streak) || 0) >= 10);

  // perfect 5 in a row
  const attemptsChrono = attempts.slice().reverse();
  let maxPerfectStreak = 0;
  let cur = 0;

  for (const a of attemptsChrono) {
    const c = Number(a.correct) || 0;
    const t = Number(a.total) || 0;
    const perfect = t > 0 && c === t;

    if (perfect) {
      cur++;
      maxPerfectStreak = Math.max(maxPerfectStreak, cur);
    } else {
      cur = 0;
    }
  }

  const hasHardcore = attempts.some((a) => String(a.difficulty || "").toLowerCase() === "hard");

  const langs = new Set(
    attempts
      .map((a) => a.lang)
      .filter(Boolean)
      .map((x) => String(x).toLowerCase())
  );
  const hasMultiLang = langs.size >= 2;

  const createdCount = Number(localStorage.getItem("qm_created_count") || 0);

  const unlocked = new Set();

  // attempts
  if (totalAttempts >= 1) unlocked.add("newbie");
  if (totalAttempts >= 10) unlocked.add("explorer");
  if (totalAttempts >= 50) unlocked.add("addict");
  if (totalAttempts >= 200) unlocked.add("master");

  // score
  if (fullScoreAttempts.length >= 1) unlocked.add("perfect");
  if (hasStreak10) unlocked.add("streak10");
  if (maxPerfectStreak >= 5) unlocked.add("nomistakes5");

  // create
  if (createdCount >= 5) unlocked.add("builder");
  if (createdCount >= 30) unlocked.add("factory");
  if (hasMultiLang) unlocked.add("multilang");

  // difficulty
  if (hasHardcore) unlocked.add("hardcore");
  if (hasBossFight) unlocked.add("bossfight");

  const unlockedBadges = BADGE_LIST.filter((b) => unlocked.has(b.id));

  return { unlockedBadges };
}

export default function Profile() {
  const router = useRouter();
  const [badges, setBadges] = useState([]); // list badge objects
  const [board, setBoard] = useState([]);
  const [lang, setLang] = useState("vi");

  const { data: session } = useSession();
  const userKey = session?.user?.email || "guest";

  useEffect(() => {
    if (!session) return;

    const boardKey = `qm_leaderboard_${userKey}`;
    const rawBoard = safeParseJSON(localStorage.getItem(boardKey) || "[]", []);
    const reversed = rawBoard.slice().reverse();
    setBoard(reversed);

    // compute badges
    const { unlockedBadges } = computeBadgesFromBoard(reversed);

    // ✅ LƯU CHUẨN: chỉ lưu ID
    const unlockedIds = unlockedBadges.map((b) => b.id);

    const badgesKey = `qm_badges_${userKey}`;
    localStorage.setItem(badgesKey, JSON.stringify(unlockedIds));

    setBadges(unlockedBadges);
  }, [session, userKey]);

  const totalBadgeCount = BADGE_LIST.length;

  const pieData = useMemo(() => {
    return [
      { name: "Badges", value: Math.max(0, badges.length || 0) },
      { name: "Remaining", value: Math.max(0, totalBadgeCount - (badges.length || 0)) },
    ];
  }, [badges.length, totalBadgeCount]);

  const COLORS = ["#7c3aed", "#94a3b8"];

  const barData = useMemo(() => {
    return board.slice(0, 10).map((b, i) => {
      const correct = Number(b.correct) || 0;
      const total = Number(b.total) || 1;
      const score = Math.round((correct / (total || 1)) * 100);
      return { name: `#${i + 1}`, score };
    });
  }, [board]);

  const lockedBadges = useMemo(() => {
    const unlockedIds = new Set(badges.map((b) => b.id));
    return BADGE_LIST.filter((b) => !unlockedIds.has(b.id));
  }, [badges]);

  return (
    <div className="container">
      <Header lang={lang} setLang={setLang} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div className="logoBadge">QM</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>Profile — Badges & Stats</div>
            <div style={{ color: "var(--muted)" }}>Lịch sử & huy hiệu bạn đã đạt</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn ghost" onClick={() => router.push("/badges")}>
            <FiInfo /> Badge Guide
          </button>

          <button className="btn ghost" onClick={() => router.push("/")}>
            <FiChevronLeft /> Back
          </button>
        </div>
      </div>

      <div className="gridWrap" style={{ gridTemplateColumns: "360px 1fr" }}>
        <aside className="sidebar">
          <div className="card">
            <h3 className="h3">Your Badges</h3>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {badges.length ? (
                badges.map((b) => (
                  <div key={b.id} className="badgePill" title={b.desc}>
                    {b.name}
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--muted)" }}>Chưa có badge nào</div>
              )}
            </div>

            <div style={{ height: 14 }} />

            <h3 className="h3">Locked Badges</h3>
            <div style={{ display: "grid", gap: 8 }}>
              {lockedBadges.slice(0, 6).map((b) => (
                <div key={b.id} className="lockedBadge">
                  <div style={{ fontWeight: 800 }}>{b.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>{b.desc}</div>
                </div>
              ))}
              {lockedBadges.length > 6 && (
                <div style={{ color: "var(--muted)", fontSize: 13 }}>
                  +{lockedBadges.length - 6} badge khác (xem đầy đủ ở Badge Guide)
                </div>
              )}
            </div>

            <div style={{ height: 12 }} />

            <h3 className="h3">Leaderboard (local)</h3>
            <div style={{ maxHeight: 200, overflow: "auto", marginTop: 8 }}>
              {board.length ? (
                board.map((b, i) => (
                  <div key={i} className="boardRow">
                    <div style={{ color: "var(--muted)" }}>
                      {new Date(b.date || b.time || Date.now()).toLocaleString()}
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      {b.correct}/{b.total}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--muted)" }}>Chưa có kết quả</div>
              )}
            </div>
          </div>
        </aside>

        <main>
          <div className="card">
            <h3 className="h3">Statistics</h3>
            <Charts pieData={pieData} barData={barData} COLORS={COLORS} />
          </div>

          <div style={{ height: 12 }} />

          <div className="card">
            <h3 className="h3">History (full)</h3>
            <div style={{ maxHeight: 360, overflow: "auto", marginTop: 8 }}>
              {board.length ? (
                board.map((b, i) => (
                  <div key={i} className="boardRow historyRow">
                    <div style={{ color: "var(--muted)" }}>
                      {b.time || new Date(b.date || Date.now()).toLocaleString()}
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      {b.correct}/{b.total} ·{" "}
                      {Math.round(((Number(b.correct) || 0) / (Number(b.total) || 1)) * 100)}%
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--muted)" }}>Chưa có lịch sử</div>
              )}
            </div>
          </div>
        </main>
      </div>

      <style jsx global>{profileStyles}</style>
    </div>
  );
}

const profileStyles = `
:root{
  --bg: #f4f7fb;
  --card: #ffffff;
  --muted: #6b7280;
  --muted-dark: #374151;
  --text: #0f172a;
  --accent-start: #6366f1;
  --accent-end: #06b6d4;
  --soft-shadow: 0 6px 18px rgba(15,23,42,0.06);
  --radius: 14px;
}
*,*::before,*::after{ box-sizing:border-box; }
html,body,#__next { background: linear-gradient(180deg,#f7fbff 0%, #f4f7fb 100%); color:var(--text); font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial; }
.container{ max-width:1200px; margin:28px auto; padding:18px; }
.card{ background:var(--card); border-radius:var(--radius); padding:18px; box-shadow:var(--soft-shadow); border:1px solid rgba(16,24,40,0.04); }
.logoBadge{ width:56px; height:56px; border-radius:12px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:18px; background: linear-gradient(90deg,#7c5cff,#06b6d4); }
.gridWrap{ display:grid; grid-template-columns:360px 1fr; gap:20px; align-items:start; }
.h3{ font-size:16px; margin:0 0 12px 0; font-weight:700; color:var(--text); }
.badgePill{ padding:8px 10px; border-radius:8px; background: linear-gradient(90deg,#7c3aed,#06b6d4); color:#fff; font-weight:700; }
.boardRow{ display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed rgba(15,23,42,0.03); }
.lockedBadge{ padding:10px; border-radius:12px; background: rgba(15,23,42,0.03); border: 1px solid rgba(15,23,42,0.04); }
.muted{ color:var(--muted); }
@media (max-width:980px){ .gridWrap{ grid-template-columns: 1fr; } .container{ padding:12px; } }
`;
