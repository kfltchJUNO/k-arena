"use client";
import { useState, useEffect, useRef } from "react";

export default function GameWordChain({ onBack }) {
  const [history, setHistory] = useState([{ text: "기차", sender: "ai" }]);
  const [input, setInput] = useState("");
  const [turn, setTurn] = useState("user"); // user, ai
  const [score, setScore] = useState(0);
  const [msg, setMsg] = useState("당신의 차례입니다!");
  const [timeLeft, setTimeLeft] = useState(20); // 20초 제한시간
  const [isGameOver, setIsGameOver] = useState(false);
  const scrollRef = useRef(null);

  // 스크롤 자동 이동
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);

  // ⏰ 타이머 로직
  useEffect(() => {
    if (turn !== "user" || isGameOver) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [turn, isGameOver]);

  // 시간 초과 처리
  const handleTimeOut = () => {
    setIsGameOver(true);
    setMsg("⏰ 시간 초과! 패배했습니다.");
    alert("시간이 초과되었습니다! 게임 종료.");
    // 게임 종료 시 점수 저장 및 나가기 처리는 유저가 버튼 누를 때 함
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (turn !== "user" || isGameOver) return;
    
    const val = input.trim().replace(/\s/g, "");
    if (!val) return;
    
    // 1. 중복 검사
    if (history.some(h => h.text === val)) { 
        alert("이미 사용한 단어입니다!"); 
        setInput(""); 
        return; 
    }
    
    // 2. 끝말 규칙 검사 (두음법칙 고려 안 함 - AI에게 맡김 or 간단 체크)
    const lastWord = history[history.length - 1].text;
    const lastChar = lastWord[lastWord.length - 1];
    
    // UI 업데이트 (유저 입력 표시)
    const newHistory = [...history, { text: val, sender: "user" }];
    setHistory(newHistory);
    setInput("");
    setTurn("ai");
    setMsg("AI가 단어를 검증하고 생각 중입니다...");
    setTimeLeft(20); // 타이머 리셋 (보이진 않지만 상태값 초기화)

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `끝말잇기 심판 및 플레이어 역할.
          
          [현재 상황]
          - 이전 단어: "${lastWord}"
          - 유저 입력: "${val}"
          - 사용된 단어들: ${JSON.stringify(newHistory.map(h => h.text))}

          [검증 기준 - 매우 엄격하게]
          1. **국립국어원 표준국어대사전**에 등재된 '명사'인가? (동사, 형용사, 부사, 감탄사 절대 금지)
          2. 실제로 자주 쓰이는 단어인가? (사전에만 있는 옛말, 방언, 희귀어는 valid: false 처리)
          3. 이전 단어의 끝 글자와 이어지는가? (두음법칙 허용: 리->이, 로->노 등)
          4. 한 글자 단어 금지.

          [응답 형식 - JSON]
          {
            "valid": true/false,
            "reason": "오답인 경우 이유 (예: 사전에 없는 단어입니다, 명사가 아닙니다)",
            "aiWord": "valid가 true일 때 이어갈 단어 (없으면 null)",
            "giveUp": false (이어갈 단어가 없으면 true)
          }
          
          * aiWord 조건: 두 글자 이상 명사, '사용된 단어들'에 없는 단어, 튬/륨/꾼 등으로 끝나는 공격 단어 사용 가능.`
        })
      });
      
      const data = await res.json();
      const text = data.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const result = JSON.parse(text);

      if (result.valid) {
        // 유저 정답 인정 -> 점수 획득
        setScore(s => s + 10);

        if (result.giveUp || !result.aiWord) {
          // AI 포기
          setIsGameOver(true);
          setMsg("AI: 졌습니다... 당신의 승리! 🎉 (+50점)");
          setScore(s => s + 50);
        } else {
          // AI 공격
          setHistory(prev => [...prev, { text: result.aiWord, sender: "ai" }]);
          setTurn("user");
          setMsg("당신의 차례입니다!");
          setTimeLeft(20); // 타이머 재시작
        }
      } else {
        // 유저 패배 (단어 검증 실패)
        setIsGameOver(true);
        setMsg(`❌ 패배: ${result.reason}`);
        alert(`땡! ${result.reason}`);
      }
    } catch (e) {
      console.error(e);
      setMsg("AI 연결 오류. 다시 시도해주세요.");
      setTurn("user");
      // 에러 시 롤백
      setHistory(history); 
    }
  };

  return (
    <div className="game-container">
      <div className="header">
        <button onClick={() => onBack(null, score)}>나가기</button>
        <span style={{
          color: timeLeft <= 5 ? '#ff6b6b' : 'var(--primary)',
          fontWeight: 'bold'
        }}>
          {isGameOver ? "종료" : `⏰ ${timeLeft}초`} | {score}점
        </span>
      </div>

      <div className="chat-box">
        {history.map((item, i) => (
          <div key={i} className={`msg ${item.sender}`}>
            {item.text}
          </div>
        ))}
        {turn === "ai" && !isGameOver && (
          <div className="msg ai" style={{color:'#888', fontStyle:'italic'}}>
            ... (생각 중)
          </div>
        )}
        <div ref={scrollRef}></div>
      </div>

      <div className="status-bar" style={{
        padding: '10px 20px', 
        background: '#fff', 
        textAlign: 'center', 
        color: isGameOver ? '#ff6b6b' : '#555',
        borderTop: '1px solid #eee'
      }}>
        {msg}
      </div>

      <form onSubmit={handleSubmit} className="input-area">
        <input 
          value={input} 
          onChange={e=>setInput(e.target.value)} 
          disabled={turn !== "user" || isGameOver} 
          placeholder={isGameOver ? "게임이 종료되었습니다" : "단어를 입력하세요"} 
          autoFocus
        />
        <button type="submit" disabled={turn !== "user" || isGameOver}>입력</button>
      </form>
    </div>
  );
}