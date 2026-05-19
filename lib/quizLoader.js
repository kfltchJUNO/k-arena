"use client";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Firestore에서 승인된 퀴즈를 로딩.
 * 없으면 fallback 배열 반환.
 * @param {string} collectionId  - e.g. "quiz_speed"
 * @param {Array}  fallback      - 하드코딩 기본 데이터
 * @param {number} limit         - 최대 문제 수 (기본 30)
 */
export async function loadQuiz(collectionId, fallback, limit = 30) {
  try {
    const snap  = await getDocs(collection(db, collectionId));
    const items = snap.docs.map(d => { const { _docId, createdAt, approved, ...data } = d.data(); return data; });
    if (items.length === 0) return shuffle(fallback).slice(0, limit);
    // fallback + Firestore 합치되 중복 제거
    const merged = dedup([...items, ...fallback]);
    return shuffle(merged).slice(0, limit);
  } catch {
    return shuffle(fallback).slice(0, limit);
  }
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - .5);
}

// word / w / f / question 키 기준으로 중복 제거
function dedup(arr) {
  const seen = new Set();
  return arr.filter(item => {
    const key = item.word || item.w || item.f || item.question || JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}