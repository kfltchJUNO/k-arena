"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, doc, setDoc, deleteDoc, getDoc, Timestamp } from "firebase/firestore";

const ADMIN_EMAIL = "ot.helper7@gmail.com";

const GAME_TYPES = [
  { id:"speed",      name:"스피드 퀴즈",    prompt:'한국어 스피드 퀴즈 10문제. 설명을 읽고 단어를 맞히는 형식. JSON만: [{"word":"단어","description":"설명(20자이내)","level":1}]' },
  { id:"initial",    name:"초성 퀴즈",      prompt:'한국어 초성 퀴즈 10문제. 초성과 힌트 3개. JSON만: [{"ini":"ㅅㄱ","w":"사과","h":["힌트1","힌트2","힌트3"]}]' },
  { id:"idiom",      name:"사자성어 잇기",  prompt:'한국어 사자성어 잇기 10문제. 앞 두 글자와 뒤 두 글자, 뜻. JSON만: [{"f":"일석","b":"이조","m":"뜻"}]' },
  { id:"proverb",    name:"속담 이어달리기",prompt:'한국 속담 10개. 앞부분 보고 뒷부분 맞히기. JSON만: [{"question":"가는 말이 고와야","answer":"오는 말이 곱다"}]' },
  { id:"synonym",    name:"유의어 잇기",    prompt:'한국어 유의어 쌍 10개. 서로 비슷한 뜻의 단어. JSON만: [{"w":"기쁨","a":"즐거움"}]' },
  { id:"colloc",     name:"짝꿍 단어",      prompt:'한국어 콜로케이션(짝꿍) 퀴즈 8개. 목적어와 어울리는 동사 4지선다. JSON만: [{"q":"꿈을","a":"꾸다","o":["꾸다","쓰다","먹다","하다"]}]' },
  { id:"twenty",     name:"스무고개",       prompt:'스무고개 퀴즈 8개. 정답과 힌트 4개(점점 구체적으로). JSON만: [{"word":"냉장고","hints":["힌트1","힌트2","힌트3","힌트4"]}]' },
  { id:"detective",  name:"연상 탐정",      prompt:'연상 퀴즈 8개. 단서 3개로 정답 맞히기. JSON만: [{"word":"바나나","hints":["노란색","달콤해요","원숭이"]}]' },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap');
*{box-sizing:border-box}
::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px}
@keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
`;

export default function Admin({ onBack }) {
  const [tab,      setTab]      = useState("users");       // users | quiz
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [allowed,  setAllowed]  = useState(false);

  // 퀴즈 검수 관련
  const [quizType,    setQuizType]    = useState("speed");
  const [generating,  setGenerating]  = useState(false);
  const [generated,   setGenerated]   = useState([]);   // 생성된 원본
  const [reviewing,   setReviewing]   = useState([]);   // 검수 중 (승인/거절 포함)
  const [saved,       setSaved]       = useState([]);   // 저장된 퀴즈 목록
  const [genError,    setGenError]    = useState("");

  useEffect(() => {
    const u = auth.currentUser;
    if (u?.email === ADMIN_EMAIL) {
      setAllowed(true);
      fetchUsers();
      loadSavedQuizzes("speed");
    } else {
      setAllowed(false);
      setLoading(false);
    }
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const qs = await getDocs(query(collection(db,"k_arena_users"), orderBy("lastLogin","desc")));
      setUsers(qs.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  // Gemini로 퀴즈 생성
  const generateQuiz = async () => {
    setGenerating(true); setGenError(""); setGenerated([]); setReviewing([]);
    const gt = GAME_TYPES.find(g => g.id === quizType);
    try {
      const res = await fetch("/api/gemini", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt: gt.prompt + "\n중복 없이, 난이도 다양하게." })
      });
      const d = await res.json();
      const text = (d.text || "[]").replace(/```json|```/g,"").trim();
      const match = text.match(/\[[\s\S]*\]/);
      const items = match ? JSON.parse(match[0]) : [];
      setGenerated(items);
      setReviewing(items.map((item, i) => ({ ...item, _id: i, _status: "pending" })));
    } catch(e) {
      setGenError("생성 실패: " + e.message);
    }
    setGenerating(false);
  };

  // 개별 승인/거절
  const setStatus = (id, status) => {
    setReviewing(prev => prev.map(q => q._id === id ? { ...q, _status: status } : q));
  };

  // 승인된 항목 Firestore 저장
  const saveApproved = async () => {
    const approved = reviewing.filter(q => q._status === "approved");
    if (!approved.length) { alert("승인된 문제가 없습니다."); return; }
    try {
      const colRef = collection(db, `quiz_${quizType}`);
      for (const q of approved) {
        const { _id, _status, ...data } = q;
        await setDoc(doc(colRef), { ...data, createdAt: Timestamp.now(), approved: true });
      }
      alert(`✅ ${approved.length}개 저장 완료!`);
      setReviewing([]);
      loadSavedQuizzes(quizType);
    } catch(e) { alert("저장 실패: " + e.message); }
  };

  // 저장된 퀴즈 불러오기
  const loadSavedQuizzes = async (type) => {
    try {
      const qs = await getDocs(collection(db, `quiz_${type}`));
      setSaved(qs.docs.map(d => ({ _docId: d.id, ...d.data() })));
    } catch(e) { setSaved([]); }
  };

  // 저장된 퀴즈 삭제
  const deleteQuiz = async (docId) => {
    if (!confirm("삭제할까요?")) return;
    await deleteDoc(doc(db, `quiz_${quizType}`, docId));
    setSaved(prev => prev.filter(q => q._docId !== docId));
  };

  const handleTabQuizType = (type) => {
    setQuizType(type);
    setReviewing([]);
    setGenerated([]);
    loadSavedQuizzes(type);
  };

  if (!allowed) {
    return (
      <div style={{ minHeight:"100dvh", background:"linear-gradient(160deg,#06090f,#0f172a)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"system-ui,sans-serif", color:"#e2e8f0", padding:24 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:"3rem", marginBottom:12 }}>🔒</div>
          <p style={{ color:"#64748b", marginBottom:20 }}>접근 권한이 없습니다.</p>
          <button onClick={() => onBack()} style={{ background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.1)", borderRadius:12, color:"#94a3b8", padding:"10px 24px", cursor:"pointer", fontFamily:"inherit" }}>← 돌아가기</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100dvh", background:"linear-gradient(160deg,#06090f,#0f172a)", display:"flex", flexDirection:"column", fontFamily:"system-ui,sans-serif", color:"#e2e8f0" }}>
      <style>{CSS}</style>

      {/* 헤더 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 16px", background:"rgba(255,255,255,.03)", borderBottom:"1px solid rgba(255,255,255,.07)", flexShrink:0 }}>
        <button onClick={() => onBack()} style={{ width:33, height:33, borderRadius:"50%", background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"#64748b", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        <span style={{ fontWeight:900, fontSize:"1rem", color:"#f87171" }}>🔒 관리자 페이지</span>
        <div style={{ width:33 }}/>
      </div>

      {/* 탭 */}
      <div style={{ display:"flex", gap:6, padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,.06)", flexShrink:0 }}>
        {[["users","👥 유저 관리"],["quiz","🎯 퀴즈 검수"]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding:"7px 16px", borderRadius:20, fontSize:"0.78rem", fontWeight:800, fontFamily:"inherit", cursor:"pointer", border:"1px solid", borderColor:tab===k?"#6366f1":"rgba(255,255,255,.1)", background:tab===k?"rgba(99,102,241,.2)":"rgba(255,255,255,.04)", color:tab===k?"#a78bfa":"#64748b" }}>{l}</button>
        ))}
      </div>

      {/* ── 유저 관리 탭 ── */}
      {tab === "users" && (
        <div style={{ flex:1, overflowY:"auto", padding:"10px 14px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ color:"#475569", fontSize:"0.74rem" }}>총 {users.length}명</span>
            <button onClick={fetchUsers} style={{ background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.3)", borderRadius:9, color:"#a78bfa", fontSize:"0.72rem", padding:"5px 11px", cursor:"pointer", fontFamily:"inherit" }}>새로고침</button>
          </div>
          {loading ? (
            <div style={{ padding:40, textAlign:"center", color:"#475569" }}>불러오는 중...</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {users.map(u => (
                <div key={u.id} style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:"12px 14px", animation:"fadein .3s ease-out" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5 }}>
                    <span style={{ fontWeight:800, fontSize:"0.88rem", color:"#e2e8f0" }}>{u.nickname || "이름없음"}</span>
                    <span style={{ color:"#fbbf24", fontWeight:800, fontSize:"0.86rem" }}>{(u.totalScore||0).toLocaleString()}점</span>
                  </div>
                  <div style={{ color:"#475569", fontSize:"0.68rem", lineHeight:1.8 }}>
                    <span style={{ marginRight:10 }}>📧 {u.email}</span>
                    <span style={{ marginRight:10 }}>🎮 {u.gamePlayCount||0}판</span>
                    <span>🔑 {u.loginCount||0}회</span>
                  </div>
                  <div style={{ color:"#2d3748", fontSize:"0.65rem", marginTop:3 }}>
                    마지막: {u.lastLogin?.toDate ? u.lastLogin.toDate().toLocaleString("ko-KR") : "-"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 퀴즈 검수 탭 ── */}
      {tab === "quiz" && (
        <div style={{ flex:1, overflowY:"auto", padding:"10px 14px" }}>

          {/* 게임 타입 선택 */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
            {GAME_TYPES.map(g => (
              <button key={g.id} onClick={() => handleTabQuizType(g.id)} style={{ padding:"5px 11px", borderRadius:16, fontSize:"0.72rem", fontWeight:800, fontFamily:"inherit", cursor:"pointer", border:"1px solid", borderColor:quizType===g.id?"#f59e0b":"rgba(255,255,255,.1)", background:quizType===g.id?"rgba(245,158,11,.15)":"rgba(255,255,255,.04)", color:quizType===g.id?"#f59e0b":"#64748b" }}>{g.name}</button>
            ))}
          </div>

          {/* 생성 버튼 */}
          <div style={{ display:"flex", gap:10, marginBottom:12, alignItems:"center" }}>
            <button onClick={generateQuiz} disabled={generating} style={{ background:generating?"#1e293b":"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:12, color:"#fff", fontWeight:800, fontSize:"0.82rem", padding:"10px 20px", cursor:generating?"not-allowed":"pointer", fontFamily:"inherit", opacity:generating?.6:1 }}>
              {generating ? "⏳ Gemini 생성 중..." : "🤖 Gemini로 문제 생성"}
            </button>
            {reviewing.filter(q=>q._status==="approved").length > 0 && (
              <button onClick={saveApproved} style={{ background:"linear-gradient(135deg,#22c55e,#16a34a)", border:"none", borderRadius:12, color:"#fff", fontWeight:800, fontSize:"0.82rem", padding:"10px 20px", cursor:"pointer", fontFamily:"inherit" }}>
                ✅ 승인 {reviewing.filter(q=>q._status==="approved").length}개 저장
              </button>
            )}
          </div>
          {genError && <div style={{ color:"#ef4444", fontSize:"0.78rem", marginBottom:8 }}>{genError}</div>}

          {/* 검수 목록 */}
          {reviewing.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ color:"#94a3b8", fontSize:"0.72rem", fontWeight:800, marginBottom:8, letterSpacing:".08em" }}>— 검수 중 ({reviewing.length}개) —</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {reviewing.map(q => (
                  <div key={q._id} style={{ background: q._status==="approved"?"rgba(34,197,94,.08)":q._status==="rejected"?"rgba(239,68,68,.08)":"rgba(255,255,255,.04)", border:`1px solid ${q._status==="approved"?"rgba(34,197,94,.3)":q._status==="rejected"?"rgba(239,68,68,.3)":"rgba(255,255,255,.08)"}`, borderRadius:13, padding:"11px 13px", animation:"fadein .3s ease-out" }}>
                    <QuizPreview item={q} gameType={quizType}/>
                    <div style={{ display:"flex", gap:8, marginTop:8 }}>
                      <button onClick={() => setStatus(q._id,"approved")} style={{ padding:"5px 14px", borderRadius:8, background:q._status==="approved"?"#22c55e":"rgba(34,197,94,.15)", border:`1px solid ${q._status==="approved"?"#22c55e":"rgba(34,197,94,.3)"}`, color:q._status==="approved"?"#fff":"#22c55e", fontSize:"0.74rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>✅ 승인</button>
                      <button onClick={() => setStatus(q._id,"rejected")} style={{ padding:"5px 14px", borderRadius:8, background:q._status==="rejected"?"#ef4444":"rgba(239,68,68,.12)", border:`1px solid ${q._status==="rejected"?"#ef4444":"rgba(239,68,68,.3)"}`, color:q._status==="rejected"?"#fff":"#ef4444", fontSize:"0.74rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>❌ 거절</button>
                      <button onClick={() => setStatus(q._id,"pending")} style={{ padding:"5px 10px", borderRadius:8, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"#64748b", fontSize:"0.74rem", cursor:"pointer", fontFamily:"inherit" }}>↩ 보류</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 저장된 퀴즈 */}
          <div>
            <div style={{ color:"#94a3b8", fontSize:"0.72rem", fontWeight:800, marginBottom:8, letterSpacing:".08em" }}>— 저장된 문제 ({saved.length}개) —</div>
            {saved.length === 0 ? (
              <div style={{ color:"#334155", fontSize:"0.8rem", padding:"16px 0" }}>저장된 문제가 없습니다.</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {saved.map(q => (
                  <div key={q._docId} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:12, padding:"10px 13px", display:"flex", alignItems:"flex-start", gap:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <QuizPreview item={q} gameType={quizType}/>
                    </div>
                    <button onClick={() => deleteQuiz(q._docId)} style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.2)", borderRadius:8, color:"#f87171", fontSize:"0.72rem", padding:"4px 9px", cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>삭제</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 게임 타입별 퀴즈 미리보기
function QuizPreview({ item, gameType }) {
  const s = { color:"#e2e8f0", fontSize:"0.82rem", lineHeight:1.6 };
  const m = { color:"#64748b", fontSize:"0.72rem" };
  switch(gameType) {
    case "speed":
      return <div style={s}><b style={{color:"#a78bfa"}}>{item.word}</b> <span style={m}>— {item.description}</span></div>;
    case "initial":
      return <div style={s}><b style={{color:"#a78bfa"}}>{item.ini}</b> → <b>{item.w}</b> <span style={m}>| {(item.h||[]).join(" / ")}</span></div>;
    case "idiom":
      return <div style={s}><b style={{color:"#f59e0b"}}>{item.f}</b><b>{item.b}</b> <span style={m}>— {item.m}</span></div>;
    case "proverb":
      return <div style={s}><span style={{color:"#94a3b8"}}>{item.question}</span> → <b>{item.answer}</b></div>;
    case "synonym":
      return <div style={s}><b style={{color:"#06b6d4"}}>{item.w}</b> <span style={m}>≒</span> <b>{item.a}</b></div>;
    case "colloc":
      return <div style={s}><b style={{color:"#ec4899"}}>{item.q}</b> → <b>{item.a}</b> <span style={m}>| {(item.o||[]).join(", ")}</span></div>;
    case "twenty":
      return <div style={s}><b style={{color:"#f59e0b"}}>{item.word}</b> <span style={m}>| {(item.hints||[]).slice(0,2).join(" / ")}...</span></div>;
    case "detective":
      return <div style={s}><b style={{color:"#8b5cf6"}}>{item.word}</b> <span style={m}>| {(item.hints||[]).join(" / ")}</span></div>;
    default:
      return <div style={s}>{JSON.stringify(item).slice(0,80)}...</div>;
  }
}