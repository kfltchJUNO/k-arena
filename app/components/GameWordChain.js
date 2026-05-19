"use client";
import { useState, useEffect, useRef } from "react";
import { useSFX, Wrap, Hdr, TInput, SBtn } from "@/lib/gameShared";

// 한글 마지막 글자
function lastChar(str) {
  const c = str.replace(/[^가-힣]/g, "");
  return c ? c[c.length - 1] : "";
}
// 한글 첫 글자
function firstChar(str) {
  const c = str.replace(/[^가-힣]/g, "");
  return c ? c[0] : "";
}

const KF = `
@keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
*{box-sizing:border-box}
`;

export default function GameWordChain({ onBack }) {
  const sfx = useSFX();
  const [msgs,       setMsgs]       = useState([{ from:"ai", text:"끝말잇기 시작! 먼저 단어를 입력해줘 😉" }]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [score,      setScore]      = useState(0);
  const [lastAiWord, setLastAiWord] = useState("");   // AI가 마지막에 말한 단어
  const [usedWords,  setUsedWords]  = useState(new Set());

  const scrollRef = useRef(null);
  const iref      = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs]);

  useEffect(() => {
    const fn = () => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; };
    window.visualViewport?.addEventListener("resize", fn);
    return () => window.visualViewport?.removeEventListener("resize", fn);
  }, []);

  useEffect(() => { setTimeout(() => iref.current?.focus(), 200); }, []);

  const addMsg = (from, text) => setMsgs(p => [...p, { from, text }]);

  const send = async () => {
    const word = input.trim();
    if (!word || loading) return;

    // ── 클라이언트 검증 ──────────────────────────────────
    // 1. 한글만
    if (!/^[가-힣]+$/.test(word)) {
      addMsg("ai", "❌ 한글 단어만 입력할 수 있어요!");
      sfx.wrong(); setInput(""); setTimeout(() => iref.current?.focus(), 100); return;
    }
    // 2. 중복
    if (usedWords.has(word)) {
      addMsg("ai", `❌ "${word}"는 이미 사용된 단어예요!`);
      sfx.wrong(); setInput(""); setTimeout(() => iref.current?.focus(), 100); return;
    }
    // 3. 끝말 검증 (두 번째 턴부터)
    if (lastAiWord) {
      const need  = lastChar(lastAiWord);
      const given = firstChar(word);
      if (need !== given) {
        addMsg("ai", `❌ "${lastAiWord}"의 마지막 글자 "${need}"로 시작해야 해요!\n입력하신 "${word}"의 첫 글자는 "${given}"이에요.`);
        sfx.wrong(); setInput(""); setTimeout(() => iref.current?.focus(), 100); return;
      }
    }

    // ── Gemini에 AI 응답 단어 요청 ───────────────────────
    addMsg("user", word);
    setInput("");
    setLoading(true);
    sfx.type();
    const newUsed = new Set([...usedWords, word]);
    setUsedWords(newUsed);

    const need = lastChar(word);  // AI는 이 글자로 시작해야 함

    const prompt = `끝말잇기 AI 차례야.
유저 단어: "${word}"  /  AI 응답은 반드시 "${need}"로 시작해야 해.

조건:
- 실제 존재하는 한국어 명사
- 반드시 "${need}"로 시작 (이 조건이 가장 중요)
- 한방단어 금지 (끝글자로 시작하는 단어가 없으면 안 됨)
- 이미 사용된 단어 금지: ${JSON.stringify([...newUsed])}

JSON만 반환 (설명 없이):
{"reply":"${need}로시작하는단어"}`;

    try {
      const res   = await fetch("/api/gemini", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ prompt }) });
      const d     = await res.json();
      const text  = (d.text || "{}").replace(/```json|```/g, "").trim();
      const json  = JSON.parse(text);
      const reply = (json.reply || "").replace(/[^가-힣]/g, "");

      if (!reply) {
        addMsg("ai", `🏳️ "${need}"로 시작하는 단어를 못 찾겠어요. AI 패배! 당신의 승리 🎉`);
        setScore(s => s + 50); sfx.done();
      } else if (firstChar(reply) !== need) {
        // Gemini가 규칙 위반 → AI 패배
        addMsg("ai", `AI가 "${need}"로 시작하는 단어를 못 찾았어요. 당신의 승리! 🎉`);
        setScore(s => s + 30); sfx.done();
      } else if (newUsed.has(reply)) {
        addMsg("ai", `AI가 이미 사용된 단어를 말했어요. AI 패배! 🎉`);
        setScore(s => s + 30); sfx.done();
      } else {
        addMsg("ai", reply);
        setLastAiWord(reply);
        setUsedWords(s => new Set([...s, reply]));
        setScore(s => s + 10);
        sfx.correct();
      }
    } catch (e) {
      addMsg("ai", "오류가 났어요. 다시 해줘!");
    }

    setLoading(false);
    setTimeout(() => iref.current?.focus(), 100);
  };

  const required = lastAiWord ? lastChar(lastAiWord) : "";

  return (
    <div style={{ minHeight:"100dvh", background:"linear-gradient(160deg,#06090f,#0f172a)", display:"flex", flexDirection:"column", fontFamily:"system-ui,sans-serif", color:"#e2e8f0" }}>
      <style>{KF}</style>

      {/* 헤더 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 17px", background:"rgba(255,255,255,.03)", borderBottom:"1px solid rgba(255,255,255,.07)", flexShrink:0 }}>
        <button onClick={() => onBack()} style={{ width:33, height:33, borderRadius:"50%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"#64748b", cursor:"pointer", fontSize:"0.82rem", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        <div style={{ textAlign:"center" }}>
          <div style={{ color:"#e2e8f0", fontWeight:900, fontSize:"0.92rem" }}>🧩 끝말잇기</div>
          {required && <div style={{ color:"#a78bfa", fontSize:"0.68rem", marginTop:1 }}>다음: "<b>{required}</b>"로 시작</div>}
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end" }}>
          <span style={{ color:"#475569", fontSize:"0.6rem" }}>SCORE</span>
          <span style={{ color:"#fff", fontWeight:900 }}>{score}</span>
        </div>
      </div>

      {/* 채팅 */}
      <div ref={scrollRef} style={{ flex:1, overflowY:"auto", padding:"10px 16px", display:"flex", flexDirection:"column", gap:9 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display:"flex", justifyContent:m.from==="user"?"flex-end":"flex-start", alignItems:"flex-end", gap:7, animation:"fadein .25s ease-out" }}>
            {m.from === "ai" && <div style={{ fontSize:"1.3rem", flexShrink:0 }}>🤖</div>}
            <div style={{ maxWidth:"75%", padding:"10px 14px", borderRadius:m.from==="user"?"15px 4px 15px 15px":"4px 15px 15px 15px", background:m.from==="user"?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(255,255,255,0.07)", color:"#e2e8f0", fontSize:"0.95rem", wordBreak:"break-all", border:m.from==="user"?"none":"1px solid rgba(255,255,255,0.1)", whiteSpace:"pre-line" }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div style={{ color:"#475569", fontSize:"0.78rem", marginLeft:38, animation:"pulse 1s infinite" }}>AI 생각 중...</div>}
      </div>

      {/* 입력 */}
      <div style={{ padding:"11px 16px", display:"flex", gap:10, borderTop:"1px solid rgba(255,255,255,0.06)", flexShrink:0 }}>
        <input
          ref={iref}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
          onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior:"smooth", block:"nearest" }), 300)}
          placeholder={required ? `"${required}"로 시작하는 단어` : "한글 단어를 입력하세요"}
          autoComplete="off" autoCorrect="off" autoCapitalize="none"
          inputMode="text" enterKeyHint="send"
          style={{ flex:1, padding:"13px 16px", borderRadius:13, border:"1.5px solid rgba(255,255,255,0.11)", background:"rgba(255,255,255,0.05)", color:"#e2e8f0", fontSize:"1rem", fontFamily:"inherit", outline:"none" }}
        />
        <SBtn onClick={send} disabled={loading}>{loading ? "⏳" : "→"}</SBtn>
      </div>
    </div>
  );
}