"use client";
import { useState, useEffect } from "react";

export default function GameTwenty({ onBack, pastWords = [] }) {
  const [list, setList] = useState([]);
  const [idx, setIdx] = useState(0); // 현재 문제 인덱스
  const [hintsToShow, setHintsToShow] = useState([]);
  const [input, setInput] = useState("");
  const [hintStep, setHintStep] = useState(0); // 0~3 (힌트 1개~4개)
  const [totalScore, setTotalScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [roundCount, setRoundCount] = useState(1); // 현재 라운드
  const [gameOver, setGameOver] = useState(false);

  // 문제 로딩
  const loadBatch = async (isHardMode = false) => {
    setLoading(true);
    try {
      const difficulty = isHardMode ? "고급(TOPIK 5~6급) 추상명사나 전문용어" : "초중급(TOPIK 1~4급) 일상 단어";
      
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `스무고개 퀴즈 5개를 JSON 배열로 만들어.
          
          [조건]
          1. 난이도: ${difficulty}
          2. 카테고리: 직업, 사물, 감정, 장소, 자연, 개념 등 다양하게.
          3. **중복 금지:** 아래 단어들은 절대 사용 금지: ${JSON.stringify(pastWords.concat(list.map(i=>i.word)))}
          
          [힌트 규칙]
          - 힌트는 총 4개.
          - 힌트 1: 아주 알쏭달쏭하게 (범위가 넓음)
          - 힌트 2: 조금 구체적
          - 힌트 3: 결정적 특징
          - 힌트 4: 거의 정답에 가까움
          
          응답: [{"word": "정답", "hints": ["힌트1", "힌트2", "힌트3", "힌트4"]}, ...]`
        })
      });
      const data = await res.json();
      const text = data.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text.match(/\[.*\]/s)[0]);
      
      setList(prev => [...prev, ...parsed]);
      setLoading(false);
    } catch (e) {
      setList(prev => [...prev, { word: "휴대폰", hints: ["전자기기예요", "사람들이 매일 써요", "통화를 할 수 있어요", "손에 들고 다녀요"] }]);
      setLoading(false);
    }
  };

  useEffect(() => { loadBatch(false); }, []);

  // 문제가 바뀌면 초기화
  useEffect(() => {
    if (list.length > 0 && list[idx]) {
      setHintsToShow([list[idx].hints[0]]);
      setHintStep(0);
    }
  }, [idx, list]);

  const check = (e) => {
    e.preventDefault();
    if (gameOver || !list[idx]) return;
    
    const currentQuiz = list[idx];
    if (input.trim() === currentQuiz.word) {
      // 정답 맞힘! (힌트를 적게 쓸수록 고득점)
      // 힌트 1개(step0): 100점 / 2개: 80점 / 3개: 60점 / 4개: 40점
      const gainedScore = 100 - (hintStep * 20);
      setTotalScore(s => s + gainedScore);
      alert(`정답! ⭕ (+${gainedScore}점)`);
      
      nextRound();
    } else {
      // 틀림
      if (hintStep + 1 < currentQuiz.hints.length) {
        // 다음 힌트 공개
        setHintStep(prev => prev + 1);
        setHintsToShow(prev => [...prev, currentQuiz.hints[hintStep + 1]]);
        setInput("");
        alert("틀렸습니다! 다음 힌트를 보세요.");
      } else {
        // 모든 힌트를 다 썼는데도 틀림 -> 게임 종료
        setGameOver(true);
      }
    }
  };

  const nextRound = () => {
    setInput("");
    setRoundCount(r => r + 1);

    // 10문제마다 난이도 상승 체크
    const nextIdx = idx + 1;
    const isHard = (roundCount + 1) > 10;

    if (nextIdx < list.length) {
      setIdx(nextIdx);
      // 미리 로딩
      if (list.length - nextIdx < 2) loadBatch(isHard);
    } else { 
      alert("다음 단계로 넘어갑니다! (난이도 상승 🔥)"); 
      loadBatch(isHard); 
      setIdx(nextIdx); 
    }
  };

  // 게임 종료 화면
  if (gameOver) {
    return (
      <div className="result-box">
        <h1 style={{color:'#d63031'}}>GAME OVER</h1>
        <h3>정답은 [{list[idx].word}] 였습니다.</h3>
        <h2>최종 점수: {totalScore}점</h2>
        <div style={{marginTop:'30px'}}>
           <button onClick={() => onBack(list.slice(0, idx), totalScore)} className="full-btn">점수 저장하고 나가기</button>
        </div>
      </div>
    );
  }

  if (list.length === 0 || !list[idx]) return <div className="result-box"><h3>문제를 만드는 중...</h3></div>;

  return (
    <div className="game-container">
      <div className="header">
        {/* 나가기 버튼: 3번째 인자 true -> 저장 안 함 */}
        <button onClick={() => onBack([], 0, true)}>나가기 (저장X)</button> 
        <span>라운드 {roundCount} | {totalScore}점</span>
      </div>
      
      <div className="quiz-card" style={{justifyContent:'flex-start', paddingTop:'20px'}}>
        <h3>👶 스무고개 Jr</h3>
        <p style={{fontSize:'0.9rem', color:'#888'}}>힌트를 적게 볼수록 점수가 높아요!</p>
        
        <div style={{width:'90%', margin:'10px auto', textAlign:'left'}}>
          {hintsToShow.map((h, i) => (
            <div key={i} style={{
              padding:'15px', background: i === hintsToShow.length -1 ? '#fff0f6' : '#f1f2f6', 
              margin:'8px 0', borderRadius:'15px', fontSize:'1.1rem',
              border: i === hintsToShow.length -1 ? '2px solid #ff7675' : '2px solid transparent',
              animation: 'slideUp 0.3s ease-out'
            }}>
              💡 힌트 {i+1}: <b>{h}</b>
            </div>
          ))}
        </div>
      </div>
      
      <form onSubmit={check} className="input-area">
        <input value={input} onChange={e=>setInput(e.target.value)} autoFocus placeholder="정답은?" />
        <button type="submit">제출</button>
      </form>
    </div>
  );
}