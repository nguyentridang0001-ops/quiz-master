// pages/quiz.js
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import {
  FiCheckCircle,
  FiXCircle,
  FiList,
  FiClock,
  FiAward,
  FiHelpCircle,
} from "react-icons/fi";
import { motion } from "framer-motion";
import Header from "../components/Header";

// ✅ next-auth
import { useSession } from "next-auth/react";

export default function QuizPage() {
  const router = useRouter();

  // ✅ session
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email || null;

  // ⚠️ userKey chuẩn: nếu chưa login thì guest
  const userKey = userEmail || "guest";

  const [quizzes, setQuizzes] = useState(null);
  const [meta, setMeta] = useState(null);
  const [current, setCurrent] = useState({ qIdx: 0, quizIdx: 0 });
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [hints, setHints] = useState({});
  const [timerSec, setTimerSec] = useState(null);
  const timerRef = useRef(null);

  const [lang, setLang] = useState("vi");

  // =========================
  // ✅ BADGE SYSTEM (SYNC KEY)
  // =========================
  function getBadgeKey(key) {
    return `qm_badges_${key}`;
  }

  function loadBadgesByKey(key) {
    try {
      return JSON.parse(localStorage.getItem(getBadgeKey(key)) || "{}");
    } catch {
      return {};
    }
  }

  function saveBadgesByKey(key, obj) {
    try {
      localStorage.setItem(getBadgeKey(key), JSON.stringify(obj));
    } catch (e) {}
  }

  function computeBadges({ correct, total, mode }) {
    const percent = total > 0 ? correct / total : 0;

    return {
      first_quiz: true,
      perfect_score: percent === 1,
      above_80: percent >= 0.8,
      above_50: percent >= 0.5,
      test_mode: mode === "test",
    };
  }

  function unlockBadgesForUserKey(key, result) {
    const existing = loadBadgesByKey(key);
    const next = { ...existing };

    Object.keys(result).forEach((badgeId) => {
      if (!next[badgeId]) {
        next[badgeId] = {
          unlocked: false,
          unlockedAt: null,
        };
      }

      if (result[badgeId] && !next[badgeId].unlocked) {
        next[badgeId].unlocked = true;
        next[badgeId].unlockedAt = new Date().toISOString();
      }
    });

    saveBadgesByKey(key, next);
  }

  // ==========================================
  // ✅ AUTO-MERGE: guest badges -> email badges
  // ==========================================
  useEffect(() => {
    // Khi user vừa login, nếu trước đó có badge ở guest
    // thì merge sang email để đồng bộ tuyệt đối
    if (!userEmail) return;

    try {
      const guestBadges = loadBadgesByKey("guest");
      const emailBadges = loadBadgesByKey(userEmail);

      const merged = { ...emailBadges };

      Object.keys(guestBadges || {}).forEach((badgeId) => {
        const g = guestBadges[badgeId];
        const e = emailBadges[badgeId];

        // Nếu guest đã unlock mà email chưa unlock -> copy
        if (g?.unlocked && !e?.unlocked) {
          merged[badgeId] = {
            unlocked: true,
            unlockedAt: g.unlockedAt || new Date().toISOString(),
          };
        }

        // Nếu email chưa có badgeId -> copy nguyên trạng
        if (!merged[badgeId]) {
          merged[badgeId] = g;
        }
      });

      saveBadgesByKey(userEmail, merged);

      // Optional: xoá guest để tránh lệch sau này
      // localStorage.removeItem(getBadgeKey("guest"));
    } catch (e) {
      // ignore
    }
  }, [userEmail]);

  // load quiz data and set a valid current question immediately (robust)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("quizData");
      const m = sessionStorage.getItem("quizMeta");
      if (!raw || !m) {
        router.push("/");
        return;
      }
      const parsedQuizzes = JSON.parse(raw);
      const parsedMeta = JSON.parse(m);

      // flatten to find first question index
      const flatLocal = [];
      (parsedQuizzes || []).forEach((quiz, qi) => {
        (quiz.questions || []).forEach((q, qj) =>
          flatLocal.push({ ...q, quizIndex: qi, qIndex: qj })
        );
      });

      if (flatLocal.length === 0) {
        setQuizzes(parsedQuizzes);
        setMeta(parsedMeta);
        setCurrent({ qIdx: 0, quizIdx: 0 });
      } else {
        setQuizzes(parsedQuizzes);
        setMeta(parsedMeta);
        setCurrent({
          qIdx: flatLocal[0].qIndex,
          quizIdx: flatLocal[0].quizIndex,
        });
      }

      if (parsedMeta?.settings?.lang) setLang(parsedMeta.settings.lang);
    } catch (e) {
      console.error("Failed to load quiz data", e);
      router.push("/");
    }
  }, [router]);

  // helper flatten based on current quizzes state
  function flatten(quizzesArg = quizzes) {
    const arr = [];
    if (!Array.isArray(quizzesArg)) return arr;
    quizzesArg.forEach((quiz, qi) => {
      (quiz.questions || []).forEach((q, qj) =>
        arr.push({ ...q, quizIndex: qi, qIndex: qj })
      );
    });
    return arr;
  }

  // timer init
  useEffect(() => {
    if (!meta) return;
    const mode = meta.mode;
    const tm = Number(meta.settings?.timerMinutes) || 0;
    if (mode === "test" && tm && tm > 0) {
      const seconds = Math.max(10, Math.floor(tm * 60));
      setTimerSec(seconds);
      timerRef.current = setInterval(() => {
        setTimerSec((s) => {
          if (s <= 1) {
            clearInterval(timerRef.current);
            submitAll(true);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [meta]);

  const flat = flatten();
  const total = flat.length;
  const curIndexFlat = flat.findIndex(
    (f) => f.quizIndex === current.quizIdx && f.qIndex === current.qIdx
  );

  function keyFor(i) {
    return `q-${i}`;
  }
  function setAnswer(i, val) {
    setAnswers((prev) => ({ ...prev, [keyFor(i)]: val }));
  }

  function isCorrect(i) {
    const q = flat[i];
    if (!q) return false;
    const user = answers[keyFor(i)];
    if (user === undefined || user === null || user === "") return false;
    if (q.type === "mc" || q.type === "tf")
      return String(user).toUpperCase() === String(q.answer).toUpperCase();
    const correct = String(q.answer || "").trim().toLowerCase(),
      got = String(user || "").trim().toLowerCase();
    return got && (got === correct || correct.includes(got) || got.includes(correct));
  }

  function handleSelect(i, option) {
    if (submitted) return;
    setAnswer(i, option);
  }

  function goTo(flatIndex) {
    const f = flat[flatIndex];
    if (!f) return;
    setCurrent({ quizIdx: f.quizIndex, qIdx: f.qIndex });
    window.scrollTo({ top: 120, behavior: "smooth" });
  }

  function submitAll(auto = false) {
    let correctCount = 0;
    flat.forEach((q, i) => {
      if (isCorrect(i)) correctCount++;
    });

    const finalScore = { correct: correctCount, total };
    setScore(finalScore);
    setSubmitted(true);

    // ✅ BADGE: unlock badge theo kết quả (đúng key)
    try {
      const badgeResult = computeBadges({
        correct: correctCount,
        total,
        mode: meta?.mode || "unknown",
      });

      // ⭐ QUAN TRỌNG: nếu login rồi thì lưu theo email
      // nếu chưa login thì lưu guest
      const badgeSaveKey = userEmail || "guest";
      unlockBadgesForUserKey(badgeSaveKey, badgeResult);
    } catch (e) {}

    // ✅ Leaderboard theo user
    try {
      const boardSaveKey = userEmail || "guest";
      const boardKey = `qm_leaderboard_${boardSaveKey}`;
      const board = JSON.parse(localStorage.getItem(boardKey) || "[]");

      board.push({
        date: new Date().toISOString(),
        correct: correctCount,
        total,
        mode: meta?.mode || "unknown",
        time: new Date().toLocaleString(),
      });

      localStorage.setItem(boardKey, JSON.stringify(board.slice(-200)));
    } catch (e) {
      // ignore
    }

    if (timerRef.current) clearInterval(timerRef.current);
    if (!auto) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function fetchHint(i) {
    const q = flat[i];
    const key = keyFor(i);
    if (hints[key]) return;
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q.question,
          snippet: (meta?.settings?.snippets || [])[q.quizIndex],
          lang: meta?.settings?.lang || "vi",
        }),
      });
      const j = await res.json();
      setHints((prev) => ({ ...prev, [key]: j.hint || "Không có gợi ý" }));
    } catch (e) {
      setHints((prev) => ({ ...prev, [key]: "Lỗi khi lấy gợi ý" }));
    }
  }

  if (!quizzes || !meta)
    return (
      <div className="container">
        <Header lang={lang} setLang={setLang} />
        <div className="card" style={{ marginTop: 18 }}>
          Đang load quiz…
        </div>
        <style jsx global>{commonStyles}</style>
      </div>
    );

  if (total === 0)
    return (
      <div className="container">
        <Header lang={lang} setLang={setLang} />
        <div className="card" style={{ marginTop: 18 }}>
          <h3>Không có câu hỏi</h3>
          <div style={{ color: "var(--muted)" }}>
            Quiz không có câu hỏi hợp lệ. Quay lại để tạo đề mới.
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn ghost" onClick={() => router.push("/")}>
              Quay lại
            </button>
          </div>
        </div>
        <style jsx global>{commonStyles}</style>
      </div>
    );

  return (
    <div className="container">
      <Header lang={lang} setLang={setLang} />

      <div
        className="gridWrap"
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 20,
          alignItems: "start",
        }}
      >
        <main style={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 900 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div>
                {!submitted && meta.mode === "test" && (
                  <button className="btn primary" onClick={() => submitAll(false)}>
                    <FiCheckCircle style={{ marginRight: 8 }} /> Nộp bài
                  </button>
                )}
                {submitted && (
                  <button className="btn primary" onClick={() => router.push("/profile")}>
                    Xem kết quả
                  </button>
                )}
              </div>

              <div>
                <button className="btn ghost" onClick={() => setShowAll((s) => !s)}>
                  <FiList style={{ marginRight: 6 }} />{" "}
                  {showAll ? "Ẩn toàn bộ" : "Xem toàn bộ đề"}
                </button>
              </div>
            </div>

            {showAll ? (
              <div>
                {quizzes.map((quiz, qi) => (
                  <section key={qi} style={{ marginBottom: 18 }}>
                    <div className="card">
                      <div style={{ marginBottom: 10 }}>
                        <div className="muted small">Đoạn {qi + 1} (gốc)</div>
                        <div
                          style={{
                            whiteSpace: "pre-wrap",
                            marginTop: 8,
                            color: "var(--muted-dark)",
                          }}
                        >
                          {(meta.settings?.snippets || [])[qi]}
                        </div>
                      </div>

                      {(quiz.questions || []).map((q, j) => {
                        const flatIndex = flat.findIndex(
                          (f) => f.quizIndex === qi && f.qIndex === j
                        );
                        const user = answers[keyFor(flatIndex)];
                        const correct = isCorrect(flatIndex);
                        return (
                          <div key={j} className="question-card">
                            <div className="question-title">
                              {j + 1}. {q.question}
                            </div>

                            {q.type === "mc" &&
                              q.options &&
                              ["A", "B", "C", "D"].map((opt) => (
                                <div
                                  key={opt}
                                  className={`option ${
                                    submitted && q.answer === opt
                                      ? "correct"
                                      : meta.mode === "practice" && user === opt
                                      ? correct
                                        ? "correct"
                                        : "wrong"
                                      : ""
                                  }`}
                                  onClick={() => {
                                    if (!submitted) handleSelect(flatIndex, opt);
                                  }}
                                >
                                  <input type="radio" checked={user === opt} readOnly />
                                  <div style={{ marginLeft: 8 }}>
                                    {opt}. {q.options?.[opt]}
                                  </div>
                                </div>
                              ))}

                            {q.type === "tf" &&
                              ["A", "B"].map((opt) => {
                                const label = opt === "A" ? "True" : "False";
                                return (
                                  <div
                                    key={opt}
                                    className="option"
                                    onClick={() => {
                                      if (!submitted) handleSelect(flatIndex, opt);
                                    }}
                                  >
                                    <input
                                      type="radio"
                                      checked={answers[keyFor(flatIndex)] === opt}
                                      readOnly
                                    />
                                    <div style={{ marginLeft: 8 }}>
                                      {opt}. {label}
                                    </div>
                                  </div>
                                );
                              })}

                            {q.type === "short" && (
                              <div style={{ marginTop: 8 }}>
                                <input
                                  className="input"
                                  type="text"
                                  value={answers[keyFor(flatIndex)] || ""}
                                  onChange={(e) => setAnswer(flatIndex, e.target.value)}
                                  placeholder="Nhập trả lời ngắn..."
                                />
                              </div>
                            )}

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginTop: 8,
                              }}
                            >
                              <div
                                className="explain"
                                style={{
                                  color:
                                    meta.mode === "practice" && user !== undefined
                                      ? correct
                                        ? "var(--success)"
                                        : "var(--danger)"
                                      : submitted
                                      ? correct
                                        ? "var(--success)"
                                        : "var(--danger)"
                                      : "var(--muted)",
                                }}
                              >
                                {meta.mode === "practice" && user !== undefined
                                  ? correct
                                    ? `Đúng — ${q.explanation}`
                                    : "Sai — sửa rồi thử lại."
                                  : submitted
                                  ? correct
                                    ? `Bạn đúng — ${q.explanation}`
                                    : `Đáp án đúng: ${q.answer} — ${q.explanation}`
                                  : ""}
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  className="btn ghost"
                                  onClick={() => fetchHint(flatIndex)}
                                >
                                  <FiHelpCircle /> Hint
                                </button>
                              </div>
                            </div>

                            {hints[keyFor(flatIndex)] && (
                              <div style={{ marginTop: 8, color: "var(--muted)" }}>
                                {hints[keyFor(flatIndex)]}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              (() => {
                const i = curIndexFlat;
                if (i === -1)
                  return <div className="card">Không tìm thấy câu hỏi hiện tại.</div>;
                const q = flat[i];
                const quizSnippet = (meta.settings?.snippets || [])[q.quizIndex];
                const user = answers[keyFor(i)];
                const correct = isCorrect(i);

                return (
                  <div className="card">
                    <div style={{ marginBottom: 10 }}>
                      <div className="muted small">Đoạn gốc (Đoạn {q.quizIndex + 1})</div>
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          marginTop: 8,
                          color: "var(--muted-dark)",
                        }}
                      >
                        {quizSnippet}
                      </div>
                    </div>

                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {curIndexFlat + 1}. {q.question}
                    </div>
                    <div style={{ height: 12 }} />

                    {q.type === "mc" &&
                      ["A", "B", "C", "D"].map((opt) => {
                        const chosen = user === opt;
                        return (
                          <motion.div
                            key={opt}
                            layout
                            className={`option ${
                              submitted
                                ? q.answer === opt
                                  ? "correct"
                                  : chosen
                                  ? "wrong"
                                  : ""
                                : meta.mode === "practice" && chosen
                                ? correct
                                  ? "correct"
                                  : "wrong"
                                : ""
                            }`}
                            onClick={() => {
                              if (!submitted) handleSelect(i, opt);
                            }}
                          >
                            <input type="radio" checked={chosen} readOnly />
                            <div style={{ marginLeft: 8 }}>
                              {opt}. {q.options?.[opt]}
                            </div>
                          </motion.div>
                        );
                      })}

                    {q.type === "tf" &&
                      ["A", "B"].map((opt) => {
                        const label = opt === "A" ? "True" : "False";
                        return (
                          <div
                            key={opt}
                            className="option"
                            onClick={() => {
                              if (!submitted) handleSelect(i, opt);
                            }}
                          >
                            <input
                              type="radio"
                              checked={answers[keyFor(i)] === opt}
                              readOnly
                            />
                            <div style={{ marginLeft: 8 }}>
                              {opt}. {label}
                            </div>
                          </div>
                        );
                      })}

                    {q.type === "short" && (
                      <div style={{ marginTop: 8 }}>
                        <input
                          className="input"
                          type="text"
                          value={answers[keyFor(i)] || ""}
                          onChange={(e) => setAnswer(i, e.target.value)}
                          placeholder="Nhập trả lời ngắn..."
                        />
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 12,
                      }}
                    >
                      <div className="explain">
                        {meta.mode === "practice" && answers[keyFor(i)] !== undefined ? (
                          correct ? (
                            <>
                              <FiCheckCircle
                                style={{ color: "var(--success)", marginRight: 6 }}
                              />{" "}
                              Đúng — {q.explanation}
                            </>
                          ) : (
                            <>
                              <FiXCircle
                                style={{ color: "var(--danger)", marginRight: 6 }}
                              />{" "}
                              Sai — hãy thử sửa
                            </>
                          )
                        ) : null}

                        {meta.mode === "test" && submitted ? (
                          correct ? (
                            <>
                              <FiCheckCircle
                                style={{ color: "var(--success)", marginRight: 6 }}
                              />{" "}
                              Bạn đúng — {q.explanation}
                            </>
                          ) : (
                            <>
                              <FiXCircle
                                style={{ color: "var(--danger)", marginRight: 6 }}
                              />{" "}
                              Đáp án đúng: {q.answer} — {q.explanation}
                            </>
                          )
                        ) : null}
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn ghost"
                          onClick={() => goTo(Math.max(0, curIndexFlat - 1))}
                        >
                          Câu trước
                        </button>
                        <button
                          className="btn ghost"
                          onClick={() => goTo(Math.min(total - 1, curIndexFlat + 1))}
                        >
                          Câu sau
                        </button>
                        <button className="btn ghost" onClick={() => fetchHint(i)}>
                          <FiHelpCircle /> Hint
                        </button>
                      </div>
                    </div>

                    {hints[keyFor(i)] && (
                      <div style={{ marginTop: 8, color: "var(--muted)" }}>
                        {hints[keyFor(i)]}
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        </main>

        <aside style={{ width: "100%", maxWidth: 320 }}>
          <div className="card" style={{ position: "sticky", top: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div className="muted small">Bảng câu hỏi</div>
                <div style={{ fontWeight: 700 }}>{total} câu</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="muted small">Chế độ</div>
                <div style={{ fontWeight: 700 }}>{meta.mode}</div>
              </div>
            </div>

            <div style={{ height: 12 }} />
            <div className="qnav" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {flat.map((q, i) => {
                const answered = answers[keyFor(i)] !== undefined;
                const correctClass =
                  meta.mode === "practice" || submitted
                    ? isCorrect(i)
                      ? "correct"
                      : answered
                      ? "wrong"
                      : ""
                    : "";
                return (
                  <button
                    key={i}
                    className={`qbtn ${i === curIndexFlat ? "active" : ""} ${correctClass}`}
                    onClick={() => goTo(i)}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div style={{ height: 12 }} />
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Đoạn gốc</div>
            <div
              style={{
                marginTop: 8,
                maxHeight: 180,
                overflow: "auto",
                background: "linear-gradient(180deg,#fbfdff,#f8fbff)",
                padding: 8,
                borderRadius: 8,
              }}
            >
              {(meta.settings?.snippets || []).map((t, idx) => (
                <div
                  key={idx}
                  style={{
                    marginBottom: 8,
                    whiteSpace: "pre-wrap",
                    color: "var(--muted-dark)",
                  }}
                >
                  <strong>Đoạn {idx + 1}:</strong>
                  <div style={{ marginTop: 6 }}>{t}</div>
                </div>
              ))}
            </div>

            <div style={{ height: 12 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn ghost"
                onClick={() => {
                  sessionStorage.removeItem("quizData");
                  sessionStorage.removeItem("quizMeta");
                  router.push("/");
                }}
              >
                Quay lại
              </button>
              <button className="btn ghost" onClick={() => router.push("/profile")}>
                <FiAward style={{ marginRight: 6 }} /> Profile
              </button>
            </div>

            <div style={{ height: 12 }} />
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              <FiClock />{" "}
              {timerSec !== null
                ? ` Thời gian còn lại: ${Math.floor(timerSec / 60)}:${(
                    "0" + (timerSec % 60)
                  ).slice(-2)}`
                : "Không có hạn giờ"}
            </div>
          </div>
        </aside>
      </div>

      {submitted && score && (
        <div style={{ position: "fixed", left: 20, bottom: 20, zIndex: 999 }}>
          <div className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              Kết quả: {score.correct} / {score.total}
            </div>
            <div style={{ color: "var(--muted)" }}>Chế độ: {meta.mode}</div>
            <div style={{ marginLeft: 12 }}>
              <button className="btn primary" onClick={() => router.push("/profile")}>
                Xem kết quả
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{commonStyles}</style>
    </div>
  );
}

const commonStyles = `
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
  --success: #10b981;
  --danger: #ef4444;
}
*, *::before, *::after { box-sizing: border-box; }
html,body,#__next { height:100%; background: linear-gradient(180deg,#f7fbff 0%, #f4f7fb 100%); color:var(--text); font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial; }
.container { max-width:1200px; margin:28px auto; padding:18px; }
.card { background: var(--card); border-radius: var(--radius); box-shadow: var(--soft-shadow); padding:18px; border: 1px solid rgba(16,24,40,0.04); }
.gridWrap { display:grid; grid-template-columns: 1fr 320px; gap:20px; align-items:start; }
.h3 { font-size:16px; margin:0 0 12px 0; color:var(--text); font-weight:700; }
.muted { color:var(--muted); }
.muted.small { font-size:13px; color:var(--muted); }
.muted.dark { color:var(--muted-dark); }

.btn { border-radius:10px; padding:8px 12px; border: 1px solid rgba(15,23,42,0.06); background: white; cursor:pointer; font-weight:600; box-shadow: 0 4px 10px rgba(16,24,40,0.04); }
.btn.ghost { background: linear-gradient(180deg,#fff,#fbfdff); color:var(--muted-dark); }
.btn.primary { background: linear-gradient(90deg, var(--accent-start), var(--accent-end)); color: #fff; border: none; box-shadow: 0 8px 24px rgba(99,102,241,0.14); }

.question-card { margin: 12px 0; padding:12px; border-radius:10px; background: linear-gradient(180deg,#fbfdff,#f8fbff); border:1px solid rgba(15,23,42,0.03); }
.question-title { font-weight:700; margin-bottom:8px; }

.option { display:flex; align-items:center; gap:8px; padding:10px; border-radius:8px; margin-top:8px; cursor:pointer; border:1px solid rgba(15,23,42,0.03); background: #fff; }
.option input[type="radio"] { accent-color: var(--accent-start); }
.option.correct { background: linear-gradient(90deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04)); border-color: rgba(16,185,129,0.16); }
.option.wrong { background: linear-gradient(90deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03)); border-color: rgba(239,68,68,0.12); }

.qbtn { width:36px; height:36px; border-radius:8px; border:1px solid rgba(15,23,42,0.06); background: linear-gradient(180deg,#fff,#fbfdff); cursor:pointer; font-weight:700; }
.qbtn.active { outline: 2px solid rgba(99,102,241,0.14); box-shadow: 0 6px 18px rgba(99,102,241,0.06); }
.qbtn.correct { background: linear-gradient(90deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04)); border-color: rgba(16,185,129,0.16); }
.qbtn.wrong { background: linear-gradient(90deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03)); border-color: rgba(239,68,68,0.12); }

.input { width:100%; padding:10px 12px; border:1px solid rgba(15,23,42,0.06); border-radius:8px; background: #fff; }

@media (max-width:980px){ .gridWrap{ grid-template-columns: 1fr; } .container{ padding:12px; } }
`;
