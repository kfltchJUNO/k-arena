"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

const ADMIN_EMAIL = "ot.helper7@gmail.com";

export default function Admin({ onBack }) {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser?.email === ADMIN_EMAIL) {
      setAllowed(true);
      fetchUsers();
    } else {
      setAllowed(false);
      setLoading(false);
    }
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db,"k_arena_users"), orderBy("lastLogin","desc"));
      const qs = await getDocs(q);
      setUsers(qs.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) { alert("로딩 실패: " + e.message); }
    setLoading(false);
  };

  // 권한 없음
  if (!allowed) {
    return (
      <div style={{ minHeight:"100dvh", background:"linear-gradient(160deg,#06090f,#0f172a)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"system-ui,sans-serif", color:"#e2e8f0", padding:24 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:"3rem", marginBottom:12 }}>🔒</div>
          <p style={{ color:"#64748b", marginBottom:20 }}>접근 권한이 없습니다.</p>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.1)", borderRadius:12, color:"#94a3b8", padding:"10px 24px", cursor:"pointer", fontFamily:"inherit" }}>← 돌아가기</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100dvh", background:"linear-gradient(160deg,#06090f,#0f172a)", display:"flex", flexDirection:"column", fontFamily:"system-ui,sans-serif", color:"#e2e8f0" }}>
      <style>{`*{box-sizing:border-box} ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px}`}</style>

      {/* 헤더 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", background:"rgba(255,255,255,.03)", borderBottom:"1px solid rgba(255,255,255,.07)", flexShrink:0 }}>
        <button onClick={onBack} style={{ width:34, height:34, borderRadius:"50%", background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"#64748b", cursor:"pointer", fontSize:"0.85rem", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        <span style={{ fontWeight:800, fontSize:"1rem", color:"#f87171" }}>🔒 관리자 페이지</span>
        <button onClick={fetchUsers} style={{ background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.3)", borderRadius:10, color:"#a78bfa", fontSize:"0.74rem", padding:"6px 12px", cursor:"pointer", fontFamily:"inherit" }}>새로고침</button>
      </div>

      {/* 유저 목록 */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px" }}>
        {loading ? (
          <div style={{ padding:40, textAlign:"center", color:"#475569" }}>불러오는 중...</div>
        ) : (
          <>
            <p style={{ color:"#475569", fontSize:"0.75rem", marginBottom:10 }}>총 {users.length}명</p>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {users.map(u => (
                <div key={u.id} style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:"12px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                    <span style={{ fontWeight:800, fontSize:"0.9rem", color:"#e2e8f0" }}>{u.nickname || "이름없음"}</span>
                    <span style={{ color:"#fbbf24", fontWeight:800, fontSize:"0.88rem" }}>{(u.totalScore||0).toLocaleString()}점</span>
                  </div>
                  <div style={{ color:"#475569", fontSize:"0.7rem", lineHeight:1.7 }}>
                    <span style={{ marginRight:12 }}>📧 {u.email}</span>
                    <span style={{ marginRight:12 }}>🎮 {u.gamePlayCount||0}판</span>
                    <span>🔑 {u.loginCount||0}회</span>
                  </div>
                  <div style={{ color:"#334155", fontSize:"0.67rem", marginTop:4 }}>
                    마지막: {u.lastLogin?.toDate ? u.lastLogin.toDate().toLocaleString("ko-KR") : "-"}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}