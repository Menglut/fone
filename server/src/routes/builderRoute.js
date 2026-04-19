// server/src/routes/builderRoute.js
import express from 'express';
import BuilderHistory from '../models/builderHistory.js';
import Experience from '../models/experience.js';
import { generateBuilderChatAndExtract } from '../services/llm.js';

const router = express.Router();

// 🎯 AI 전문가 단톡방 채팅 및 데이터 추출
router.post('/chat', async (req, res) => {
  try {
    const { userInfo, chatContext, currentProjectData, userInput } = req.body;

    const aiResponse = await generateBuilderChatAndExtract({
      userInfo,
      chatContext,
      currentProjectData,
      userInput
    });

    res.status(200).json({ success: true, data: aiResponse });
  } catch (error) {
    console.error("AI Builder 챗 에러:", error);
    res.status(500).json({ success: false, message: 'AI 응답 중 서버 오류가 발생했습니다.' });
  }
});

// 🎯 포트폴리오 대화 기록 저장 및 🌟경험 자산(Experience) 자동 생성🌟
router.post('/save', async (req, res) => {
  try {
    const { userId, title, chatHistory, portfolioData } = req.body;

    // 1. 대화 내역 원본 저장 (기존 기능)
    const newHistory = new BuilderHistory({
      userId,
      title,
      chatHistory,
      portfolioData
    });
    await newHistory.save();

    // ✨ 2. AI가 추출한 데이터를 분해해서 '경험(Experience)' 자산으로 자동 저장
    if (portfolioData && portfolioData.length > 0) {
      // 배열로 들어온 포트폴리오 데이터를 하나씩 돌면서 경험 DB에 넣습니다.
      for (const data of portfolioData) {
        // 빈 데이터가 아닐 경우에만 저장
        if (data.title || data.how || data.techStack) {
          await Experience.create({
            userId: userId,
            title: data.title || '새로운 추출 경험',
            techStack: data.techStack || '',
            troubleshootings: [{
              id: crypto.randomUUID(),
              title: 'AI 전문가 인터뷰를 통해 도출된 핵심 경험',
              why: data.why || '',
              how: data.how || '',
              then: data.then || '',
              architectureCode: data.architectureCode || '',
              chartData: typeof data.chartData === 'string' ? JSON.parse(data.chartData || '[]') : (data.chartData || [])
            }]
          });
        }
      }
    }

    res.status(201).json({ success: true, message: '포트폴리오와 경험 자산이 성공적으로 저장되었습니다.' });
  } catch (error) {
    console.error("빌더 저장 및 경험 추출 에러:", error);
    res.status(500).json({ success: false, message: '기록 저장에 실패했습니다.' });
  }
});

// 🎯 내 빌더 기록 조회 (마이페이지용)
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const historyList = await BuilderHistory.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: historyList });
  } catch (error) {
    console.error("기록 조회 에러:", error);
    res.status(500).json({ success: false, message: '기록을 불러오지 못했습니다.' });
  }
});

export default router;