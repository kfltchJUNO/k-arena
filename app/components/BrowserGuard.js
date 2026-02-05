"use client";
import { useEffect, useState } from "react";

export default function BrowserGuard() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    // 1. 인앱 브라우저 탈출 로직 (카카오톡, 인스타 등)
    const userAgent = navigator.userAgent.toLowerCase();
    const targetUrl = window.location.href;

    if (userAgent.match(/kakaotalk|instagram|naver|line|facebook/i)) {
      // 안드로이드: Chrome으로 강제 이동 Intent 실행
      if (userAgent.match(/android/i)) {
        window.location.href =
          "intent://" +
          targetUrl.replace(/https?:\/\//i, "") +
          "#Intent;scheme=https;package=com.android.chrome;end";
      } else {
        // 아이폰(iOS): 강제 이동이 불가능하므로 안내 메시지 복사
        alert("원활한 로그인을 위해 우측 상단 메뉴 점 3개를 눌러 'Safari(브라우저)로 열기'를 선택해주세요.");
      }
    }

    // 2. PWA 앱 설치 유도 로직 (최초 1회)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // 이미 설치했거나 거절한 적이 없는 경우에만 표시
      const hasRefused = localStorage.getItem("installRefused");
      if (!hasRefused) {
        setShowInstallBtn(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };

  const handleClose = () => {
    setShowInstallBtn(false);
    localStorage.setItem("installRefused", "true"); // 거절하면 다시 안 뜨게 설정
  };

  if (!showInstallBtn) return null;

  return (
    <div style={{
      position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)",
      width: "90%", maxWidth: "400px", background: "white", padding: "20px",
      borderRadius: "20px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", zIndex: 9999,
      animation: "slideUp 0.5s ease-out", border: "2px solid #6c5ce7"
    }}>
      <h3 style={{margin: "0 0 10px 0", fontSize: "1.2rem", color: "#2d3436"}}>📲 앱으로 더 편하게 즐기세요!</h3>
      <p style={{margin: "0 0 20px 0", fontSize: "0.95rem", color: "#636e72"}}>
        홈 화면에 추가하면 로그인 유지와 전체 화면 게임이 가능합니다.
      </p>
      <div style={{display: "flex", gap: "10px"}}>
        <button onClick={handleInstallClick} style={{
          flex: 1, padding: "12px", background: "#6c5ce7", color: "white", 
          border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer"
        }}>
          앱 설치하기
        </button>
        <button onClick={handleClose} style={{
          flex: 1, padding: "12px", background: "#dfe6e9", color: "#636e72", 
          border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer"
        }}>
          괜찮아요
        </button>
      </div>
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}