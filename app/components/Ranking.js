"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

// 그룹별 합산할 필드 정의
const RANKING_GROUPS = {
  total: { name: "👑 종합 랭킹", fields: ["totalScore"] }, // totalScore는 이미 합산되어 있음
  speed_zone: { name: "🕵️ 스피드왕", fields: ["best_speed", "best_twenty", "best_homonym"] },
  pair_zone: { name: "🔗 짝꿍왕", fields: ["best_idiom", "best_synonym", "best_collocation"] },
  initial_zone: { name: "🤫 초성왕", fields: ["best_initial", "best_factory"] },
  arcade_zone: { name: "🕹️ 타자왕", fields: ["best_rain", "best_category"] },
  wordchain: { name: "🧩 끝말잇기", fields: ["best_wordchain"] }
};

export default function Ranking({ onBack }) {
  const [activeTab, setActiveTab] = useState("total");
  const [rankers, setRankers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRanking = async () => {
      setLoading(true);
      setRankers([]);
      try {
        // 모든 유저를 가져와서 클라이언트에서 합산 정렬 (NoSQL의 한계로 인해 데이터가 많지 않을 때 유효)
        // 만약 유저가 수천 명이면 DB 설계를 바꿔야 하지만, 현재 규모에선 이 방식이 가장 유연함.
        const q = query(collection(db, "k_arena_users"), limit(50)); // 상위 50명 정도만 fetch
        const snapshot = await getDocs(q);
        
        const data = snapshot.docs.map(doc => {
          const u = doc.data();
          // 현재 탭의 그룹 점수 계산
          let groupScore = 0;
          if (activeTab === "total") {
            groupScore = u.totalScore || 0;
          } else {
            const fields = RANKING_GROUPS[activeTab].fields;
            groupScore = fields.reduce((sum, field) => sum + (u[field] || 0), 0);
          }
          return { id: doc.id, nickname: u.nickname, score: groupScore };
        });

        // 점수 내림차순 정렬
        const sorted = data.filter(u => u.score > 0).sort((a, b) => b.score - a.score).slice(0, 10);
        setRankers(sorted);
      } catch (error) {
        console.error("랭킹 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRanking();
  }, [activeTab]);

  return (
    <div className="screen active" style={{maxWidth: '500px', height:'80vh', display:'flex', flexDirection:'column'}}>
      <div className="header">
        <h3 style={{margin:0}}>🏆 명예의 전당</h3>
        <button onClick={onBack} style={{background:'#888', padding:'5px 10px', fontSize:'0.8rem'}}>닫기</button>
      </div>

      <div style={{
        display:'flex', gap:'5px', padding:'10px', overflowX:'auto', 
        borderBottom:'1px solid #ddd', background:'#f8f9fa', whiteSpace:'nowrap'
      }}>
        {Object.entries(RANKING_GROUPS).map(([key, info]) => (
          <button 
            key={key} 
            onClick={() => setActiveTab(key)}
            style={{
              padding:'8px 12px', borderRadius:'20px', fontSize:'0.8rem',
              background: activeTab === key ? '#4da6ff' : 'white',
              color: activeTab === key ? 'white' : '#555',
              border: '1px solid #ddd'
            }}
          >
            {info.name}
          </button>
        ))}
      </div>
      
      <div className="scroll-box" style={{background: 'white', flex:1, padding:0}}>
        {loading ? (
          <div style={{padding:'40px', textAlign:'center', color:'#888'}}>랭킹 계산 중...</div>
        ) : (
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{background: '#fff', borderBottom: '2px solid #eee', color: '#666', fontSize:'0.9rem'}}>
                <th style={{padding: '12px'}}>순위</th>
                <th style={{padding: '12px', textAlign:'left'}}>닉네임</th>
                <th style={{padding: '12px', textAlign:'right'}}>점수</th>
              </tr>
            </thead>
            <tbody>
              {rankers.map((user, index) => (
                <tr key={user.id} style={{borderBottom: '1px solid #f5f5f5', height: '55px'}}>
                  <td style={{textAlign: 'center', fontWeight: 'bold', fontSize:'1.1rem', color: index < 3 ? '#ff6b6b' : '#333'}}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </td>
                  <td style={{textAlign: 'left', fontWeight: 'bold'}}>
                    {user.nickname || '익명'}
                  </td>
                  <td style={{textAlign: 'right', paddingRight:'20px', color: '#4da6ff', fontWeight:'bold'}}>
                    {user.score.toLocaleString()}
                  </td>
                </tr>
              ))}
              {rankers.length === 0 && (
                <tr><td colSpan="3" style={{padding:'40px', textAlign:'center', color:'#ccc'}}>랭킹 기록이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}