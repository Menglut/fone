// routes/interviewRoute.js
import express from 'express';
import Resume from '../models/resume.js';
// import Portfolio from '../models/portfolio.js'; // 💡 나중에 포트폴리오 스캔 기능을 켤 때 주석을 해제하세요!
import { generateReverseInterviewAttacks } from '../services/llm.js';
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
    /* // 💡 나중에 포트폴리오를 스캔할 경우를 대비한 확장 코드
    else if (docType === 'portfolio') {
      const portfolio = await Portfolio.findById(docId);
      if (!portfolio) return res.status(404).json({ success: false, message: '포트폴리오를 찾을 수 없습니다.' });

      targetJob = portfolio.profile?.jobTitle || "";
      documentContent = JSON.stringify(portfolio); // 포트폴리오 전체 JSON 데이터를 AI에게 넘김
    }
    */
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

export default router;