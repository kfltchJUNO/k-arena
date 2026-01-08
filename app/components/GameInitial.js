"use client";
import { useState, useEffect } from "react";

export default function GameInitial({ onBack, pastWords = [] }) {
  const [list, setList] = useState([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [hintOpen, setHintOpen] = useState(0);

  const loadBatch = async () => {
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `한국어 초성 퀴즈 10개를 JSON 배열로 줘.
          
          [조건]
          1. 난이도: **한국어능력시험(TOPIK) 3~4급 수준의 중급 명사**. (너무 쉬운 유아용 단어 금지)
          2. 이미 낸 단어(${JSON.stringify(pastWords)}) 제외.
          3. 힌트는 3단계로 점진적으로.
          
          [예시]
          - "ㄱㄷ" -> "갈등" (힌트: 칡과 등나무, 서로 복잡하게 얽힘, 마음의 싸움)
          - "ㅎㄱ" -> "환경" (힌트: 우리 주변의 자연, 오염, 보존해야 함)
          
          응답 형식:
          [{"initial": "ㄱㄷ", "word": "갈등", "hints": ["칡과 등나무", "서로 복잡하게 얽힘", "마음의 싸움"]}, ...]`
        })
      });
      const data = await res.json();
      const text = data.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(text.match(/\[.*\]/s)[0]);
      setList(prev => [...prev, ...parsed]);
    } catch (e) {
      // 에러 시 기본 중급 단어 추가
      setList(prev => [...prev, { initial: "ㅇㅈ", word: "열정", hints: ["뜨거운 마음", "무언가에 몰입함", "포기하지 않음"] }]);
    }
  };

  useEffect(() => { loadBatch(); }, []);

  const check = (e) => {
    e.preventDefault();
    if (!list[idx]) return;

    if (input.trim() === list[idx].word) {
      setScore(s => s + 20 - (hintOpen * 5));
      setHintOpen(0);
      setInput("");
      
      if (idx + 1 < list.length) {
        setIdx(i => i + 1);
      } else {
        loadBatch(); 
        setIdx(i => i + 1); 
      }
    } else {
      alert("땡!");
      setInput("");
    }
  };

  // 로딩 대기 화면
  if (list.length === 0 || !list[idx]) {
    return <div className="result-box"><h3>중급 단어를 고르는 중...</h3></div>;
  }

  const quiz = list[idx];

  return (
    <div className="game-container">
      <div className="header">
        <button onClick={() => onBack([], score)}>나가기</button> 
        <span>{score}점</span>
      </div>
      <div className="quiz-card">
        <h3>🤫 자음 퀴즈 ({idx + 1}번)</h3>
        
        {/* 가독성 개선된 초성 */}
        <h1 style={{fontSize:'4.5rem', letterSpacing:'10px', margin:'20px 0', fontWeight:'900', color:'#2d3436'}}>
          {quiz.initial}
        </h1>
        
        {hintOpen > 0 && <div style={{background:'#f1f2f6', padding:'10px', borderRadius:'10px', marginBottom:'5px', width:'80%'}}>💡 {quiz.hints[0]}</div>}
        {hintOpen > 1 && <div style={{background:'#f1f2f6', padding:'10px', borderRadius:'10px', marginBottom:'5px', width:'80%'}}>💡 {quiz.hints[1]}</div>}
        {hintOpen > 2 && <div style={{background:'#f1f2f6', padding:'10px', borderRadius:'10px', width:'80%'}}>💡 {quiz.hints[2]}</div>}
        
        {hintOpen < 3 && (
          <button 
            onClick={()=>setHintOpen(h=>h+1)} 
            style={{marginTop:'20px', background:'#636e72', color:'white', padding:'8px 15px', borderRadius:'20px', fontSize:'0.9rem'}}
          >
            힌트 보기 (-5점)
          </button>
        )}
      </div>
      <form onSubmit={check} className="input-area">
        <input value={input} onChange={e=>setInput(e.target.value)} autoFocus placeholder="정답 입력" style={{textAlign:'center', fontWeight:'bold'}} />
        <button type="submit">확인</button>
      </form>
    </div>
  );
}