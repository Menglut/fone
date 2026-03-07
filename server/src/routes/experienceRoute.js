import express from 'express';
import mongoose from 'mongoose'; // ✨ ID 유효성 검사를 위해 추가
import Experience from '../models/experience.js';

const router = express.Router();

// 1. 경험/프로젝트 저장 및 업데이트 (POST /api/experience)
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      expId,
      title,
      period,
      role,
      techStack,
      summary,
      troubleshootings,
      details
    } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' });
    }

    let savedExp;

    // 💡 수정 포인트: expId가 존재하고 유효한 경우에만 업데이트를 시도합니다.
    const isValidId = expId && mongoose.Types.ObjectId.isValid(expId);

    if (isValidId) {
      // [업데이트 모드]
      savedExp = await Experience.findByIdAndUpdate(
        expId,
        {
          title,
          period,
          role,
          techStack,
          summary,
          troubleshootings: troubleshootings || [], // AI 시각화 데이터 포함
          details,
          updatedAt: Date.now()
        },
        { new: true, runValidators: true } // runValidators: 모델 설정에 맞게 데이터 검증
      );

      if (!savedExp) {
        return res.status(404).json({ success: false, message: '업데이트할 데이터를 찾을 수 없습니다.' });
      }
    } else {
      // [새로 생성 모드]
      savedExp = await Experience.create({
        userId,
        title: title || '새로운 경험/프로젝트',
        period,
        role,
        techStack,
        summary,
        troubleshootings: troubleshootings || [], // AI가 생성한 Why-How-Then 및 시각화 코드 저장
        details
      });
    }

    res.status(200).json({
      success: true,
      message: isValidId ? '마스터 데이터 업데이트 완료' : '새 마스터 데이터 저장 완료',
      data: savedExp
    });
  } catch (error) {
    console.error('Experience Save Error:', error);
    res.status(500).json({ success: false, message: '저장 중 서버 오류가 발생했습니다.' });
  }
});

// 2. 특정 유저의 모든 경험 목록 조회 (GET /api/experience/:userId)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // 최신순으로 정렬하여 전달
    const experiences = await Experience.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: experiences });
  } catch (error) {
    console.error('Experience Fetch Error:', error);
    res.status(500).json({ success: false, message: '데이터 조회 실패' });
  }
});

// 3. 특정 경험 상세 조회 (GET /api/experience/detail/:expId)
router.get('/detail/:expId', async (req, res) => {
  try {
    const { expId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(expId)) {
      return res.status(400).json({ success: false, message: '유효하지 않은 ID 형식입니다.' });
    }

    const experience = await Experience.findById(expId);

    if (!experience) {
      return res.status(404).json({ success: false, message: '데이터를 찾을 수 없습니다.' });
    }

    res.status(200).json({ success: true, data: experience });
  } catch (error) {
    console.error('Experience Detail Fetch Error:', error);
    res.status(500).json({ success: false, message: '상세 데이터 조회 실패' });
  }
});

export default router;