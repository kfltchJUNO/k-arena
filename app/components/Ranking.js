"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

const TABS = [
  { key:"total",       name:"👑 종합",       fields:["totalScore"] },
  { key:"wordchain",   name:"🧩 끝말잇기",   fields:["best_wordchain"] },
  { key:"speed",       name:"⚡ 스피드",     fields:["best_speed"] },
  { key:"initial",     name:"🤫 초성",       fields:["best_initial"] },
  { key:"idiom",       name:"🦁 사자성어",   fields:["best_idiom"] },
  { key:"synonym",     name:"🔗 유의어",     fields:["best_synonym"] },
  { key:"colloc",      name:"👫 짝꿍",       fields:["best_collocation"] },
  { key:"twenty",      name:"👶 스무고개",   fields:["best_twenty"] },
  { key:"homonym",     name:"🕵️ 연상탐정",   fields:["best_homonym"] },
  { key:"sentence",    name:"🧩 문장조각",   fields:["best_sentence"] },
  { key:"rain",        name:"🌧️ 단어비",     fields:["best_rain"] },
  { key:"proverb",     name:"📜 속담",       fields:["best_proverb"] },
  { key:"category",    name:"🌊 주제러쉬",   fields:["best_category"] },
  { key:"factory",     name:"🏭 단어공장",   fields:["best_factory"] },
];

export default function Ranking({ onBack }) {
  const [tab,     setTab]     = useState("total");
  const [allUsers,setAllUsers]= useState(null); // null = 아직 미로딩
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // 최초 1회만 전체 유저 로딩
  useEffect(() => {
    const load = async () => {
      setLoading(true); setError("");
      try {
        // orderBy 없이 단순 getDocs — 복합 인덱스 불필요
        const snap = await getDocs(collection(db, "k_arena_users"));
        const data = snap.docs.map(d => ({ id:d.id, ...d.data() }));
        setAllUsers(data);
      } catch (e) {
        setError("데이터 로딩 실패: " + e.message);
        setAllUsers([]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const getRankers = () => {
    if (!allUsers) return [];
    const fields = TABS.find(t => t.key === tab)?.fields || ["totalScore"];
    return allUsers
      .map(u => ({
        id:       u.id,
        nickname: u.nickname || "익명",
        score:    fields.reduce((s, f) => s + (u[f] || 0), 0),
      }))
      .filter(u => u.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  };

  const rankers = getRankers();
  const medal   = i => i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}위`;

  return (
    <div style={{ minHeight:"100dvh", background:"linear-gradient(160deg,#06090f,#0f172a)", display:"flex", flexDirection:"column", fontFamily:"system-ui,sans-serif", color:"#e2e8f0" }}>
      <style>{`*{box-sizing:border-box} ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px}`}</style>

      {/* 헤더 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 16px", background:"rgba(255,255,255,.03)", borderBottom:"1px solid rgba(255,255,255,.07)", flexShrink:0 }}>
        <button onClick={() => onBack()} style={{ width:33, height:33, borderRadius:"50%", background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"#64748b", cursor:"pointer", fontSize:"0.85rem", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        <span style={{ fontWeight:900, fontSize:"1rem", color:"#fbbf24" }}>🏆 명예의 전당</span>
        <div style={{ width:33 }} />
      </div>

      {/* 탭 */}
      <div style={{ flexShrink:0, padding:"10px 14px 0", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, paddingBottom:10 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding:"6px 12px", borderRadius:20, fontSize:"0.74rem", fontWeight:800, fontFamily:"inherit", cursor:"pointer", border:"1px solid", borderColor:tab===t.key?"#6366f1":"rgba(255,255,255,.1)", background:tab===t.key?"rgba(99,102,241,.2)":"rgba(255,255,255,.04)", color:tab===t.key?"#a78bfa":"#64748b", transition:"all .15s", flexShrink:0 }}>
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* 현재 탭 */}
      <div style={{ padding:"10px 18px 4px", flexShrink:0 }}>
        <span style={{ color:"#475569", fontSize:"0.72rem" }}>
          {TABS.find(t=>t.key===tab)?.name} 랭킹 TOP 10
        </span>
      </div>

      {/* 목록 */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {loading ? (
          <div style={{ padding:"48px", textAlign:"center", color:"#475569", fontSize:"0.85rem" }}>불러오는 중...</div>
        ) : error ? (
          <div style={{ padding:"24px 18px", color:"#ef4444", fontSize:"0.82rem" }}>{error}</div>
        ) : rankers.length === 0 ? (
          <div style={{ padding:"48px", textAlign:"center", color:"#334155", fontSize:"0.85rem" }}>아직 기록이 없어요</div>
        ) : (
          rankers.map((u, i) => (
            <div key={u.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,.04)", background:i===0?"rgba(255,199,0,.04)":i===1?"rgba(200,200,200,.03)":i===2?"rgba(180,100,30,.04)":"transparent" }}>
              <span style={{ width:36, textAlign:"center", fontSize:i<3?"1.3rem":"0.9rem", fontWeight:900, color:i<3?"#fbbf24":"#475569", flexShrink:0 }}>{medal(i)}</span>
              <span style={{ flex:1, fontWeight:800, fontSize:"0.95rem", color:"#e2e8f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.nickname}</span>
              <span style={{ fontWeight:900, fontSize:"1rem", color:i===0?"#ffd700":i===1?"#94a3b8":i===2?"#cd7f32":"#a78bfa", flexShrink:0 }}>
                {u.score.toLocaleString()}<span style={{ fontSize:"0.7rem", color:"#475569", marginLeft:2 }}>점</span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}