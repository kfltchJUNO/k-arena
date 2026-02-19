"use client";
import { useState, useRef, useEffect } from "react";

export default function GameWordChain({ onBack }) {
  const [messages, setMessages] = useState([
    { sender: "ai", text: "끝말잇기 시작! 먼저 단어를 입력해줘 😉" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);
  const scrollRef = useRef(null);

  // 스크롤 자동 내리기
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const userWord = input.trim();
    if (!userWord || loading) return;

    // 클라이언트 측 1차 방어: 한글만 입력되게 처리
    if (!/^[가-힣]+$/.test(userWord)) {
      alert("공백이나 기호 없이 한글 단어만 입력해주세요!");
      return;
    }

    const newMsgs = [...messages, { sender: "user", text: userWord }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      // ★ 버그 수정 1: AI의 '진짜' 이전 단어 찾기 (첫 인삿말 제외 및 이모티콘 완벽 제거)
      const aiMessages = messages.filter(m => m.sender === 'ai');
      let lastAiWord = "";
      
      if (aiMessages.length > 1) {
        // 가장 마지막 AI 메시지에서 순수 '한글'만 추출 (이모티콘, 마침표 등 다 날림)
        lastAiWord = aiMessages[aiMessages.length - 1].text.replace(/[^가-힣]/g, "");
      }
      
      let prompt = "";
      
      // ★ 버그 수정 2: 첫 턴과 진행 중 턴 분리
      if (!lastAiWord) {
        // 첫 번째 턴 (유저가 첫 단어 제시)
        prompt = `끝말잇기 게임의 첫 턴이야. 유저가 제시한 단어: "${userWord}".
        1. 이 단어가 사전에 있는 유효한 명사인지 확인해.
        2. 유효하지 않으면: { "valid": false, "reason": "명사가 아닙니다." }
        3. 유효하면, 이 단어의 끝 글자로 시작하는 단어로 받아쳐: { "valid": true, "reply": "이어갈단어" }
        [중요 조건] reply에는 절대 이모티콘이나 문장부호를 넣지 말고 오직 '순수 한글 단어'만 출력해. 한방 단어 금지. 오직 JSON 형식으로만 응답해.`;
      } else {
        // 두 번째 턴 이상 (정상적인 꼬리물기)
        prompt = `끝말잇기 진행 중. AI의 이전 단어: "${lastAiWord}", 유저 입력: "${userWord}".
        1. 유저의 단어가 사전에 있는 명사인지, 그리고 "${lastAiWord}"의 끝 글자(또는 두음법칙)로 시작하는지 엄격히 확인해.
        2. 틀렸으면: { "valid": false, "reason": "틀린 이유 (예: 끝말이 안 이어짐, 명사가 아님)" }
        3. 맞았으면: { "valid": true, "reply": "이어갈단어" }
        [중요 조건] reply에는 절대 이모티콘이나 문장부호를 넣지 말고 오직 '순수 한글 단어'만 출력해. 한방 단어 금지. 오직 JSON 형식으로만 응답해.`;
      }

      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      const data = await res.json();
      const json = JSON.parse(data.text.replace(/```json|```/g, "").trim());

      if (json.valid) {
        setMessages(prev => [...prev, { sender: "ai", text: json.reply }]);
        setScore(s => s + 10);
      } else {
        setMessages(prev => [...prev, { sender: "ai", text: `땡! ${json.reason} 😅` }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { sender: "ai", text: "앗, 시스템에 오류가 났어. 다시 입력해줄래?" }]);
    }
    setLoading(false);
  };

  return (
    <div className="game-container" style={{background: '#b2c7d9'}}>
      <div className="header" style={{background: '#b2c7d9', borderBottom:'1px solid rgba(0,0,0,0.1)', color:'#333'}}>
        <button onClick={() => onBack([], score, true)} style={{background:'none', color:'#333', border:'1px solid #666'}}>나가기</button>
        <span>점수: {score}</span>
      </div>

      <div className="chat-box" ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px'
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', 
            justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            alignItems: 'flex-end'
          }}>
            {msg.sender === 'ai' && <div style={{fontSize:'1.5rem', marginRight:'5px'}}>🤖</div>}
            <div style={{
              maxWidth: '75%', padding: '10px 14px',
              borderRadius: msg.sender === 'user' ? '15px 0px 15px 15px' : '0px 15px 15px 15px',
              background: msg.sender === 'user' ? '#ffeaa7' : '#ffffff',
              color: '#2d3436', boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              fontSize: '1rem', wordBreak: 'break-all'
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && <div style={{textAlign:'left', color:'#555', fontSize:'0.8rem', marginLeft:'35px'}}>입력 중...</div>}
      </div>

      <form onSubmit={sendMessage} className="input-area" style={{background:'#fff', padding:'10px'}}>
        <input 
          value={input} onChange={(e) => setInput(e.target.value)} 
          placeholder="단어를 입력하세요" autoFocus 
          style={{background:'#f1f2f6', border:'none', borderRadius:'20px', padding:'10px 15px'}}
        />
        <button type="submit" disabled={loading} style={{borderRadius:'50%', width:'50px', height:'50px', padding:0, background:'#ffeaa7', color:'#333'}}>➤</button>
      </form>
    </div>
  );
}