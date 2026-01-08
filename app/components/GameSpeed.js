"use client";
import { useState, useEffect } from "react";

// ★ 데이터 파일 로딩 문제 해결을 위해 직접 선언
const QUIZ_DATA = [
  { word: "사과", description: "빨간색 과일, 백설공주" },
  { word: "학교", description: "공부하는 곳, 선생님" },
  { word: "가방", description: "책과 필통을 넣어요" },
  { word: "버스", description: "많은 사람이 타는 차" },
  { word: "물", description: "목마를 때 마셔요" },
  { word: "눈", description: "얼굴에 있어요, 봅니다" },
  { word: "신발", description: "발에 신어요" },
  { word: "선생님", description: "학생을 가르쳐요" },
  { word: "병원", description: "아프면 가요" },
  { word: "텔레비전", description: "거실에 있어요, 방송" },
  { word: "해", description: "낮에 떠요, 뜨거워요" },
  { word: "돈", description: "물건 살 때 필요해요" },
  { word: "강아지", description: "멍멍 짖어요" },
  { word: "고양이", description: "야옹 울어요" },
  { word: "김치", description: "한국 대표 음식, 매워요" },
  { word: "비행기", description: "하늘을 날아요" },
  { word: "축구", description: "발로 공을 차요" },
  { word: "여름", description: "더워요, 수박" },
  { word: "겨울", description: "추워요, 눈" },
  { word: "바나나", description: "노랗고 길어요, 원숭이" }
];

export default function GameSpeed({ onBack }) {
  const [list, setList] = useState([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [input, setInput] = useState("");
  const [isEnd, setIsEnd] = useState(false);

  useEffect(() => {
    // 랜덤 섞기
    setList([...QUIZ_DATA].sort(() => Math.random() - 0.5).slice(0, 10));
  }, []);

  useEffect(() => {
    if (isEnd || list.length === 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          nextQ(false);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [idx, isEnd, list]);

  const nextQ = (correct) => {
    if (correct) setScore(s => s + 20);
    if (idx + 1 >= list.length) setIsEnd(true);
    else {
      setIdx(i => i + 1);
      setTimeLeft(15);
      setInput("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() === list[idx].word) nextQ(true);
    else { alert("땡!"); setInput(""); }
  };

  if (list.length === 0) return <div>로딩 중...</div>;

  return (
    <div className="game-container">
      <div className="header"><button onClick={() => onBack(null, score)}>포기</button> <span>{score}점</span></div>
      {!isEnd ? (
        <>
          <div className="timer-bar"><div style={{width:`${(timeLeft/15)*100}%`}}></div></div>
          <div className="quiz-card">
            <p>문제 {idx+1}/{list.length}</p>
            <h2>{list[idx].description}</h2>
          </div>
          <form onSubmit={handleSubmit} className="input-area">
            <input value={input} onChange={e=>setInput(e.target.value)} placeholder="정답은?" autoFocus />
            <button type="submit">제출</button>
          </form>
        </>
      ) : (
        <div className="result-box">
          <h1>게임 종료!</h1>
          <h2>총점: {score}</h2>
          <button onClick={() => onBack(null, score)} className="full-btn">돌아가기</button>
        </div>
      )}
    </div>
  );
}