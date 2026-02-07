"use client";
import { useState, useEffect } from "react";

export default function GameFactory({ onBack }) {
  const [targetInitials, setTargetInitials] = useState(["", ""]); // 두 개의 초성
  const [input, setInput] = useState("");
  const [words, setWords] = useState([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameState, setGameState] = useState("loading");
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState([]);

  // 1. 초성 추출을 위한 표준 한글 자음 배열 (19개)
  // 유니코드 계산 공식상 반드시 이 순서대로 19개가 있어야 인덱스가 정확히 맞습니다.
  const ALL_CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

  // 2. 문제 출제용 쉬운 자음 배열 (복잡한 ㄲ, ㄸ, ㅃ, ㅉ 등은 제외하여 난이도 조절)
  const QUIZ_CHO = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

  // 게임 시작 (초성 2개 랜덤 선택)
  useEffect(() => {
    const first = QUIZ_CHO[Math.floor(Math.random() * QUIZ_CHO.length)];
    const second = QUIZ_CHO[Math.floor(Math.random() * QUIZ_CHO.length)];
    setTargetInitials([first, second]);
    setGameState("playing");
  }, []);

  // 타이머
  useEffect(() => {
    if (gameState !== "playing") return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  // ★ 핵심 수정: 초성 추출 로직 (19개 자음 기준)
  const getInitial = (char) => {
    const code = char.charCodeAt(0) - 44032;
    // 한글이 아니거나 자음만 있는 경우 등
    if (code < 0 || code > 11171) return ""; 
    const initialIndex = Math.floor(code / 588);
    return ALL_CHO[initialIndex];
  };

  const handleInput = (e) => {
    e.preventDefault();
    const val = input.trim();
    
    // 1. 이미 입력한 단어 체크
    if (!val || words.includes(val)) {
      setInput("");
      return;
    }

    // 2. 길이 체크 (초성이 2개이므로 반드시 2글자여야 함)
    if (val.length !== 2) {
      alert("2글자 단어를 입력해주세요!");
      setInput("");
      return;
    }

    // 3. 한글 완성형 체크
    const isCompleteHangul = /^[가-힣]{2}$/.test(val);
    if (!isCompleteHangul) {
      alert("완성된 한글 2글자만 가능합니다.");
      setInput("");
      return;
    }

    // 4. 초성 일치 체크
    const initial1 = getInitial(val.charAt(0));
    const initial2 = getInitial(val.charAt(1));

    if (initial1 !== targetInitials[0] || initial2 !== targetInitials[1]) {
      alert(`제시된 초성 [${targetInitials[0]} ${targetInitials[1]}] (와)과 일치하지 않습니다.`);
      setInput("");
      return;
    }

    // 통과
    setWords([...words, val]);
    setInput("");
  };

  const finishGame = async () => {
    setGameState("verifying");

    if (words.length === 0) {
      setScore(0);
      setFeedback([]);
      setGameState("result");
      return;
    }

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `사용자가 초성 '${targetInitials[0]} ${targetInitials[1]}'(으)로 구성된 2글자 단어들을 입력했어.
          국립국어원 표준국어대사전 기준으로 존재하는 명사인지 엄격하게 채점해줘.
          
          [입력된 단어 목록]: ${JSON.stringify(words)}
          
          다음 JSON 형식으로만 응답해:
          {
            "results": [
              { "word": "가수", "isValid": true },
              { "word": "갹수", "isValid": false }
            ]
          }
          * isValid 기준: 표준국어대사전에 등재된 명사면 true, 아니면 false.`
        }),
      });

      const data = await res.json();
      const parsed = JSON.parse(data.text.replace(/```json|```/g, "").trim());
      
      const results = parsed.results;
      const validCount = results.filter(r => r.isValid).length;
      
      setFeedback(results);
      setScore(validCount * 10);
      setGameState("result");

    } catch (error) {
      console.error("채점 오류:", error);
      setScore(words.length * 10);
      setFeedback(words.map(w => ({ word: w, isValid: true })));
      setGameState("result");
    }
  };

  return (
    <div className="game-container">
      <div className="header">
        <button onClick={() => onBack([], score, true)}>나가기</button>
        <span>⏳ {timeLeft}초</span>
      </div>

      {gameState === "playing" && (
        <>
          <div className="quiz-card" style={{padding:'30px'}}>
            <h3 style={{color:'#636e72'}}>제시된 초성</h3>
            <div style={{display:'flex', justifyContent:'center', gap:'10px', margin:'20px 0'}}>
              <div style={initialBoxStyle}>{targetInitials[0]}</div>
              <div style={initialBoxStyle}>{targetInitials[1]}</div>
            </div>
            <p style={{wordBreak: 'keep-all'}}>이 초성에 맞는 <b>2글자 단어</b>를 만드세요!</p>
          </div>

          <div className="scroll-box" style={{maxHeight:'200px'}}>
            {words.map((w, i) => (
              <span key={i} className="tag">{w}</span>
            ))}
            {words.length === 0 && <span style={{color:'#ccc'}}>단어를 입력하세요 (예: 가수)</span>}
          </div>

          <form onSubmit={handleInput} className="input-area">
            <input 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder={`예: ${targetInitials[0]}ㅏ${targetInitials[1]}ㅡ`}
              autoFocus 
              maxLength={2}
            />
            <button type="submit">입력</button>
          </form>
        </>
      )}

      {gameState === "verifying" && (
        <div className="result-box">
          <h2>🤖 AI가 채점 중...</h2>
          <p>사전을 뒤적거리는 중입니다!</p>
        </div>
      )}

      {gameState === "result" && (
        <div className="result-box">
          <h3>검증 완료!</h3>
          <h1 style={{fontSize:'3rem', color:'var(--primary)'}}>{score}점</h1>
          
          <div style={{
            display:'flex', flexWrap:'wrap', gap:'10px', justifyContent:'center', 
            margin:'20px 0', maxHeight:'300px', overflowY:'auto'
          }}>
            {feedback.map((item, index) => (
              <span 
                key={index} 
                style={{
                  padding: '8px 15px',
                  borderRadius: '20px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  background: item.isValid ? '#e1f5fe' : '#ffebee',
                  color: item.isValid ? '#00b894' : '#ff7675',
                  border: item.isValid ? '1px solid #00b894' : '1px solid #ff7675'
                }}
              >
                {item.word} {item.isValid ? 'O' : 'X'}
              </span>
            ))}
          </div>

          <button onClick={() => onBack([], score, false)} className="full-btn">결과 저장하고 나가기</button>
        </div>
      )}
    </div>
  );
}

// 스타일 객체
const initialBoxStyle = {
  background: '#6c5ce7', 
  color: 'white', 
  width: '80px', 
  height: '80px', 
  borderRadius: '20px', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center',
  fontSize: '3rem', 
  fontWeight: 'bold',
  boxShadow: '0 4px 10px rgba(108, 92, 231, 0.3)'
};