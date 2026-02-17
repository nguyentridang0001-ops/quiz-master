// pages/badges.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Header from "../components/Header";
import { FiChevronLeft, FiCheckCircle, FiLock } from "react-icons/fi";
import { useSession } from "next-auth/react";

/** =========================
 *  1) BADGE LIST (CHUẨN - giống Profile)
 *  ========================= */
const BADGES = [
  // Attempts
  {
    id: "newbie",
    name: "🥉 Newbie",
    group: "Attempts",
    desc: "Hoàn thành quiz đầu tiên",
  },
  {
    id: "explorer",
    name: "🥈 Quiz Explorer",
    group: "Attempts",
    desc: "Hoàn thành 10 quiz",
  },
  {
    id: "addict",
    name: "🥇 Quiz Addict",
    group: "Attempts",
    desc: "Hoàn thành 50 quiz",
  },
  {
    id: "master",
    name: "💎 Quiz Master",
    group: "Attempts",
    desc: "Hoàn thành 200 quiz",
  },

  // Score
  {
    id: "perfect",
    name: "🎯 Perfect Score",
    group: "Score",
    desc: "Đạt full điểm 1 lần",
  },
  {
    id: "streak10",
    name: "🔥 Win Streak",
    group: "Score",
    desc: "Đúng liên tiếp 10 câu trong 1 lần làm",
  },
  {
    id: "nomistakes5",
    name: "🧠 No Mistakes",
    group: "Score",
    desc: "Full điểm 5 quiz liên tiếp",
  },

  // Create
  {
    id: "builder",
    name: "🛠️ Question Builder",
    group: "Create",
    desc: "Tạo 5 bộ đề",
  },
  {
    id: "factory",
    name: "🏭 Factory Mode",
    group: "Create",
    desc: "Tạo 30 bộ đề",
  },
  {
    id: "multilang",
    name: "✍️ Multi-language",
    group: "Create",
    desc: "Tạo quiz bằng ít nhất 2 ngôn ngữ",
  },

  // Difficulty
  {
    id: "hardcore",
    name: "🧨 Hardcore",
    group: "Difficulty",
    desc: "Hoàn thành quiz độ khó hard",
  },
  {
    id: "bossfight",
    name: "🐉 Boss Fight",
    group: "Difficulty",
    desc: "Hoàn thành quiz có 20 câu trở lên",
  },
];

/** ===== 2) GROUPS FILTER ===== */
const GROUPS = ["All", "Attempts", "Score", "Create", "Difficulty"];

export default function BadgesPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [lang, setLang] = useState("vi");
  const [filter, setFilter] = useState("All");

  const userKey = session?.user?.email || "guest";
  const badgesKey = `qm_badges_${userKey}`;

  // ownedBadges: ["newbie","perfect",...]
  const [ownedBadges, setOwnedBadges] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(badgesKey) || "[]";
      const parsed = JSON.parse(raw);

      // nếu lỡ lưu object -> convert về id
      if (Array.isArray(parsed) && parsed.length && typeof parsed[0] === "object") {
        const ids = parsed.map((x) => x?.id).filter(Boolean);
        setOwnedBadges(ids);
        localStorage.setItem(badgesKey, JSON.stringify(ids));
      } else {
        setOwnedBadges(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      setOwnedBadges([]);
    }
  }, [badgesKey]);

  const ownedSet = useMemo(() => new Set(ownedBadges), [ownedBadges]);

  const filtered = useMemo(() => {
    if (filter === "All") return BADGES;
    return BADGES.filter((b) => b.group === filter);
  }, [filter]);

  const stats = useMemo(() => {
    const total = BADGES.length;
    const got = BADGES.filter((b) => ownedSet.has(b.id)).length;
    return { total, got, missing: total - got };
  }, [ownedSet]);

  return (
    <div className="container">
      <Header lang={lang} setLang={setLang} />

      <div className="topRow">
        <div className="titleWrap">
          <div className="logoBadge">QM</div>
          <div>
            <div className="title">Badges Collection</div>
            <div className="subtitle">
              Tổng: <strong>{stats.total}</strong> · Đã nhận: <strong>{stats.got}</strong> · Chưa nhận:{" "}
              <strong>{stats.missing}</strong>
            </div>
          </div>
        </div>

        <button className="btn ghost" onClick={() => router.push("/")}>
          <FiChevronLeft /> Back
        </button>
      </div>

      <div className="card">
        <div className="filterRow">
          <div className="muted">Lọc theo nhóm:</div>

          <div className="chips">
            {GROUPS.map((g) => (
              <button
                key={g}
                className={`chip ${filter === g ? "active" : ""}`}
                onClick={() => setFilter(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div className="grid">
        {filtered.map((b) => {
          const owned = ownedSet.has(b.id);

          return (
            <div key={b.id} className={`badgeCard ${owned ? "owned" : ""}`}>
              <div className="badgeTop">
                <div className="badgeName">{b.name}</div>

                <div className={`status ${owned ? "ok" : "lock"}`}>
                  {owned ? (
                    <>
                      <FiCheckCircle /> Đã nhận
                    </>
                  ) : (
                    <>
                      <FiLock /> Chưa nhận
                    </>
                  )}
                </div>
              </div>

              <div className="groupTag">{b.group}</div>
              <div className="desc">{b.desc}</div>
            </div>
          );
        })}
      </div>

      <style jsx global>{styles}</style>
    </div>
  );
}

const styles = `
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

html,body,#__next {
  background: linear-gradient(180deg,#f7fbff 0%, #f4f7fb 100%);
  color:var(--text);
  font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial;
}

.container{
  max-width:1200px;
  margin:28px auto;
  padding:18px;
}

.card{
  background:var(--card);
  border-radius:var(--radius);
  padding:16px;
  box-shadow:var(--soft-shadow);
  border:1px solid rgba(16,24,40,0.04);
}

.topRow{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:14px;
  margin-bottom: 14px;
}

.titleWrap{
  display:flex;
  align-items:center;
  gap:12px;
}

.logoBadge{
  width:56px;
  height:56px;
  border-radius:12px;
  display:flex;
  align-items:center;
  justify-content:center;
  color:#fff;
  font-weight:800;
  font-size:18px;
  background: linear-gradient(90deg,#7c5cff,#06b6d4);
}

.title{
  font-weight:800;
  font-size:18px;
}

.subtitle{
  margin-top:4px;
  color:var(--muted);
}

.btn{
  border-radius:10px;
  padding:10px 14px;
  border: 1px solid rgba(15,23,42,0.06);
  background: white;
  cursor:pointer;
  font-weight:600;
  box-shadow: 0 4px 10px rgba(16,24,40,0.04);
}
.btn.ghost{
  background: linear-gradient(180deg,#fff,#fbfdff);
  color:var(--muted-dark);
}

.filterRow{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  flex-wrap:wrap;
}

.muted{ color:var(--muted); }

.chips{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.chip{
  padding:8px 12px;
  border-radius:999px;
  border:1px solid rgba(15,23,42,0.06);
  background: linear-gradient(180deg,#fff,#fbfdff);
  cursor:pointer;
  font-weight:700;
  color:var(--muted-dark);
}
.chip.active{
  background: linear-gradient(90deg,var(--accent-start),var(--accent-end));
  color:#fff;
  border:none;
  box-shadow: 0 10px 26px rgba(99,102,241,0.14);
}

.grid{
  display:grid;
  grid-template-columns: repeat(3, 1fr);
  gap:14px;
}

.badgeCard{
  background: var(--card);
  border-radius: 14px;
  padding: 16px;
  border: 1px solid rgba(15,23,42,0.05);
  box-shadow: var(--soft-shadow);
  transition: transform .12s ease;
}
.badgeCard:hover{
  transform: translateY(-2px);
}

.badgeCard.owned{
  border: 1px solid rgba(99,102,241,0.22);
}

.badgeTop{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:10px;
}

.badgeName{
  font-weight:900;
  font-size:16px;
}

.status{
  display:inline-flex;
  align-items:center;
  gap:6px;
  font-weight:800;
  font-size:12px;
  padding:6px 10px;
  border-radius:999px;
}
.status.ok{
  background: rgba(16,185,129,0.12);
  color: #047857;
}
.status.lock{
  background: rgba(148,163,184,0.18);
  color: #475569;
}

.groupTag{
  margin-top:10px;
  display:inline-block;
  font-weight:800;
  font-size:12px;
  padding:6px 10px;
  border-radius:999px;
  background: rgba(99,102,241,0.12);
  color: #4338ca;
}

.desc{
  margin-top:10px;
  color:var(--muted-dark);
  line-height:1.5;
  font-size:14px;
}

@media (max-width: 980px){
  .grid{ grid-template-columns: 1fr; }
  .container{ padding:12px; }
}
`;
