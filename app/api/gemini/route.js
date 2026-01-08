import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// 🚀 우선순위 모델 리스트 (순서대로 호출)
const MODEL_PRIORITY = [
  "gemini-2.5-flash",       // 1. 최신/균형
  "gemini-2.5-flash-lite",  // 2. 초고속/저비용
  "gemini-2.0-flash",       // 3. 안정적/빠름
  "gemini-2.0-flash-lite",  // 4. 경량화 백업
  "gemini-3-flash"        // 5. 최후의 보루
];

export async function POST(req) {
  try {
    const { prompt } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: "API Key not found" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    let finalResponse = null;
    let lastError = null;

    // 🔄 모델 리스트를 순회하며 호출 시도
    for (const modelName of MODEL_PRIORITY) {
      try {
        // console.log(`Attempting with model: ${modelName}...`); // 디버깅용 로그
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (text) {
          finalResponse = text;
          // 성공하면 즉시 반복문 탈출 (더 이상 다른 모델 호출 안 함)
          break;
        }
      } catch (error) {
        console.warn(`⚠️ Model [${modelName}] failed. Switching to next...`, error.message);
        lastError = error;
        // 실패하면 continue를 통해 다음 모델로 자동으로 넘어감
        continue;
      }
    }

    // 모든 모델이 다 실패했을 경우
    if (!finalResponse) {
      console.error("❌ All models failed.");
      return NextResponse.json({ 
        error: "All AI models are busy. Please try again.", 
        details: lastError?.message 
      }, { status: 503 });
    }

    // 성공한 응답 반환
    return NextResponse.json({ text: finalResponse });

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}