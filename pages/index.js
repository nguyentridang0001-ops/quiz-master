import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { FiPlus, FiTrash2, FiCpu } from "react-icons/fi";
import { motion } from "framer-motion";
import Header from "../components/Header";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  const [snippets, setSnippets] = useState([""]);
  const [numQuestions, setNumQuestions] = useState(10);
  const [types, setTypes] = useState({ mc: true, tf: false, short: false });
  const [lang, setLang] = useState("vi");

  const router = useRouter();

  // ✅ Fix SSR / Vercel prerender crash
  useEffect(() => {
    setMounted(true);
  }, []);

  // Khi đang SSR build, không render gì cả để tránh lỗi window/localStorage
  if (!mounted) return null;

  function updateSnippet(index, value) {
    const s = [...snippets];
    s[index] = value;
    setSnippets(s);
  }

  function addSnippet() {
    setSnippets([...snippets, ""]);
  }

  function removeSnippet(i) {
    const s = snippets.filter((_, idx) => idx !== i);
    setSnippets(s.length ? s : [""]);
  }

  function toggleType(t) {
    setTypes((prev) => ({ ...prev, [t]: !prev[t] }));
  }

  function prepare() {
    const usedTypes = Object.keys(types).filter((k) => types[k]);

    if (usedTypes.length === 0) {
      alert("Bạn phải chọn ít nhất một loại câu hỏi.");
      return;
    }

    const payload = {
      snippets,
      numQuestions: Number(numQuestions) || 10,
      types: usedTypes,
      lang,
    };

    // ✅ localStorage chỉ chạy ở client
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("quizSettings", JSON.stringify(payload));
      }
    } catch (e) {}

    router.push("/ready");
  }

  function resetAll() {
    setSnippets([""]);
    setNumQuestions(10);
    setTypes({ mc: true, tf: false, short: false });

    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("quizSettings");
      }
    } catch (e) {}
  }

  return (
    <div className="container">
      {/* Shared header component */}
      <Header lang={lang} setLang={setLang} />

      {/* SNIPPETS */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card section"
      >
        <div className="rowBetween">
          <h2 className="h2">1. Dán đoạn văn (bài học)</h2>
          <div className="mutedRow">
            <FiCpu />
            <span
              style={{
                marginLeft: 8,
                fontWeight: 600,
                color: "var(--muted-dark)",
              }}
            >
              Mascot: Q-Bot
            </span>
          </div>
        </div>

        {snippets.map((s, i) => (
          <div key={i} className="snippetBlock">
            <div className="rowBetween snippetHeader">
              <strong>Đoạn {i + 1}</strong>

              <button
                className="btn ghost iconBtn"
                onClick={() => removeSnippet(i)}
                title="Xóa đoạn"
              >
                <FiTrash2 />
              </button>
            </div>

            <textarea
              value={s}
              onChange={(e) => updateSnippet(i, e.target.value)}
              placeholder="Dán văn bản vào đây..."
              className="textarea"
            />
          </div>
        ))}

        <div className="rowEnd">
          <button className="btn ghost" onClick={addSnippet}>
            <FiPlus />
            <span style={{ marginLeft: 8 }}>Thêm đoạn</span>
          </button>
        </div>
      </motion.section>

      {/* GRID */}
      <div className="gridWrap">
        <main className="leftCol">
          <div className="card">
            <h3 className="h3">Cấu hình đề</h3>

            <div className="configRow">
              <div className="field">
                <label className="labelMuted">Số câu / đoạn</label>
                <input
                  className="input"
                  type="number"
                  value={numQuestions}
                  min={1}
                  onChange={(e) => setNumQuestions(e.target.value)}
                />
              </div>

              <div className="field typesField">
                <label className="labelMuted">Loại câu hỏi</label>
                <div className="typeGrid">
                  <label className="typeItem">
                    <input
                      type="checkbox"
                      checked={types.mc}
                      onChange={() => toggleType("mc")}
                    />
                    <span>MC (A/B/C/D)</span>
                  </label>

                  <label className="typeItem">
                    <input
                      type="checkbox"
                      checked={types.tf}
                      onChange={() => toggleType("tf")}
                    />
                    <span>True/False</span>
                  </label>

                  <label className="typeItem">
                    <input
                      type="checkbox"
                      checked={types.short}
                      onChange={() => toggleType("short")}
                    />
                    <span>Short</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="btnRow">
              <button className="btn primary" onClick={prepare}>
                Prepare (Chuyển sang Ready)
              </button>

              <button className="btn ghost" onClick={resetAll}>
                Reset
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="h3">Quick tips</h3>
            <ul className="muted">
              <li>
                Ngôn ngữ bạn chọn sẽ điều khiển ngôn ngữ câu hỏi/đáp án mà model
                sinh ra.
              </li>
              <li>Thêm nhiều đoạn để hệ thống tạo quiz cho mỗi đoạn.</li>
            </ul>
          </div>
        </main>

        <aside className="sidebar">
          <div className="card">
            <h3 className="h3">Preview</h3>

            <p className="subtitle">
              Số đoạn: <strong>{snippets.length}</strong> · Câu/đoạn:{" "}
              <strong>{numQuestions}</strong>
            </p>

            <div className="muted small">
              <strong>Ngôn ngữ:</strong> {lang}
            </div>

            <div className="previewBox">
              {snippets.slice(0, 3).map((t, i) => (
                <div key={i} className="previewItem">
                  <strong>Đoạn {i + 1}:</strong>
                  <div className="previewText">
                    {t || <em className="muted">(trống)</em>}
                  </div>
                </div>
              ))}
            </div>

            <div className="btnRow">
              <button className="btn ghost" onClick={() => router.push("/badges")}>
                Badges
              </button>

              {/* ✅ Sửa: không dùng window.location.href */}
              <button className="btn ghost" onClick={() => router.push("/profile")}>
                Profile
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Page-specific styles */}
      <style jsx global>{`
        *, *::before, *::after {
          box-sizing: border-box;
        }

        :root {
          --bg: #f4f7fb;
          --card: #ffffff;
          --muted: #6b7280;
          --muted-dark: #374151;
          --text: #0f172a;
          --accent-start: #6366f1;
          --accent-end: #06b6d4;
          --glass: rgba(255, 255, 255, 0.6);
          --soft-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
          --radius: 14px;
        }

        html,
        body,
        #__next {
          height: 100%;
          background: linear-gradient(180deg, #f7fbff 0%, #f4f7fb 100%);
          color: var(--text);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            "Segoe UI", Roboto, "Helvetica Neue", Arial;
        }

        .container {
          max-width: 1200px;
          margin: 28px auto;
          padding: 18px;
        }

        .header.card,
        header.card,
        .brandRow,
        .logoWrap {
          background: transparent !important;
          box-shadow: none !important;
        }

        .card {
          background: var(--card);
          border-radius: var(--radius);
          box-shadow: var(--soft-shadow);
          padding: 18px;
          border: 1px solid rgba(16, 24, 40, 0.04);
        }

        .section {
          padding: 22px;
        }

        .h2 {
          font-size: 22px;
          margin: 0 0 12px 0;
          color: var(--text);
        }

        .h3 {
          font-size: 16px;
          margin: 0 0 12px 0;
          color: var(--text);
          font-weight: 700;
        }

        .rowBetween {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .mutedRow {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--muted);
        }

        .snippetBlock {
          margin-top: 16px;
        }

        .snippetHeader {
          margin-bottom: 8px;
        }

        .textarea {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          min-height: 110px;
          resize: vertical;
          border-radius: 10px;
          border: 1px solid rgba(15, 23, 42, 0.05);
          padding: 12px;
          background: linear-gradient(180deg, #fff, #fbfdff);
          color: var(--text);
          box-shadow: inset 0 1px 0 rgba(15, 23, 42, 0.02);
          font-size: 14px;
          overflow-wrap: break-word;
        }

        .gridWrap {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 20px;
          margin-top: 18px;
          align-items: start;
        }

        .leftCol {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .labelMuted {
          color: var(--muted);
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
        }

        .configRow {
          display: flex;
          gap: 18px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .field {
          min-width: 220px;
        }

        .input {
          display: block;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid rgba(15, 23, 42, 0.06);
          background: #fbfdff;
          width: 100%;
          font-size: 14px;
          box-sizing: border-box;
        }

        .typeGrid {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 6px;
        }

        .typeItem {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(180deg, #fbfdff, #f7fbff);
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid rgba(15, 23, 42, 0.04);
          font-size: 14px;
          color: var(--muted-dark);
        }

        .btnRow {
          margin-top: 14px;
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .btn {
          border-radius: 10px;
          padding: 10px 14px;
          border: 1px solid rgba(15, 23, 42, 0.06);
          background: white;
          cursor: pointer;
          font-weight: 600;
          box-shadow: 0 4px 10px rgba(16, 24, 40, 0.04);
        }

        .btn.ghost {
          background: linear-gradient(180deg, #fff, #fbfdff);
          color: var(--muted-dark);
        }

        .btn.iconBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          padding: 0;
        }

        .btn.primary {
          background: linear-gradient(
            90deg,
            var(--accent-start),
            var(--accent-end)
          );
          color: #fff;
          border: none;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.14);
        }

        .previewBox {
          margin-top: 12px;
          background: linear-gradient(180deg, #fbfdff, #f8fbff);
          padding: 12px;
          border-radius: 10px;
          border: 1px solid rgba(15, 23, 42, 0.03);
        }

        .previewItem {
          margin-bottom: 8px;
        }

        .previewText {
          color: var(--muted-dark);
          margin-top: 6px;
        }

        .muted {
          color: var(--muted);
        }

        .small {
          font-size: 13px;
          color: var(--muted);
        }

        @media (max-width: 980px) {
          .gridWrap {
            grid-template-columns: 1fr;
          }
          .container {
            padding: 12px;
          }
        }

        ::-webkit-scrollbar {
          height: 10px;
          width: 10px;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(
            90deg,
            rgba(99, 102, 241, 0.4),
            rgba(6, 182, 212, 0.3)
          );
          border-radius: 8px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
}
