// components/Header.jsx
import Link from "next/link";
import { FiGlobe, FiLogIn, FiLogOut, FiUser } from "react-icons/fi";
import Logo from "./Logo";

import { useSession, signIn, signOut } from "next-auth/react";

export default function Header({ lang, setLang }) {
  const { data: session, status } = useSession();

  return (
    <header className="header card">
      <div className="brandRow">
        <div className="logoWrap">
          <Logo size={64} />
        </div>

        <div className="brandText">
          <div className="title">QuizMaster AI</div>
          <div className="subtitle">Tạo đề trắc nghiệm tự động — Gemini-powered</div>
        </div>
      </div>

      <div className="headerControls">
        <Link className="navLink" href="/">
          Home
        </Link>
        <Link className="navLink" href="/ready">
          Ready
        </Link>
        <Link className="navLink" href="/profile">
          Profile
        </Link>

        {/* LOGIN UI */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {status === "loading" ? (
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Loading...</span>
          ) : session ? (
            <>
              <span style={{ fontSize: 13, color: "var(--muted-dark)" }}>
                <FiUser style={{ marginRight: 6 }} />
                {session.user?.name || session.user?.email || "User"}
              </span>

              <button className="btn ghost" onClick={() => signOut()}>
                <FiLogOut style={{ marginRight: 6 }} />
                Logout
              </button>
            </>
          ) : (
            <button className="btn primary" onClick={() => signIn()}>
              <FiLogIn style={{ marginRight: 6 }} />
              Login
            </button>
          )}
        </div>

        {/* LANGUAGE */}
        <div className="langBox">
          <FiGlobe />
          <select value={lang} onChange={(e) => setLang && setLang(e.target.value)}>
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
          </select>
        </div>
      </div>
    </header>
  );
}
