// routes/interviewRoute.js
import express from 'express';
import Resume from '../models/resume.js';
import Portfolio from '../models/portfolio.js';
import InterviewHistory from '../models/interviewHistory.js';
import { generateReverseInterviewAttacks, generateInterviewResponseAndFollowUps } from '../services/llm.js';

// 💡 주의: llm.js 파일의 실제 경로에 맞춰서 '../llm.js' 또는 '../services/llm.js'로 수정해 주세요!

const router = express.Router();

// 🎯 역면접 스캐너: 전 직군 범용 공격 질문 생성 API (POST /api/interview/generate-attacks)
router.post('/generate-attacks', async (req, res) => {
  try {
    const { docType, docId } = req.body;

    if (!docId) {
      return res.status(400).json({ success: false, message: '문서 ID가 필요합니다.' });
    }

    let documentContent = "";
    let targetJob = "";

    // 1. 문서 타입에 따라 DB에서 데이터 불러오기
    if (docType === 'resume' || !docType) {
      const resume = await Resume.findById(docId);
      if (!resume) {
        return res.status(404).json({ success: false, message: '자기소개서를 찾을 수 없습니다.' });
      }

      // ✨ 타겟 직무 가져오기 (마케터, 기획자 등 AI 페르소나 부여용)
      targetJob = resume.targetJob || "";

      // AI에게 넘겨줄 텍스트 조합 (content가 있으면 통글, 없으면 qnaList 조합)
      if (resume.content) {
        documentContent = `[제목]: ${resume.title}\n[내용]: ${resume.content}`;
      } else if (resume.qnaList && resume.qnaList.length > 0) {
        const combinedText = resume.qnaList.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n');
        documentContent = `[제목]: ${resume.title}\n[내용]:\n${combinedText}`;
      } else {
        return res.status(400).json({ success: false, message: '문서에 내용이 없습니다.' });
      }
    }
    
    else if (docType === 'portfolio') {
      const portfolio = await Portfolio.findById(docId);
      if (!portfolio) return res.status(404).json({ success: false, message: '포트폴리오를 찾을 수 없습니다.' });

      targetJob = portfolio.profile?.jobTitle || "";
      documentContent = JSON.stringify(portfolio); // 포트폴리오 전체 JSON 데이터를 AI에게 넘김
    }
    
    else {
      return res.status(400).json({ success: false, message: '지원하지 않는 문서 타입입니다.' });
    }

    // 2. llm.js의 역면접 질문 생성 함수 호출 (문서 내용과 타겟 직무 전달)
    const attacks = await generateReverseInterviewAttacks({ documentContent, targetJob });

    // 3. 생성된 질문 리스트를 프론트엔드로 응답
    res.status(200).json({ success: true, data: attacks });

  } catch (error) {
    console.error("AI 공격 생성 에러:", error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 🎯 실시간 면접 채팅 및 꼬리 질문 생성 (POST /api/interview/chat)
router.post('/chat', async (req, res) => {
  try {
    const { docId, currentQuestion, chatContext } = req.body;

    // 1. 서류 데이터 불러오기 (우선 자소서 기준)
    const resume = await Resume.findById(docId);
    if (!resume) return res.status(404).json({ success: false, message: '문서를 찾을 수 없습니다.' });

    let documentContent = resume.content || JSON.stringify(resume.qnaList);

    // 2. AI에게 대답과 꼬리질문 받아오기
    const aiResponse = await generateInterviewResponseAndFollowUps({ 
      documentContent, 
      currentQuestion, 
      chatContext 
    });

    res.status(200).json({ success: true, data: aiResponse });
  } catch (error) {
    console.error("AI 챗 에러:", error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 🎯 면접 기록 저장 (POST /api/interview/save)
router.post('/save', async (req, res) => {
  try {
    const { userId, docId, title, chatHistory } = req.body;

    const newHistory = new InterviewHistory({
      userId,
      docId,
      title,
      chatHistory
    });

    await newHistory.save();
    res.status(201).json({ success: true, message: '면접 기록이 저장되었습니다.' });
  } catch (error) {
    console.error("면접 저장 에러:", error);
    res.status(500).json({ success: false, message: '기록 저장에 실패했습니다.' });
  }
});

// 🎯 내 면접 기록 조회 (대시보드용) (GET /api/interview/history/:userId)
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // 최신순으로 정렬해서 가져오기
    const historyList = await InterviewHistory.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: historyList });
  } catch (error) {
    console.error("기록 조회 에러:", error);
    res.status(500).json({ success: false, message: '기록을 불러오지 못했습니다.' });
  }
});

export default router;