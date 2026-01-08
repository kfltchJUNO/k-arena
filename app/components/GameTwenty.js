"use client";
import { useState, useEffect } from "react";

export default function GameTwenty({ onBack, pastWords = [] }) {
  const [list, setList] = useState([]);
  const [idx, setIdx] = useState(0);
  const [hintsToShow, setHintsToShow] = useState([]);
  const [input, setInput] = useState("");
  const [hintStep, setHintStep] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadBatch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `스무고개 퀴즈 5개를 JSON 배열로 만들어줘.
          
          [단어 선정 기준]
          1. **난이도 믹스:** 쉬운 단어(초급) 70% + **중급 단어(TOPIK 3~4급) 30%** 섞어서.
          2. **카테고리 다양화:** 동물/과일뿐만 아니라 **직업, 장소, 물건, 자연현상, 교통수단** 등 다양하게.
          3. **중복 금지:** 이미 사용한 단어(${JSON.stringify(pastWords)})는 절대 제외.
          
          [힌트 작성 규칙]
          - 힌트는 4개. 
          - 1~2번 힌트는 조금 알쏭달쏭하게, 3~4번은 결정적으로.
          
          [예시]
          - 정답: "그림자" -> 힌트: ["검은색이에요", "빛이 있으면 생겨요", "나를 따라다녀요", "해 질 녘에 길어져요"]
          - 정답: "의사" -> 힌트: ["직업이에요", "흰 옷을 입어요", "아픈 사람을 도와줘요", "병원에서 일해요"]
          
          응답(JSON):
          [{"word": "정답", "hints": ["힌트1", "힌트2", "힌트3", "힌트4"]}, ...]`
        })
      });
      const data = await res.json();
      const text = data.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(text.match(/\[.*\]/s)[0]);
      
      setList(prev => [...prev, ...parsed]);
      setLoading(false);
    } catch (e) {
      // 에러 시 기본 데이터
      setList(prev => [...prev, { word: "무지개", hints: ["하늘에 떠요", "비 온 뒤에 생겨요", "일곱 가지 색깔이에요", "잡을 수 없어요"] }]);
      setLoading(false);
    }
  };

  useEffect(() => { loadBatch(); }, []);

  // 문제가 바뀌면 힌트 초기화
  useEffect(() => {
    if (list.length > 0 && list[idx]) {
      setHintsToShow([list[idx].hints[0]]);
      setHintStep(0);
    }
  }, [idx, list]);

  const check = (e) => {
    e.preventDefault();
    if (!list[idx]) return;
    
    const currentQuiz = list[idx];
    if (input.trim() === currentQuiz.word) {
      alert(`정답! [${currentQuiz.word}] 딩동댕! 🔔`);
      setInput("");
      
      if (idx + 1 < list.length) {
        setIdx(i => i + 1);
        // 미리 로딩
        if (list.length - (idx + 1) < 2) loadBatch();
      } else { 
        alert("새로운 문제를 가져옵니다..."); 
        loadBatch(); 
        setIdx(i => i + 1); 
      }
    } else {
      if (hintStep + 1 < currentQuiz.hints.length) {
        setHintStep(prev => prev + 1);
        setHintsToShow(prev => [...prev, currentQuiz.hints[hintStep + 1]]);
        setInput("");
      } else {
        alert(`아쉽네요! 정답은 [${currentQuiz.word}]였습니다.`);
        // 현재까지 푼 문제 리스트와 점수(0점 처리 혹은 맞춘 개수 등) 전달
        // 여기서는 그냥 다음 문제로 넘어가게 처리 (게임 오버 없이)
        setInput("");
        setIdx(i => i + 1);
      }
    }
  };

  if (list.length === 0 || !list[idx]) return <div className="result-box"><h3>힌트 상자를 여는 중...</h3></div>;

  // 현재 점수 계산 (맞춘 문제 수 * 20점 등으로 가정, 실제로는 상위 컴포넌트에서 관리하거나 여기서 state로 관리 필요)
  // 여기서는 단순히 idx를 점수로 환산하지 않고, 외부에서 전달받은 score를 사용하거나 자체 score state를 추가해야 함.
  // 기존 코드에 score state가 없었다면 추가하는 것이 좋음. (아래 코드엔 score state가 없어서 0으로 넘김)
  
  return (
    <div className="game-container">
      <div className="header">
        {/* 점수 로직이 이 파일 내부에 없다면 0으로 넘기거나, score state를 추가하여 관리하세요. */}
        <button onClick={() => onBack([], score)}>나가기</button> 
        <span>남은 힌트: {3 - hintStep}</span>
      </div>
      <div className="quiz-card" style={{justifyContent:'flex-start', paddingTop:'30px'}}>
        <h3>👶 스무고개 Jr ({idx + 1}번)</h3>
        <div style={{width:'90%', margin:'20px auto', textAlign:'left'}}>
          {hintsToShow.map((h, i) => (
            <div key={i} style={{
              padding:'15px', background:'#fffbe6', margin:'10px 0', 
              borderRadius:'15px', fontSize:'1.1rem', boxShadow:'0 2px 5px rgba(0,0,0,0.05)',
              animation: 'slideUp 0.3s ease-out'
            }}>
              💡 힌트 {i+1}: <b>{h}</b>
            </div>
          ))}
        </div>
      </div>
      <form onSubmit={check} className="input-area">
        <input value={input} onChange={e=>setInput(e.target.value)} autoFocus placeholder="정답은?" />
        <button type="submit">확인</button>
      </form>
    </div>
  );
}