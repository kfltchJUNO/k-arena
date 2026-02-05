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

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userWord = input.trim();
    const newMsgs = [...messages, { sender: "user", text: userWord }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const lastAiMsg = messages.filter(m => m.sender === 'ai').pop();
      const lastAiWord = lastAiMsg ? lastAiMsg.text.split(" ").pop().replace(/[!.?]/g, "") : "";
      
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `끝말잇기 게임 중이야. 이전 단어: "${lastAiWord}", 유저 입력: "${userWord}".
          1. 유저 단어가 유효한 명사인지, 끝말이 맞는지 확인해.
          2. 틀렸으면: { "valid": false, "reason": "이유" }
          3. 맞았으면: { "valid": true, "reply": "이어갈단어" }
          한방 단어 금지. JSON 응답.`
        })
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
      setMessages(prev => [...prev, { sender: "ai", text: "오류가 났어. 다시 말해줘!" }]);
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