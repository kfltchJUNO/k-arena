"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, Timestamp } from "firebase/firestore";

const ADMIN_EMAIL = "ot.helper7@gmail.com";

const GAME_TYPES = [
  {
    id: "speed", name: "스피드 퀴즈",
    prompt: `한국어 스피드 퀴즈 15문제.
- 단어: 초등학생도 아는 일상 명사
- 설명: 이모지 없이 15자 이내 순한국어 설명 (쉬운 단어는 설명이 더 구체적, 어려운 단어만 이모지 허용)
- 쉬운 단어 예시: {"word":"냉장고","description":"음식을 차갑게 보관하는 가전"}
- 어려운 단어 예시: {"word":"망원경","description":"🔭 멀리 있는 것을 크게 보는 도구"}
- 중복 금지
JSON 배열만: [{"word":"단어","description":"설명","level":1}]  (level: 1=쉬움, 2=보통, 3=어려움)`,
  },
  {
    id: "initial", name: "초성 퀴즈",
    prompt: `한국어 초성 퀴즈 15문제.
- 초등학생도 알 만한 쉬운 단어
- 힌트 3개: 힌트1이 가장 막연, 힌트3이 가장 구체적
- 초성이 실제 단어와 정확히 일치할 것 (예: 사과=ㅅㄱ, 마음=ㅁㅇ, 학교=ㅎㄱ)
- 중복 금지
JSON 배열만: [{"ini":"ㅅㄱ","w":"사과","h":["힌트1","힌트2","힌트3"]}]`,
  },
  {
    id: "idiom", name: "사자성어 잇기",
    prompt: `실제 존재하는 한국어 사자성어 12개.
- 중학생도 알 만한 것
- 앞 두 글자 + 뒤 두 글자 정확히 분리
- 뜻 설명 쉽게
- 중복 금지
JSON 배열만: [{"f":"일석","b":"이조","m":"한 번에 두 가지 이득"}]`,
  },
  {
    id: "proverb", name: "속담 이어달리기",
    prompt: `친숙한 한국 속담 15개.
- 초등학생도 알 만한 것
- 앞부분/뒷부분 명확히 분리
- 중복 금지
JSON 배열만: [{"question":"앞부분","answer":"뒷부분"}]`,
  },
  {
    id: "synonym", name: "유의어 잇기",
    prompt: `한국어 유의어 쌍 15개.
- 중학생이 알 만한 단어
- 실제로 뜻이 비슷한 쌍만 (억지 유의어 금지)
- 중복 금지
JSON 배열만: [{"w":"기쁨","a":"즐거움"}]`,
  },
  {
    id: "collocation", name: "짝꿍 단어",
    prompt: `한국어 콜로케이션 퀴즈 12개.
중요 규칙:
- 목적어(q)와 정답 동사(a)는 실제로 자주 함께 쓰이는 자연스러운 조합
- 오답 3개(o 배열의 나머지)는 해당 목적어와 절대 어울리지 않는 동사로 구성
- 오답이 정답처럼 느껴지면 안 됨 (예: "밥을-보다"는 완전히 틀린 조합)
좋은 예시: {"q":"꿈을","a":"꾸다","o":["꾸다","깨다","잡다","버리다"]}
나쁜 예시: {"q":"밥을","a":"먹다","o":["먹다","보다","듣다","뛰다"]} — 오답이 너무 말이 안 됨, 오답들이 더 자연스러워야 헷갈림
- o 배열은 반드시 정답 포함 4개, 섞인 순서로
- 중복 금지
JSON 배열만: [{"q":"목적어","a":"정답동사","o":["정답","오답1","오답2","오답3"]}]`,
  },
  {
    id: "twenty", name: "스무고개",
    prompt: `스무고개 퀴즈 10개.
- 초등학생도 알 만한 사물·동물·음식
- 힌트 4개: 점점 구체적 (힌트1=가장 모호, 힌트4=거의 답)
- 중복 금지
JSON 배열만: [{"word":"냉장고","hints":["집 안에 있어요","전기를 써요","음식을 넣어요","차갑게 보관해요"]}]`,
  },
  {
    id: "homonym", name: "연상 탐정",
    prompt: `연상 퀴즈 10개.
- 단서 3개로 정답 맞히기
- 초등학생도 알 만한 단어
- 단서 3개 모두 정답과 관련되지만 직접 말하지 않음
- 중복 금지
JSON 배열만: [{"word":"바나나","hints":["노란색","원숭이가 좋아해","구부러진 모양"]}]`,
  },
];

const CSS = `
*{box-sizing:border-box}
::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px}
@keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
`;

export default function Admin({ onBack }) {
  const [tab,        setTab]        = useState("users");
  const [users,      setUsers]      = useState([]);
  const [usersLoaded,setUsersLoaded]= useState(false);
  const [usersError, setUsersError] = useState("");
  const [loading,    setLoading]    = useState(false);
  const [allowed,    setAllowed]    = useState(false);
  const [quizType,   setQuizType]   = useState("speed");
  const [generating, setGenerating] = useState(false);
  const [reviewing,  setReviewing]  = useState([]);
  const [saved,      setSaved]      = useState([]);
  const [genError,   setGenError]   = useState("");
  const [genCount,   setGenCount]   = useState(0);

  useEffect(() => {
    const u = auth.currentUser;
    if (u?.email === ADMIN_EMAIL) {
      setAllowed(true);
      loadSaved("speed");
    } else {
      setAllowed(false);
    }
  }, []);

  // 유저 탭 클릭 시 로딩 (최초 1회)
  useEffect(() => {
    if (tab === "users" && !usersLoaded && allowed) fetchUsers();
  }, [tab, allowed]);

  const fetchUsers = async () => {
    setLoading(true); setUsersError("");
    try {
      // FIX: orderBy 제거 → 복합 인덱스 불필요
      const snap = await getDocs(collection(db, "k_arena_users"));
      const data = snap.docs
        .map(d => ({ id:d.id, ...d.data() }))
        .sort((a,b) => (b.totalScore||0) - (a.totalScore||0)); // 클라이언트 정렬
      setUsers(data);
      setUsersLoaded(true);
    } catch (e) {
      setUsersError("로딩 실패: " + e.message);
    }
    setLoading(false);
  };

  const generateQuiz = async () => {
    setGenerating(true); setGenError(""); setReviewing([]);
    const gt = GAME_TYPES.find(g => g.id === quizType);
    const existingKeys = saved.map(q => q.word||q.w||q.f||q.question||"").filter(Boolean);
    const dedupeNote = existingKeys.length > 0
      ? `\n이미 있는 항목 제외: ${JSON.stringify(existingKeys.slice(0,20))}`
      : "";
    const prompt = gt.prompt + dedupeNote + `\n세션번호: ${genCount+1}`;
    try {
      const res = await fetch("/api/gemini", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      const text = (d.text||"[]").replace(/```json|```/g,"").trim();
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("JSON 파싱 실패");
      const items = JSON.parse(match[0]);
      if (!items.length) throw new Error("생성된 문제 없음");

      // 로컬 중복 제거
      const seen = new Set(existingKeys);
      const deduped = items.filter(i => {
        const k = i.word||i.w||i.f||i.question||JSON.stringify(i);
        if (seen.has(k)) return false;
        seen.add(k); return true;
      });
      setReviewing(deduped.map((item, i) => ({...item, _id:i, _status:"pending"})));
      setGenCount(c => c+1);
    } catch(e) { setGenError("❌ " + e.message); }
    setGenerating(false);
  };

  const setStatus = (id, status) => setReviewing(p => p.map(q => q._id===id ? {...q,_status:status} : q));

  const saveApproved = async () => {
    const approved = reviewing.filter(q => q._status==="approved");
    if (!approved.length) { alert("승인된 문제가 없습니다."); return; }
    try {
      for (const q of approved) {
        const {_id,_status,...data} = q;
        await setDoc(doc(collection(db,`quiz_${quizType}`)), {...data, createdAt:Timestamp.now(), approved:true});
      }
      alert(`✅ ${approved.length}개 저장 완료!`);
      setReviewing([]); loadSaved(quizType);
    } catch(e) { alert("저장 실패: " + e.message); }
  };

  const loadSaved = async (type) => {
    try {
      const qs = await getDocs(collection(db, `quiz_${type}`));
      setSaved(qs.docs.map(d => ({_docId:d.id,...d.data()})));
    } catch { setSaved([]); }
  };

  const deleteQuiz = async (docId) => {
    if (!confirm("삭제할까요?")) return;
    await deleteDoc(doc(db, `quiz_${quizType}`, docId));
    setSaved(p => p.filter(q => q._docId!==docId));
  };

  const handleTypeChange = (type) => { setQuizType(type); setReviewing([]); setGenError(""); loadSaved(type); };

  if (!allowed) return (
    <div style={{ minHeight:"100dvh", background:"linear-gradient(160deg,#06090f,#0f172a)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"system-ui,sans-serif", color:"#e2e8f0", padding:24 }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:"3rem", marginBottom:12 }}>🔒</div>
        <p style={{ color:"#64748b", marginBottom:20 }}>접근 권한이 없습니다.</p>
        <button onClick={() => onBack()} style={{ background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.1)", borderRadius:12, color:"#94a3b8", padding:"10px 24px", cursor:"pointer", fontFamily:"inherit" }}>← 돌아가기</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100dvh", background:"linear-gradient(160deg,#06090f,#0f172a)", display:"flex", flexDirection:"column", fontFamily:"system-ui,sans-serif", color:"#e2e8f0" }}>
      <style>{CSS}</style>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 16px", background:"rgba(255,255,255,.03)", borderBottom:"1px solid rgba(255,255,255,.07)", flexShrink:0 }}>
        <button onClick={() => onBack()} style={{ width:33, height:33, borderRadius:"50%", background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"#64748b", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        <span style={{ fontWeight:900, fontSize:"1rem", color:"#f87171" }}>🔒 관리자 페이지</span>
        <div style={{ width:33 }} />
      </div>

      <div style={{ display:"flex", gap:6, padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,.06)", flexShrink:0 }}>
        {[["users","👥 유저 관리"],["quiz","🎯 퀴즈 검수"]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding:"7px 16px", borderRadius:20, fontSize:"0.78rem", fontWeight:800, fontFamily:"inherit", cursor:"pointer", border:"1px solid", borderColor:tab===k?"#6366f1":"rgba(255,255,255,.1)", background:tab===k?"rgba(99,102,241,.2)":"rgba(255,255,255,.04)", color:tab===k?"#a78bfa":"#64748b" }}>{l}</button>
        ))}
      </div>

      {/* ── 유저 관리 ── */}
      {tab === "users" && (
        <div style={{ flex:1, overflowY:"auto", padding:"10px 14px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ color:"#475569", fontSize:"0.74rem" }}>총 {users.length}명</span>
            <button onClick={fetchUsers} style={{ background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.3)", borderRadius:9, color:"#a78bfa", fontSize:"0.72rem", padding:"5px 11px", cursor:"pointer", fontFamily:"inherit" }}>새로고침</button>
          </div>
          {loading ? (
            <div style={{ padding:40, textAlign:"center", color:"#475569" }}>불러오는 중...</div>
          ) : usersError ? (
            <div style={{ color:"#ef4444", fontSize:"0.82rem", padding:"12px 0" }}>{usersError}</div>
          ) : users.length === 0 ? (
            <div style={{ color:"#334155", fontSize:"0.82rem", padding:"20px 0" }}>유저 데이터가 없습니다.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {users.map(u => (
                <div key={u.id} style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:"12px 14px", animation:"fadein .3s ease-out" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontWeight:800, fontSize:"0.88rem" }}>{u.nickname || "이름없음"}</span>
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

      {/* ── 퀴즈 검수 ── */}
      {tab === "quiz" && (
        <div style={{ flex:1, overflowY:"auto", padding:"10px 14px" }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
            {GAME_TYPES.map(g => (
              <button key={g.id} onClick={() => handleTypeChange(g.id)} style={{ padding:"5px 11px", borderRadius:16, fontSize:"0.72rem", fontWeight:800, fontFamily:"inherit", cursor:"pointer", border:"1px solid", borderColor:quizType===g.id?"#f59e0b":"rgba(255,255,255,.1)", background:quizType===g.id?"rgba(245,158,11,.15)":"rgba(255,255,255,.04)", color:quizType===g.id?"#f59e0b":"#64748b" }}>
                {g.name}
              </button>
            ))}
          </div>

          <div style={{ background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.2)", borderRadius:10, padding:"8px 13px", marginBottom:12, fontSize:"0.76rem", color:"#a78bfa" }}>
            📦 저장된 문제: <b>{saved.length}개</b>
          </div>

          <div style={{ display:"flex", gap:10, marginBottom:10, flexWrap:"wrap", alignItems:"center" }}>
            <button onClick={generateQuiz} disabled={generating} style={{ background:generating?"#1e293b":"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:12, color:"#fff", fontWeight:800, fontSize:"0.82rem", padding:"10px 20px", cursor:generating?"not-allowed":"pointer", fontFamily:"inherit", opacity:generating?.6:1 }}>
              {generating ? "⏳ 생성 중..." : "🤖 Gemini로 문제 생성"}
            </button>
            {reviewing.filter(q=>q._status==="approved").length > 0 && (
              <button onClick={saveApproved} style={{ background:"linear-gradient(135deg,#22c55e,#16a34a)", border:"none", borderRadius:12, color:"#fff", fontWeight:800, fontSize:"0.82rem", padding:"10px 20px", cursor:"pointer", fontFamily:"inherit" }}>
                ✅ {reviewing.filter(q=>q._status==="approved").length}개 저장
              </button>
            )}
          </div>
          {genError && <div style={{ color:"#ef4444", fontSize:"0.78rem", marginBottom:10, padding:"8px 12px", background:"rgba(239,68,68,.1)", borderRadius:8 }}>{genError}</div>}

          {reviewing.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ color:"#94a3b8", fontSize:"0.71rem", fontWeight:800, marginBottom:6 }}>— 검수 중 ({reviewing.length}개) —</div>
              <div style={{ display:"flex", gap:7, marginBottom:8 }}>
                <button onClick={() => setReviewing(p=>p.map(q=>({...q,_status:"approved"})))} style={{ padding:"5px 12px", borderRadius:8, background:"rgba(34,197,94,.15)", border:"1px solid rgba(34,197,94,.3)", color:"#22c55e", fontSize:"0.72rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>전체 승인</button>
                <button onClick={() => setReviewing(p=>p.map(q=>({...q,_status:"rejected"})))} style={{ padding:"5px 12px", borderRadius:8, background:"rgba(239,68,68,.12)", border:"1px solid rgba(239,68,68,.3)", color:"#ef4444", fontSize:"0.72rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>전체 거절</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {reviewing.map(q => (
                  <div key={q._id} style={{ background:q._status==="approved"?"rgba(34,197,94,.07)":q._status==="rejected"?"rgba(239,68,68,.07)":"rgba(255,255,255,.04)", border:`1px solid ${q._status==="approved"?"rgba(34,197,94,.25)":q._status==="rejected"?"rgba(239,68,68,.25)":"rgba(255,255,255,.08)"}`, borderRadius:11, padding:"9px 12px" }}>
                    <QuizPreview item={q} gameType={quizType} />
                    <div style={{ display:"flex", gap:6, marginTop:7 }}>
                      <button onClick={()=>setStatus(q._id,"approved")} style={{ padding:"4px 11px", borderRadius:7, background:q._status==="approved"?"#22c55e":"rgba(34,197,94,.15)", border:`1px solid ${q._status==="approved"?"#22c55e":"rgba(34,197,94,.3)"}`, color:q._status==="approved"?"#fff":"#22c55e", fontSize:"0.71rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>✅ 승인</button>
                      <button onClick={()=>setStatus(q._id,"rejected")} style={{ padding:"4px 11px", borderRadius:7, background:q._status==="rejected"?"#ef4444":"rgba(239,68,68,.12)", border:`1px solid ${q._status==="rejected"?"#ef4444":"rgba(239,68,68,.3)"}`, color:q._status==="rejected"?"#fff":"#ef4444", fontSize:"0.71rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>❌ 거절</button>
                      <button onClick={()=>setStatus(q._id,"pending")} style={{ padding:"4px 9px", borderRadius:7, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"#64748b", fontSize:"0.71rem", cursor:"pointer", fontFamily:"inherit" }}>↩</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ color:"#94a3b8", fontSize:"0.71rem", fontWeight:800, marginBottom:8 }}>— 저장된 문제 ({saved.length}개) —</div>
            {saved.length === 0 ? (
              <div style={{ color:"#334155", fontSize:"0.8rem", padding:"12px 0" }}>저장된 문제가 없습니다.</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {saved.map(q => (
                  <div key={q._docId} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:10, padding:"8px 11px", display:"flex", alignItems:"flex-start", gap:8 }}>
                    <div style={{ flex:1, minWidth:0 }}><QuizPreview item={q} gameType={quizType} /></div>
                    <button onClick={()=>deleteQuiz(q._docId)} style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.2)", borderRadius:7, color:"#f87171", fontSize:"0.7rem", padding:"3px 8px", cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>삭제</button>
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

function QuizPreview({ item, gameType }) {
  const s = { color:"#e2e8f0", fontSize:"0.81rem", lineHeight:1.6 };
  const g = { color:"#64748b", fontSize:"0.71rem" };
  switch (gameType) {
    case "speed":      return <div style={s}><b style={{color:"#a78bfa"}}>{item.word}</b><span style={g}> — {item.description}</span></div>;
    case "initial":    return <div style={s}><b style={{color:"#a78bfa"}}>{item.ini}</b> → <b>{item.w}</b><span style={g}> | {(item.h||[]).join(" / ")}</span></div>;
    case "idiom":      return <div style={s}><b style={{color:"#f59e0b"}}>{item.f}{item.b}</b><span style={g}> — {item.m}</span></div>;
    case "proverb":    return <div style={s}><span style={{color:"#94a3b8"}}>{item.question}</span><span style={g}> → </span><b>{item.answer}</b></div>;
    case "synonym":    return <div style={s}><b style={{color:"#06b6d4"}}>{item.w}</b><span style={g}> ≒ </span><b>{item.a}</b></div>;
    case "collocation":return <div style={s}><b style={{color:"#ec4899"}}>{item.q}</b> → <b>{item.a}</b><span style={g}> | {(item.o||[]).join(", ")}</span></div>;
    case "twenty":     return <div style={s}><b style={{color:"#f59e0b"}}>{item.word}</b><span style={g}> | {(item.hints||[]).slice(0,2).join(" / ")}...</span></div>;
    case "homonym":    return <div style={s}><b style={{color:"#8b5cf6"}}>{item.word}</b><span style={g}> | {(item.hints||[]).join(" / ")}</span></div>;
    default:           return <div style={s}>{JSON.stringify(item).slice(0,80)}</div>;
  }
}