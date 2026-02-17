// pages/auth/register.js
import { useState } from "react";
import { useRouter } from "next/router";

export default function RegisterPage(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [name,setName]=useState("");
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const router = useRouter();

  async function onSubmit(e){
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({email,password,name})});
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Đăng ký thất bại");
      // auto redirect to signin
      router.push("/auth/signin?registered=1&email="+encodeURIComponent(email));
    } catch (e) {
      setErr(e.message);
    } finally { setLoading(false) }
  }

  return (
    <div className="container">
      <div className="card" style={{maxWidth:640, margin:"20px auto"}}>
        <h2>Đăng ký</h2>
        <form onSubmit={onSubmit}>
          <label>Email</label>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} />
          <label>Tên (tuỳ chọn)</label>
          <input value={name} onChange={(e)=>setName(e.target.value)} />
          <label>Mật khẩu</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          <div style={{marginTop:12}}>
            <button className="btn primary" disabled={loading}>{loading ? "Đang..." : "Đăng ký"}</button>
          </div>
          {err && <div style={{color:"var(--danger)", marginTop:8}}>{err}</div>}
        </form>
      </div>
    </div>
  );
}
