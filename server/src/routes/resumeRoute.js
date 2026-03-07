import express from 'express';
import Resume from '../models/resume.js';

const router = express.Router();

// 1. 자기소개서 저장 및 업데이트 (POST /api/resume)
router.post('/', async (req, res) => {
  try {
    // 프론트엔드에서 resumeId를 보내면 '수정', 안 보내면 '새로 생성'
    const { userId, resumeId, title, targetCompany, targetJob, qnaList } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' });
    }

    let savedResume;

    if (resumeId) {
      // 기존 자기소개서 수정 모드
      savedResume = await Resume.findByIdAndUpdate(
        resumeId,
        { title, targetCompany, targetJob, qnaList, updatedAt: Date.now() },
        { new: true }
      );
    } else {
      // 새로운 자기소개서 생성 모드
      savedResume = await Resume.create({
        userId,
        title: title || '새 자기소개서',
        targetCompany,
        targetJob,
        qnaList
      });
    }

    res.status(200).json({ success: true, message: '저장 완료', data: savedResume });
  } catch (error) {
    console.error('Resume Save Error:', error);
    res.status(500).json({ success: false, message: '저장 실패' });
  }
});

// 2. 특정 유저의 '모든' 자기소개서 목록 조회 (GET /api/resume/:userId)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // 최신순으로 정렬하여 모두 가져오기
    const resumes = await Resume.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: resumes });
  } catch (error) {
    console.error('Resume Fetch Error:', error);
    res.status(500).json({ success: false, message: '조회 실패' });
  }
});

// 3. 특정 자기소개서 1개만 상세 조회 (GET /api/resume/detail/:resumeId)
router.get('/detail/:resumeId', async (req, res) => {
  try {
    const { resumeId } = req.params;
    const resume = await Resume.findById(resumeId);

    if (!resume) {
      return res.status(404).json({ success: false, message: '자기소개서를 찾을 수 없습니다.' });
    }

    res.status(200).json({ success: true, data: resume });
  } catch (error) {
    console.error('Resume Detail Fetch Error:', error);
    res.status(500).json({ success: false, message: '상세 조회 실패' });
  }
});

export default router;