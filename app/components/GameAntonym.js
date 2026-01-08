"use client";
import { useState, useEffect } from "react";

export default function GameAntonym({ onBack }) {
  const [quizzes, setQuizzes] = useState([]);
  const [current, setCurrent] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  // ★ 배치 로딩 (프롬프트 대폭 수정)
  const loadBatch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `한국어 반대말(Antonym) 퀴즈 10개를 JSON 배열로 줘.
          
          [엄격한 출제 기준]
          1. 난이도: 초등학교 저학년 수준의 기초 어휘.
          2. 관계: 논란의 여지가 없는 **'절대적 반대말'**만 선정. (맥락에 따라 달라지는 단어 금지)
          3. 품사: 형용사, 동사 위주.
          
          [나쁜 예 - 절대 금지]
          - 건너다 <-> 막히다 (X: 관계 불명확)
          - 밥 <-> 빵 (X: 그냥 다른 종류임)
          - 빨강 <-> 파랑 (X: 반대 아님)
          
          [좋은 예]
          - 높다 <-> 낮다
          - 덥다 <-> 춥다
          - 켜다 <-> 끄다
          - 입다 <-> 벗다
          - 빠르다 <-> 느리다
          
          응답 형식:
          [{"word": "빠르다", "answer": "느리다"}, {"word": "가볍다", "answer": "무겁다"}...]`
        })
      });
      const data = await res.json();
      const newQuizzes = JSON.parse(data.text.match(/\[.*\]/s)[0]);
      setQuizzes(prev => [...prev, ...newQuizzes]);
      setLoading(false);
    } catch (e) { 
      // 에러 시 기본 문제 추가
      setQuizzes(prev => [...prev, {word: "크다", answer: "작다"}, {word: "웃다", answer: "울다"}]);
      setLoading(false); 
    }
  };

  useEffect(() => { loadBatch(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (quizzes.length === 0) return;

    const q = quizzes[current];
    // 공백 제거 후 비교
    if (input.trim().replace(/\s/g,"") === q.answer.replace(/\s/g,"")) {
      setScore(s => s + 10);
      setInput("");
      // 다음 문제로 이동 로직
      if (current + 1 < quizzes.length) {
        setCurrent(c => c + 1);
        // 미리 로딩 (끊김 방지)
        if (quizzes.length - current === 3) loadBatch(); 
      } else {
        alert("잠시만요! 문제를 더 가져오고 있어요.");
        loadBatch();
      }
    } else {
      alert(`땡! ❌\n'${q.word}'의 반대말은 '${q.answer}' 입니다.`);
      // 점수와 현재까지 푼 문제 리스트를 반환하며 종료
      onBack(quizzes.slice(0, current + 1), score);
    }
  };

  if (quizzes.length === 0) return <div className="result-box"><h3>문제를 가져오는 중...</h3></div>;
  const q = quizzes[current];

  return (
    <div className="game-container">
      <div className="header">
        <button onClick={() => onBack([], score)}>나가기</button> 
        <span>{score}점</span>
      </div>
      
      <div className="quiz-card">
        <h3>🐸 반대말 말하기 ({current + 1}번)</h3>
        
        {/* ★ 디자인 수정: 텍스트 그림자 제거, 진한 색상, 폰트 크기 확대 */}
        <h1 style={{
          fontSize: '4.5rem', 
          color: '#2d3436', 
          margin: '20px 0',
          fontWeight: '900',
          letterSpacing: '-2px',
          textShadow: 'none' // 기존의 복잡한 그림자 제거
        }}>
          {q.word}
        </h1>
        
        <p style={{fontSize: '1.2rem', color: '#666'}}>
          의 반대말은?
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="input-area">
        <input 
          value={input} 
          onChange={e=>setInput(e.target.value)} 
          autoFocus 
          placeholder="정답 입력" 
          style={{textAlign:'center', fontWeight:'bold'}}
        />
        <button type="submit">확인</button>
      </form>
    </div>
  );
}