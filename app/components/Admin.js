"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, doc, setDoc, deleteDoc, Timestamp } from "firebase/firestore";

const ADMIN_EMAIL = "ot.helper7@gmail.com";

// ── 컬렉션 ID는 게임 파일의 로딩 코드와 반드시 일치해야 함 ──
const GAME_TYPES = [
  {
    id: "speed", name: "스피드 퀴즈",
    prompt: `한국어 스피드 퀴즈 15문제를 만들어줘.
규칙:
- 설명은 초등학생 3학년도 바로 이해할 수 있을 만큼 쉽고 직관적으로
- 이모지 1~2개 포함, 15자 이내
- 일상에서 자주 쓰는 쉬운 명사 위주 (어려운 단어 금지)
- 모든 단어가 서로 달라야 함 (중복 금지)
좋은 예시: {"word":"사과","description":"🍎 빨갛고 달콤한 과일"}
나쁜 예시: {"word":"개념","description":"추상적 사고의 단위"} (너무 어려움)
JSON 배열만 반환: [{"word":"단어","description":"설명"}]`,
  },
  {
    id: "initial", name: "초성 퀴즈",
    prompt: `한국어 초성 퀴즈 15문제를 만들어줘.
규칙:
- 초등학생도 알 만한 쉬운 단어
- 힌트 3개는 점점 구체적으로 (힌트1이 가장 어렵고 힌트3이 가장 쉬움)
- 초성이 실제 단어와 일치하는지 반드시 확인
- 중복 단어 금지
예시: {"ini":"ㅅㄱ","w":"사과","h":["빨간색이에요","달콤해요","🍎 과일이에요"]}
JSON 배열만 반환: [{"ini":"초성","w":"정답","h":["힌트1","힌트2","힌트3"]}]`,
  },
  {
    id: "idiom", name: "사자성어 잇기",
    prompt: `한국어 사자성어 잇기 12문제를 만들어줘.
규칙:
- 실제 존재하는 사자성어만 (꾸며내지 말 것)
- 중학생도 알 만한 것 위주
- 뜻 설명은 쉽게
- 앞 두 글자 + 뒤 두 글자가 정확히 맞을 것
- 중복 금지
JSON 배열만 반환: [{"f":"일석","b":"이조","m":"한 번에 두 가지 이득을 얻음"}]`,
  },
  {
    id: "proverb", name: "속담 이어달리기",
    prompt: `한국 속담 15개를 만들어줘.
규칙:
- 초등학생도 알 만한 친숙한 속담
- 앞부분과 뒷부분이 명확하게 나뉘는 것
- 중복 금지
- 실제 존재하는 속담만
예시: {"question":"가는 말이 고와야","answer":"오는 말이 곱다"}
JSON 배열만 반환: [{"question":"앞부분","answer":"뒷부분"}]`,
  },
  {
    id: "synonym", name: "유의어 잇기",
    prompt: `한국어 유의어 쌍 15개를 만들어줘.
규칙:
- 중학생이 알 만한 단어
- 실제로 뜻이 비슷한 쌍 (억지 유의어 금지)
- 중복 금지
예시: {"w":"기쁨","a":"즐거움"}
JSON 배열만 반환: [{"w":"기준단어","a":"유의어"}]`,
  },
  {
    id: "collocation", name: "짝꿍 단어",
    prompt: `한국어 콜로케이션(짝꿍) 퀴즈 12개를 만들어줘.
규칙:
- 목적어 + 동사 짝꿍 (예: "꿈을 꾸다", "신발을 신다")
- 4개의 선택지 중 1개만 정답 (나머지 3개는 어울리지 않는 동사)
- 초등학생도 이해할 수 있는 수준
- 중복 금지
JSON 배열만 반환: [{"q":"목적어","a":"정답동사","o":["정답","오답1","오답2","오답3"]}]
※ o 배열은 반드시 정답을 포함한 4개여야 함`,
  },
  {
    id: "twenty", name: "스무고개",
    prompt: `스무고개 퀴즈 10개를 만들어줘.
규칙:
- 초등학생도 알 만한 사물, 동물, 음식 등
- 힌트 4개: 점점 더 구체적으로 (힌트1=가장 막연, 힌트4=거의 답이 보임)
- 중복 금지
예시: {"word":"냉장고","hints":["집 안에 있어요","전기를 써요","음식을 넣어요","차갑게 보관해요"]}
JSON 배열만 반환: [{"word":"정답","hints":["힌트1","힌트2","힌트3","힌트4"]}]`,
  },
  {
    id: "homonym", name: "연상 탐정",
    prompt: `연상 퀴즈 10개를 만들어줘.
규칙:
- 단서 3개로 정답을 맞히는 게임
- 단서 3개는 모두 정답과 관련되지만 직접적으로 말하지 않음
- 초등학생도 알 만한 단어
- 중복 금지
예시: {"word":"바나나","hints":["노란색","원숭이가 좋아해","구부러진 모양"]}
JSON 배열만 반환: [{"word":"정답","hints":["단서1","단서2","단서3"]}]`,
  },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap');
*{box-sizing:border-box}
::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px}
@keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
`;

export default function Admin({ onBack }) {
  const [tab,        setTab]        = useState("users");
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [allowed,    setAllowed]    = useState(false);
  const [quizType,   setQuizType]   = useState("speed");
  const [generating, setGenerating] = useState(false);
  const [reviewing,  setReviewing]  = useState([]);
  const [saved,      setSaved]      = useState([]);
  const [genError,   setGenError]   = useState("");
  const [genCount,   setGenCount]   = useState(0); // 생성 횟수 (중복 방지용 seed)

  useEffect(() => {
    const u = auth.currentUser;
    if (u?.email === ADMIN_EMAIL) {
      setAllowed(true);
      fetchUsers();
      loadSaved("speed");
    } else {
      setAllowed(false);
      setLoading(false);
    }
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const qs = await getDocs(query(collection(db, "k_arena_users"), orderBy("lastLogin", "desc")));
      setUsers(qs.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Gemini로 퀴즈 생성
  const generateQuiz = async () => {
    setGenerating(true); setGenError(""); setReviewing([]);
    const gt = GAME_TYPES.find(g => g.id === quizType);

    // 이미 저장된 단어 목록 추출 (중복 방지)
    const existingWords = saved.map(q => q.word || q.w || q.f || q.question || "").filter(Boolean);
    const dedupeNote = existingWords.length > 0
      ? `\n\n⚠️ 이미 저장된 항목이므로 제외: ${JSON.stringify(existingWords.slice(0, 20))}`
      : "";

    const prompt = gt.prompt + dedupeNote + `\n\n생성 세션: ${genCount + 1} (매번 다른 문제를 생성할 것)`;

    try {
      const res  = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`API 오류: ${res.status}`);
      const d    = await res.json();
      if (d.error) throw new Error(d.error);
      const text = (d.text || "[]").replace(/```json|```/g, "").trim();
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("JSON 파싱 실패: " + text.slice(0, 100));
      const items = JSON.parse(match[0]);
      if (!Array.isArray(items) || items.length === 0) throw new Error("생성된 문제가 없어요");

      // 로컬 중복 제거
      const seenKeys = new Set(existingWords);
      const deduped = items.filter(item => {
        const key = item.word || item.w || item.f || item.question || JSON.stringify(item);
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      });

      setReviewing(deduped.map((item, i) => ({ ...item, _id: i, _status: "pending" })));
      setGenCount(c => c + 1);
    } catch (e) {
      setGenError("❌ " + e.message);
    }
    setGenerating(false);
  };

  const setStatus = (id, status) => {
    setReviewing(prev => prev.map(q => q._id === id ? { ...q, _status: status } : q));
  };

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
      loadSaved(quizType);
    } catch (e) { alert("저장 실패: " + e.message); }
  };

  const loadSaved = async (type) => {
    try {
      const qs = await getDocs(collection(db, `quiz_${type}`));
      setSaved(qs.docs.map(d => ({ _docId: d.id, ...d.data() })));
    } catch { setSaved([]); }
  };

  const deleteQuiz = async (docId) => {
    if (!confirm("삭제할까요?")) return;
    await deleteDoc(doc(db, `quiz_${quizType}`, docId));
    setSaved(prev => prev.filter(q => q._docId !== docId));
  };

  const handleTypeChange = (type) => {
    setQuizType(type); setReviewing([]); setGenError("");
    loadSaved(type);
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
        <div style={{ width:33 }} />
      </div>

      {/* 탭 */}
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

          {/* 게임 타입 선택 */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
            {GAME_TYPES.map(g => (
              <button key={g.id} onClick={() => handleTypeChange(g.id)} style={{ padding:"5px 11px", borderRadius:16, fontSize:"0.72rem", fontWeight:800, fontFamily:"inherit", cursor:"pointer", border:"1px solid", borderColor:quizType===g.id?"#f59e0b":"rgba(255,255,255,.1)", background:quizType===g.id?"rgba(245,158,11,.15)":"rgba(255,255,255,.04)", color:quizType===g.id?"#f59e0b":"#64748b" }}>
                {g.name}
              </button>
            ))}
          </div>

          {/* 저장 현황 */}
          <div style={{ background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.2)", borderRadius:10, padding:"8px 13px", marginBottom:12, fontSize:"0.76rem", color:"#a78bfa" }}>
            📦 현재 저장된 문제: <b>{saved.length}개</b>
            {saved.length > 0 && <span style={{ color:"#64748b" }}> (새 생성 시 중복 자동 제외)</span>}
          </div>

          {/* 생성 버튼 */}
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

          {/* 검수 목록 */}
          {reviewing.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ color:"#94a3b8", fontSize:"0.71rem", fontWeight:800, marginBottom:8 }}>— 검수 중 ({reviewing.length}개) —</div>
              <div style={{ marginBottom:8, display:"flex", gap:8 }}>
                <button onClick={() => setReviewing(p => p.map(q => ({...q, _status:"approved"})))} style={{ padding:"5px 12px", borderRadius:8, background:"rgba(34,197,94,.15)", border:"1px solid rgba(34,197,94,.3)", color:"#22c55e", fontSize:"0.72rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>전체 승인</button>
                <button onClick={() => setReviewing(p => p.map(q => ({...q, _status:"rejected"})))} style={{ padding:"5px 12px", borderRadius:8, background:"rgba(239,68,68,.12)", border:"1px solid rgba(239,68,68,.3)", color:"#ef4444", fontSize:"0.72rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>전체 거절</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {reviewing.map(q => (
                  <div key={q._id} style={{ background:q._status==="approved"?"rgba(34,197,94,.07)":q._status==="rejected"?"rgba(239,68,68,.07)":"rgba(255,255,255,.04)", border:`1px solid ${q._status==="approved"?"rgba(34,197,94,.25)":q._status==="rejected"?"rgba(239,68,68,.25)":"rgba(255,255,255,.08)"}`, borderRadius:12, padding:"10px 13px", animation:"fadein .25s ease-out" }}>
                    <QuizPreview item={q} gameType={quizType} />
                    <div style={{ display:"flex", gap:7, marginTop:8 }}>
                      <button onClick={() => setStatus(q._id,"approved")} style={{ padding:"4px 12px", borderRadius:7, background:q._status==="approved"?"#22c55e":"rgba(34,197,94,.15)", border:`1px solid ${q._status==="approved"?"#22c55e":"rgba(34,197,94,.3)"}`, color:q._status==="approved"?"#fff":"#22c55e", fontSize:"0.72rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>✅ 승인</button>
                      <button onClick={() => setStatus(q._id,"rejected")} style={{ padding:"4px 12px", borderRadius:7, background:q._status==="rejected"?"#ef4444":"rgba(239,68,68,.12)", border:`1px solid ${q._status==="rejected"?"#ef4444":"rgba(239,68,68,.3)"}`, color:q._status==="rejected"?"#fff":"#ef4444", fontSize:"0.72rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>❌ 거절</button>
                      <button onClick={() => setStatus(q._id,"pending")} style={{ padding:"4px 10px", borderRadius:7, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"#64748b", fontSize:"0.72rem", cursor:"pointer", fontFamily:"inherit" }}>↩ 보류</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 저장된 퀴즈 */}
          <div>
            <div style={{ color:"#94a3b8", fontSize:"0.71rem", fontWeight:800, marginBottom:8 }}>— 저장된 문제 ({saved.length}개) —</div>
            {saved.length === 0 ? (
              <div style={{ color:"#334155", fontSize:"0.8rem", padding:"12px 0" }}>저장된 문제가 없습니다.</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {saved.map(q => (
                  <div key={q._docId} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:11, padding:"9px 12px", display:"flex", alignItems:"flex-start", gap:10 }}>
                    <div style={{ flex:1, minWidth:0 }}><QuizPreview item={q} gameType={quizType} /></div>
                    <button onClick={() => deleteQuiz(q._docId)} style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.2)", borderRadius:7, color:"#f87171", fontSize:"0.7rem", padding:"4px 8px", cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>삭제</button>
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
    case "speed":
      return <div style={s}><b style={{color:"#a78bfa"}}>{item.word}</b><span style={g}> — {item.description}</span></div>;
    case "initial":
      return <div style={s}><b style={{color:"#a78bfa"}}>{item.ini}</b> → <b>{item.w}</b><span style={g}> | {(item.h||[]).join(" / ")}</span></div>;
    case "idiom":
      return <div style={s}><b style={{color:"#f59e0b"}}>{item.f}{item.b}</b><span style={g}> — {item.m}</span></div>;
    case "proverb":
      return <div style={s}><span style={{color:"#94a3b8"}}>{item.question}</span><span style={g}> → </span><b>{item.answer}</b></div>;
    case "synonym":
      return <div style={s}><b style={{color:"#06b6d4"}}>{item.w}</b><span style={g}> ≒ </span><b>{item.a}</b></div>;
    case "collocation":
      return <div style={s}><b style={{color:"#ec4899"}}>{item.q}</b> → <b>{item.a}</b><span style={g}> | {(item.o||[]).join(", ")}</span></div>;
    case "twenty":
      return <div style={s}><b style={{color:"#f59e0b"}}>{item.word}</b><span style={g}> | {(item.hints||[]).slice(0,2).join(" / ")}...</span></div>;
    case "homonym":
      return <div style={s}><b style={{color:"#8b5cf6"}}>{item.word}</b><span style={g}> | {(item.hints||[]).join(" / ")}</span></div>;
    default:
      return <div style={s}>{JSON.stringify(item).slice(0,80)}</div>;
  }
}