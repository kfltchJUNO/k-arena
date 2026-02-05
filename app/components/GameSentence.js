"use client";
import { useState, useEffect } from "react";

export default function GameSentence({ onBack, pastSentences = [] }) {
  const [list, setList] = useState([]);
  const [idx, setIdx] = useState(0);
  const [shuffledParts, setShuffledParts] = useState([]);
  const [userOrder, setUserOrder] = useState([]);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadBatch = async () => {
    setLoading(true);
    // 난이도 조절: 5문제 이상 풀면 더 긴 문장 출제
    const difficulty = idx > 4 ? "중급 수준의 5~7어절 문장" : "초급 수준의 3~4어절 문장";
    
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `한국어 문장 퍼즐 5개를 만들어줘.
          조건: ${difficulty}. 점점 어렵게. 이미 낸 문장(${JSON.stringify(pastSentences)}) 제외.
          응답: [{ "sentence": "나는 학교에 간다", "parts": ["학교에", "간다", "나는"] }, ...]`
        })
      });
      const data = await res.json();
      const text = data.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);
      setList(prev => [...prev, ...parsed]);
      setLoading(false);
    } catch (e) {
      setList(prev => [...prev, { sentence: "날씨가 매우 좋습니다", parts: ["매우", "좋습니다", "날씨가"] }]);
      setLoading(false);
    }
  };

  useEffect(() => { loadBatch(); }, []);

  useEffect(() => {
    if (list.length > 0 && list[idx]) {
      setShuffledParts([...list[idx].parts].sort(() => Math.random() - 0.5));
      setUserOrder([]);
    }
  }, [idx, list]);

  const selectPart = (part) => {
    if (userOrder.includes(part)) {
      setUserOrder(userOrder.filter(p => p !== part));
    } else {
      setUserOrder([...userOrder, part]);
    }
  };

  const checkAnswer = () => {
    const current = list[idx];
    const userAnswer = userOrder.join(" ");
    
    // 공백 제거 후 비교 (유연성)
    if (userAnswer.replace(/\s/g, "") === current.sentence.replace(/\s/g, "")) {
      alert("정답입니다! ⭕");
      setScore(s => s + 20);
      
      if (idx + 1 < list.length) {
        setIdx(idx + 1);
        if (list.length - (idx + 1) < 2) loadBatch();
      } else {
        alert("모든 문제를 풀었습니다!");
        onBack(list, score + 20, false);
      }
    } else {
      alert("틀렸습니다! 다시 해보세요.");
      setUserOrder([]);
    }
  };

  if (loading && list.length === 0) return <div className="result-box"><h3>문장 로딩 중...</h3></div>;
  if (!list[idx]) return null;

  return (
    <div className="game-container">
      <div className="header">
        <button onClick={() => onBack(list.slice(0, idx), score, true)}>나가기</button>
        <span>문제 {idx + 1} | {score}점</span>
      </div>

      <div className="quiz-card" style={{justifyContent:'flex-start', paddingTop:'40px'}}>
        <h3 style={{marginBottom:'20px'}}>문장을 완성하세요</h3>
        
        {/* 정답 칸 */}
        <div style={{minHeight:'60px', borderBottom:'2px solid #ddd', width:'100%', marginBottom:'20px', fontSize:'1.5rem', fontWeight:'bold', color:'var(--primary)'}}>
          {userOrder.join(" ")}
        </div>

        {/* 조각 버튼들 */}
        <div style={{display:'flex', flexWrap:'wrap', gap:'10px', justifyContent:'center'}}>
          {shuffledParts.map((part, i) => (
            <button 
              key={i} 
              onClick={() => selectPart(part)}
              style={{
                background: userOrder.includes(part) ? '#ccc' : 'white',
                color: userOrder.includes(part) ? '#fff' : '#333',
                border: '2px solid #ddd', padding: '10px 15px', borderRadius: '10px', fontSize:'1.1rem'
              }}
            >
              {part}
            </button>
          ))}
        </div>
      </div>
      
      <div className="input-area">
        <button onClick={checkAnswer} className="full-btn">제출하기</button>
      </div>
    </div>
  );
}