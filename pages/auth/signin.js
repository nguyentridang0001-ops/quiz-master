// pages/auth/signin.js
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";

export default function SigninPage(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState("");
  const router = useRouter();
  useEffect(()=> {
    if (router.query.registered) setMsg("Đăng ký thành công — hãy đăng nhập.");
    if (router.query.error) setMsg(router.query.error);
    if (router.query.email) setEmail(router.query.email);
  },[router.query]);

  async function submit(e){
    e.preventDefault();
    setLoading(true); setMsg("");
    const res = await signIn("credentials", { redirect:false, email, password });
    if (res?.error) setMsg(res.error || "Đăng nhập không thành công");
    else router.push("/");
    setLoading(false);
  }

  return (
    <div className="container">
      <div className="card" style={{maxWidth:560, margin:"20px auto"}}>
        <h2>Đăng nhập</h2>
        <form onSubmit={submit}>
          <label>Email</label>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} />
          <label>Mật khẩu</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          <div style={{marginTop:12}}>
            <button className="btn primary" disabled={loading}>{loading ? "Đang..." : "Đăng nhập"}</button>
            <button type="button" className="btn ghost" onClick={()=>router.push("/auth/register")} style={{marginLeft:8}}>Tạo tài khoản</button>
          </div>
          {msg && <div style={{marginTop:8, color:"var(--muted)"}}>{msg}</div>}
        </form>
      </div>
    </div>
  );
}
