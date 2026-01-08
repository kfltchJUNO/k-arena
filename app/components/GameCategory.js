"use client";
import { useState, useEffect } from "react";

export default function GameCategory({ onBack, pastTopics = [] }) {
  const [topic, setTopic] = useState("주제를 선정 중...");
  const [input, setInput] = useState("");
  const [words, setWords] = useState([]);
  const [timeLeft, setTimeLeft] = useState(40);
  const [gameState, setGameState] = useState("loading");
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState([]); // 채점 상세 결과 (단어별 O/X)

  const startRound = async () => {
    setGameState("loading");
    setFeedback([]);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `구체적인 명사 카테고리 주제를 하나 선정해줘. 
          추상적 주제 금지. 이미 낸 주제(${JSON.stringify(pastTopics)}) 제외. 
          오직 JSON: { "topic": "주제명" }`
        })
      });
      const data = await res.json();
      const json = JSON.parse(data.text.replace(/```json|```/g, "").trim());
      setTopic(json.topic);
      setGameState("playing");
      setTimeLeft(40);
      setWords([]);
    } catch (e) {
      setTopic("한국 음식 이름");
      setGameState("playing");
    }
  };

  useEffect(() => { startRound(); }, []);

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

  const handleInput = (e) => {
    e.preventDefault();
    const val = input.trim();
    if (!val || words.includes(val)) { setInput(""); return; }
    setWords([...words, val]);
    setInput("");
  };

  const finishGame = async () => {
    setGameState("verifying");
    
    if (words.length === 0) {
      setScore(0);
      setGameState("result");
      return;
    }

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `주제: "${topic}" / 유저 입력: ${JSON.stringify(words)}
          
          위 단어들이 주제에 맞는지 하나씩 채점해줘.
          [응답 형식 - JSON]
          {
            "results": [
              { "word": "단어명", "isCorrect": true/false, "reason": "짧은 이유(생략가능)" }
            ],
            "totalScore": 획득점수(개당 10점)
          }`
        })
      });
      const data = await res.json();
      const result = JSON.parse(data.text.replace(/```json|```/g, "").trim());
      
      setScore(result.totalScore);
      setFeedback(result.results); // 채점 상세 데이터 저장
    } catch (e) {
      // 에러 시 모든 단어 정답 처리 (유저 보호)
      setScore(words.length * 10);
      setFeedback(words.map(w => ({ word: w, isCorrect: true, reason: "통과" })));
    }
    setGameState("result");
  };

  return (
    <div className="game-container">
      <div className="header">
        <button onClick={() => onBack([topic], score)}>나가기</button>
        <span>⏳ {timeLeft}s | {score}점</span>
      </div>

      {gameState === "playing" && (
        <>
          <div className="quiz-card" style={{ flex: '0 0 auto', padding: '20px' }}>
            <h2 style={{ color: 'var(--primary)', fontSize: '2rem' }}>{topic}</h2>
          </div>
          <div className="scroll-box">
            {words.map((w, i) => <span key={i} className="tag">{w}</span>)}
          </div>
          <form onSubmit={handleInput} className="input-area">
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="단어 입력 후 엔터" autoFocus />
          </form>
        </>
      )}

      {gameState === "verifying" && (
        <div className="result-box">
          <h2 className="loading-text">AI가 채점 판정 중...</h2>
        </div>
      )}

      {gameState === "result" && (
        <div className="result-box" style={{ justifyContent: 'flex-start', paddingTop: '40px' }}>
          <h3>주제: {topic}</h3>
          <h1 style={{ fontSize: '4rem', margin: '10px 0' }}>{score}점</h1>
          
          <div style={{ width: '100%', padding: '10px', background: '#f8f9fa', borderRadius: '15px' }}>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>▼ 채점 상세 결과</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {feedback.map((f, i) => (
                <span key={i} style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  background: f.isCorrect ? '#e1f5fe' : '#ffebee',
                  color: f.isCorrect ? '#0288d1' : '#d32f2f',
                  border: `1px solid ${f.isCorrect ? '#b3e5fc' : '#ffcdd2'}`
                }}>
                  {f.word} {f.isCorrect ? '✅' : '❌'}
                </span>
              ))}
              {feedback.length === 0 && <p>입력한 단어가 없습니다.</p>}
            </div>
          </div>

          <button onClick={startRound} className="full-btn" style={{ marginTop: '30px' }}>한 판 더!</button>
          <button onClick={() => onBack([topic], score)} className="text-btn">로비로 이동</button>
        </div>
      )}
    </div>
  );
}