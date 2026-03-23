// server/src/routes/builderRoute.js
import express from 'express';
import BuilderHistory from '../models/builderHistory.js';
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

// 🎯 포트폴리오 및 대화 기록 전체 저장
router.post('/save', async (req, res) => {
  try {
    const { userId, title, chatHistory, portfolioData } = req.body;

    const newHistory = new BuilderHistory({
      userId,
      title,
      chatHistory,
      portfolioData
    });

    await newHistory.save();
    res.status(201).json({ success: true, message: '포트폴리오와 대화 기록이 저장되었습니다.' });
  } catch (error) {
    console.error("빌더 저장 에러:", error);
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