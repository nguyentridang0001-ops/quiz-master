// pages/ready.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { FiPlay, FiArrowLeft } from "react-icons/fi";
import Header from "../components/Header";

export default function Ready() {
  const [settings, setSettings] = useState(null);
  const [mode, setMode] = useState("practice");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timerChoice, setTimerChoice] = useState(0); // minutes
  const [lang, setLang] = useState("vi");
  const router = useRouter();

  useEffect(() => {
    try {
      const s = localStorage.getItem("quizSettings");
      if (!s) {
        router.push("/");
        return;
      }
      const parsed = JSON.parse(s);
      const normalized = {
        snippets: Array.isArray(parsed.snippets) ? parsed.snippets : [parsed.snippets || ""],
        numQuestions: Number(parsed.numQuestions) || 10,
        types: Array.isArray(parsed.types)
          ? parsed.types
          : parsed.types
          ? [parsed.types]
          : ["mc"],
        lang: parsed.lang || "vi",
        timerMinutes: parsed.timerMinutes || 0,
      };
      setSettings(normalized);
      if (normalized.lang) setLang(normalized.lang);
      if (normalized.timerMinutes) setTimerChoice(Number(normalized.timerMinutes));

      try {
        const prevMeta = JSON.parse(sessionStorage.getItem("quizMeta") || "{}");
        if (prevMeta.mode) setMode(prevMeta.mode);
      } catch (e) {}
    } catch (e) {
      console.error("Invalid quizSettings in localStorage:", e);
      router.push("/");
    }
  }, [router]);

  async function start() {
    setError(null);
    setLoading(true);
    if (!settings) {
      setError("Cấu hình không hợp lệ.");
      setLoading(false);
      return;
    }

    const finalSettings = {
      ...settings,
      timerMinutes: Number(timerChoice || 0),
      lang: settings.lang || "vi",
    };

    try {
      localStorage.setItem("quizSettings", JSON.stringify(finalSettings));
    } catch (e) {}

    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snippets: finalSettings.snippets,
          numQuestions: Number(finalSettings.numQuestions) || 10,
          types: finalSettings.types,
          lang: finalSettings.lang,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Lỗi khi gọi API");
      }

      const data = await res.json();
      if (!data || !Array.isArray(data.quizzes)) throw new Error("API trả về dữ liệu không hợp lệ");

      sessionStorage.setItem("quizData", JSON.stringify(data.quizzes));

      // ✅ meta luôn có settings (lang + timer) để quiz unlock badge chuẩn
      sessionStorage.setItem(
        "quizMeta",
        JSON.stringify({
          mode,
          settings: finalSettings,
        })
      );

      router.push(`/quiz?mode=${encodeURIComponent(mode)}`);
    } catch (e) {
      console.error(e);
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  if (!settings)
    return (
      <div className="container">
        <Header lang={lang} setLang={setLang} />
        <div className="card" style={{ marginTop: 18 }}>
          Đang load…
        </div>
        <style jsx global>
          {commonStyles}
        </style>
      </div>
    );

  return (
    <div className="container">
      <Header lang={lang} setLang={setLang} />

      <div className="card headerCard" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div className="logoBadge">QM</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Sẵn sàng</div>
          <div style={{ color: "var(--muted)", marginTop: 6 }}>
            Kiểm tra cài đặt trước khi tạo đề
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <button className="btn ghost" onClick={() => router.push("/")}>
            <FiArrowLeft /> Quay lại
          </button>
        </div>
      </div>

      <div className="gridWrap" style={{ marginTop: 18 }}>
        <main>
          <div className="card">
            <h3 className="h3">Thông tin đề</h3>
            <ul style={{ color: "var(--muted)" }}>
              <li>
                <strong>Đoạn:</strong> {settings.snippets.length}
              </li>
              <li>
                <strong>Số câu / đoạn:</strong> {settings.numQuestions}
              </li>
              <li>
                <strong>Loại:</strong> {settings.types.join(", ")}
              </li>
              <li>
                <strong>Ngôn ngữ:</strong> {settings.lang}
              </li>
            </ul>

            <div style={{ marginTop: 12 }}>
              <label className="labelMuted" style={{ marginBottom: 8, display: "block" }}>
                Chọn chế độ
              </label>
              <label className="modeLabel">
                <input
                  type="radio"
                  name="mode"
                  value="test"
                  checked={mode === "test"}
                  onChange={() => setMode("test")}
                />{" "}
                <strong>Test</strong> — đáp án ẩn cho tới khi nộp
              </label>
              <label className="modeLabel">
                <input
                  type="radio"
                  name="mode"
                  value="practice"
                  checked={mode === "practice"}
                  onChange={() => setMode("practice")}
                />{" "}
                <strong>Practice</strong> — phản hồi ngay, cho sửa
              </label>
            </div>

            {mode === "test" && (
              <div style={{ marginTop: 12 }}>
                <label className="labelMuted" style={{ marginBottom: 8, display: "block" }}>
                  Thời gian làm bài
                </label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <label className="typeItem radioItem">
                    <input
                      type="radio"
                      name="timer"
                      value={20}
                      checked={Number(timerChoice) === 20}
                      onChange={() => setTimerChoice(20)}
                    />{" "}
                    <span>20 phút</span>
                  </label>
                  <label className="typeItem radioItem">
                    <input
                      type="radio"
                      name="timer"
                      value={90}
                      checked={Number(timerChoice) === 90}
                      onChange={() => setTimerChoice(90)}
                    />{" "}
                    <span>1 giờ 30 phút</span>
                  </label>
                  <label className="typeItem radioItem">
                    <input
                      type="radio"
                      name="timer"
                      value={180}
                      checked={Number(timerChoice) === 180}
                      onChange={() => setTimerChoice(180)}
                    />{" "}
                    <span>3 giờ</span>
                  </label>
                  <label className="typeItem radioItem">
                    <input
                      type="radio"
                      name="timer"
                      value={0}
                      checked={Number(timerChoice) === 0}
                      onChange={() => setTimerChoice(0)}
                    />{" "}
                    <span>Không giới hạn</span>
                  </label>
                </div>
              </div>
            )}

            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <button className="btn primary" onClick={start} disabled={loading}>
                {loading ? "Đang tạo đề..." : (
                  <>
                    <FiPlay style={{ marginRight: 8 }} /> Start
                  </>
                )}
              </button>
              <button className="btn ghost" onClick={() => router.push("/")}>
                Sửa cấu hình
              </button>
            </div>

            {error && <div style={{ color: "var(--danger)", marginTop: 12 }}>{error}</div>}
          </div>
        </main>

        <aside className="sidebar">
          <div className="card">
            <h3 className="h3">Preview đề</h3>
            <p className="subtitle">
              Bạn sẽ thấy cả đề gốc (đoạn văn) trên trang làm bài, để dễ đọc và trả lời.
            </p>
            <div style={{ height: 12 }} />
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              <strong>Đoạn (preview):</strong>
            </div>
            <div className="previewBoxSmall">
              {settings.snippets.slice(0, 1).map((t, i) => (
                <div key={i} style={{ whiteSpace: "pre-wrap", color: "var(--muted-dark)" }}>
                  {t || <em className="muted">(trống)</em>}
                </div>
              ))}
            </div>

            <div style={{ height: 12 }} />
            <div style={{ color: "var(--muted)" }}>
              <strong>Chế độ:</strong> {mode}
            </div>
            <div style={{ height: 6 }} />
            <div style={{ color: "var(--muted)" }}>
              <strong>Thời gian chọn:</strong> {timerChoice ? `${timerChoice} phút` : "Không giới hạn"}
            </div>
          </div>
        </aside>
      </div>

      <style jsx global>
        {commonStyles}
      </style>
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
  --danger: #ef4444;
}

*, *::before, *::after { box-sizing: border-box; }
html,body,#__next { height:100%; background: linear-gradient(180deg,#f7fbff 0%, #f4f7fb 100%); color:var(--text); font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial; }
.container { max-width:1200px; margin:28px auto; padding:18px; }

.card { background: var(--card); border-radius: var(--radius); box-shadow: var(--soft-shadow); padding:18px; border: 1px solid rgba(16,24,40,0.04); }
.headerCard { padding:18px; }
.logoBadge { width:64px; height:64px; border-radius:12px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:20px; background: linear-gradient(90deg,#7c5cff,#06b6d4); }
.h2 { font-size:22px; margin:0 0 12px 0; color:var(--text); }
.h3 { font-size:16px; margin:0 0 12px 0; color:var(--text); font-weight:700; }

.gridWrap { display:grid; grid-template-columns: 1fr 360px; gap:20px; margin-top:18px; align-items:start; }
.sidebar { }

.labelMuted { color:var(--muted); display:block; margin-bottom:8px; font-size:13px; }
.previewBoxSmall { margin-top:8px; background: linear-gradient(180deg,#fbfdff,#f8fbff); padding:12px; border-radius:8px; border:1px solid rgba(15,23,42,0.03); max-height:120px; overflow:auto; color:var(--muted-dark); }

.modeLabel { display:inline-flex; align-items:center; gap:8px; margin-right:14px; color:var(--muted-dark); }
.typeItem { display:inline-flex; align-items:center; gap:8px; background: linear-gradient(180deg,#fbfdff,#f7fbff); padding:8px 12px; border-radius:10px; border:1px solid rgba(15,23,42,0.04); font-size:14px; color:var(--muted-dark); cursor:pointer; }
.typeItem input[type="radio"], .typeItem input[type="checkbox"] { margin-right:8px; }

.btn { border-radius:10px; padding:10px 14px; border: 1px solid rgba(15,23,42,0.06); background: white; cursor:pointer; font-weight:600; box-shadow: 0 4px 10px rgba(16,24,40,0.04); }
.btn.ghost { background: linear-gradient(180deg,#fff,#fbfdff); color:var(--muted-dark); }
.btn.primary { background: linear-gradient(90deg, var(--accent-start), var(--accent-end)); color: #fff; border: none; box-shadow: 0 8px 24px rgba(99,102,241,0.14); }
`;
