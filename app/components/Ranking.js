"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, limit, getDocs } from "firebase/firestore";

const TABS = [
  { key:"total",     name:"👑 종합",      fields:["totalScore"] },
  { key:"wordchain", name:"🧩 끝말잇기",  fields:["best_wordchain"] },
  { key:"speed",     name:"⚡ 스피드",    fields:["best_speed"] },
  { key:"initial",   name:"🤫 초성",      fields:["best_initial","best_factory"] },
  { key:"idiom",     name:"🦁 사자성어",  fields:["best_idiom"] },
  { key:"synonym",   name:"🔗 유의어",    fields:["best_synonym"] },
  { key:"colloc",    name:"👫 짝꿍",      fields:["best_collocation"] },
  { key:"twenty",    name:"👶 스무고개",  fields:["best_twenty"] },
  { key:"homonym",   name:"🕵️ 연상탐정",  fields:["best_homonym"] },
  { key:"sentence",  name:"🧩 문장조각",  fields:["best_sentence"] },
  { key:"rain",      name:"🌧️ 단어비",    fields:["best_rain"] },
  { key:"proverb",   name:"📜 속담",      fields:["best_proverb"] },
  { key:"category",  name:"🌊 주제러쉬",  fields:["best_category"] },
];

export default function Ranking({ onBack }) {
  const [tab,     setTab]     = useState("total");
  const [rankers, setRankers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setRankers([]);
      try {
        const snap = await getDocs(query(collection(db,"k_arena_users"), limit(100)));
        const fields = TABS.find(t => t.key === tab)?.fields || ["totalScore"];
        const data = snap.docs.map(d => {
          const u = d.data();
          let score = 0;
          if (tab === "total") {
            score = u.totalScore || 0;
          } else {
            score = fields.reduce((s,f) => s + (u[f] || 0), 0);
          }
          return { id: d.id, nickname: u.nickname || "익명", score };
        });
        setRankers(data.filter(u => u.score > 0).sort((a,b) => b.score - a.score).slice(0,10));
      } catch(e) { console.error("랭킹 오류:", e); }
      setLoading(false);
    };
    fetch();
  }, [tab]);

  const medal = (i) => i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`;

  return (
    <div style={{ minHeight:"100dvh", background:"linear-gradient(160deg,#06090f,#0f172a)", display:"flex", flexDirection:"column", fontFamily:"'Nunito',system-ui,sans-serif", color:"#e2e8f0" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap'); *{box-sizing:border-box}`}</style>

      {/* 헤더 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", background:"rgba(255,255,255,.03)", borderBottom:"1px solid rgba(255,255,255,.07)", flexShrink:0 }}>
        <button onClick={onBack} style={{ width:34, height:34, borderRadius:"50%", background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"#64748b", cursor:"pointer", fontSize:"0.85rem", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" }}>✕</button>
        <span style={{ fontWeight:900, fontSize:"1rem", color:"#fbbf24" }}>🏆 명예의 전당</span>
        <div style={{ width:34 }}/>
      </div>

      {/* 탭 */}
      <div style={{ flexShrink:0, overflowX:"auto", padding:"10px 14px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", gap:7, WebkitOverflowScrolling:"touch" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ flexShrink:0, padding:"7px 13px", borderRadius:20, fontSize:"0.76rem", fontWeight:800, fontFamily:"inherit", cursor:"pointer", border:"1px solid", borderColor: tab===t.key ? "#6366f1" : "rgba(255,255,255,.1)", background: tab===t.key ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.04)", color: tab===t.key ? "#a78bfa" : "#64748b", transition:"all .15s" }}>
            {t.name}
          </button>
        ))}
      </div>

      {/* 랭킹 목록 */}
      <div style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
        {loading ? (
          <div style={{ padding:"48px", textAlign:"center", color:"#475569", fontSize:"0.85rem" }}>계산 중...</div>
        ) : rankers.length === 0 ? (
          <div style={{ padding:"48px", textAlign:"center", color:"#334155", fontSize:"0.85rem" }}>아직 기록이 없어요</div>
        ) : (
          rankers.map((u, i) => (
            <div key={u.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 20px", borderBottom:"1px solid rgba(255,255,255,.04)", background: i===0?"rgba(255,199,0,.04)":i===1?"rgba(200,200,200,.03)":i===2?"rgba(200,120,40,.03)":"transparent" }}>
              <span style={{ width:32, textAlign:"center", fontSize:i<3?"1.4rem":"0.95rem", fontWeight:900, color:i<3?"#fbbf24":"#475569", flexShrink:0 }}>{medal(i)}</span>
              <span style={{ flex:1, fontWeight:800, fontSize:"0.95rem", color:"#e2e8f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.nickname}</span>
              <span style={{ fontWeight:900, fontSize:"1rem", color: i===0?"#fbbf24":i===1?"#94a3b8":i===2?"#b87333":"#6366f1", flexShrink:0 }}>{u.score.toLocaleString()}점</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}