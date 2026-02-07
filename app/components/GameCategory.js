"use client";
import { useState, useEffect, useRef } from "react";

export default function GameCategory({ onBack, pastTopics = [] }) {
  const [topic, setTopic] = useState("");
  const [input, setInput] = useState("");
  const [words, setWords] = useState([]);
  const [timeLeft, setTimeLeft] = useState(40);
  const [gameState, setGameState] = useState("loading"); // loading -> playing -> verifying -> result
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState([]); // 검증 결과 저장
  
  // 주제 고정용 Ref (게임 중 주제 변경 방지)
  const topicLocked = useRef(false);

  // 1. 게임 시작 (주제 받기)
  const startRound = async () => {
    if (topicLocked.current) return;
    topicLocked.current = true;
    
    setGameState("loading");
    setFeedback([]);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `구체적인 명사 카테고리 주제를 하나 선정해줘. 
          [조건]
          1. 너무 쉽지도 어렵지도 않은 주제 (예: 악기, 문구류, 수도 이름, 라면 종류 등)
          2. 추상적 주제 금지 (예: 행복, 슬픔 X).
          3. 이미 낸 주제(${JSON.stringify(pastTopics)}) 제외. 
          4. 오직 JSON: { "topic": "주제명" }`
        })
      });
      const data = await res.json();
      const json = JSON.parse(data.text.replace(/```json|```/g, "").trim());
      setTopic(json.topic);
      setGameState("playing");
      setTimeLeft(40);
      setWords([]);
    } catch (e) {
      setTopic("편의점 음식"); // 에러 시 기본 주제
      setGameState("playing");
    }
  };

  useEffect(() => { startRound(); }, []);

  // 2. 타이머
  useEffect(() => {
    if (gameState !== "playing") return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); finishGame(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  // 3. 입력 핸들러
  const handleInput = (e) => {
    e.preventDefault();
    const val = input.trim();
    if (!val || words.includes(val)) { setInput(""); return; }
    setWords([...words, val]);
    setInput("");
  };

  // 4. 게임 종료 및 AI 검증 (핵심 수정 부분)
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
          prompt: `주제: "${topic}"
          사용자가 입력한 단어들: ${JSON.stringify(words)}
          
          [임무]
          각 단어가 위 주제에 포함되는지 엄격하게 판단해줘.
          
          [응답 형식 JSON]
          { 
            "results": [
              { "word": "단어1", "isCorrect": true }, 
              { "word": "단어2", "isCorrect": false }
            ]
          }
          * isCorrect: 주제에 맞고 존재하는 단어면 true.`
        })
      });
      const data = await res.json();
      const parsed = JSON.parse(data.text.replace(/```json|```/g, "").trim());
      
      const results = parsed.results;
      const validCount = results.filter(r => r.isCorrect).length;
      
      setScore(validCount * 10);
      setFeedback(results);
    } catch (e) {
      console.error("채점 에러", e);
      // 에러 시 일단 다 맞은 걸로 처리 (유저 경험 보호)
      setScore(words.length * 10);
      setFeedback(words.map(w => ({ word: w, isCorrect: true })));
    }
    setGameState("result");
  };

  // 재시작
  const restart = () => {
    topicLocked.current = false;
    startRound();
  };

  return (
    <div className="game-container">
      <div className="header">
        <button onClick={() => onBack([topic], score, true)}>나가기</button>
        <span>⏳ {timeLeft}s</span>
      </div>

      {gameState === "playing" && (
        <>
          <div className="quiz-card" style={{ flex: '0 0 auto', padding: '20px' }}>
            <h3 style={{color:'#636e72', margin:0}}>오늘의 주제</h3>
            <h2 style={{ color: 'var(--primary)', fontSize: '2.5rem', margin:'10px 0' }}>{topic}</h2>
          </div>
          
          <div className="scroll-box">
            {words.map((w, i) => <span key={i} className="tag">{w}</span>)}
            {words.length === 0 && <p style={{color:'#ccc'}}>단어를 입력하세요!</p>}
          </div>
          
          <form onSubmit={handleInput} className="input-area">
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="단어 입력" autoFocus />
            <button type="submit">입력</button>
          </form>
        </>
      )}

      {gameState === "loading" && <div className="result-box"><h3>주제를 뽑는 중...</h3></div>}
      
      {gameState === "verifying" && (
        <div className="result-box">
          <h2>🤖 AI 채점관이 확인 중...</h2>
          <p>주제에 맞는 단어인지 보고 있어요!</p>
        </div>
      )}
      
      {gameState === "result" && (
        <div className="result-box">
          <h3>{topic}</h3>
          <h1 style={{fontSize:'3rem', color:'var(--primary)'}}>{score}점</h1>
          
          <div style={{
            display:'flex', flexWrap:'wrap', gap:'8px', justifyContent:'center',
            margin:'20px 0', maxHeight:'300px', overflowY:'auto'
          }}>
            {feedback.map((f, i) => (
              <span key={i} style={{
                padding: '8px 15px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 'bold',
                background: f.isCorrect ? '#e1f5fe' : '#ffebee',
                color: f.isCorrect ? '#00b894' : '#ff7675',
                border: f.isCorrect ? '1px solid #00b894' : '1px solid #ff7675'
              }}>
                {f.word} {f.isCorrect?'O':'X'}
              </span>
            ))}
          </div>

          <button onClick={restart} className="full-btn" style={{marginBottom:'10px'}}>한 판 더!</button>
          <button onClick={() => onBack([topic], score, false)} className="full-btn" style={{background:'#a29bfe'}}>저장하고 나가기</button>
        </div>
      )}
    </div>
  );
}