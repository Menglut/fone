import express from 'express';
import Portfolio from '../models/portfolio.js'; 

const router = express.Router();

// 1. 포트폴리오 저장 및 업데이트 (POST /api/portfolio)
router.post('/', async (req, res) => {
  try {
    const { userId, title, content } = req.body;
    
    // 필수 데이터 확인
    if (!userId) {
      return res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' });
    }

    // 💡 핵심 변경점: .create() 대신 findOneAndUpdate() 사용
    // 이미 있는 유저라면 내용을 업데이트(덮어쓰기)하고, 없으면 새로 생성(upsert)합니다.
    const savedPortfolio = await Portfolio.findOneAndUpdate(
      { userId: userId },             // 1. 검색 조건
      { title: title, content: content }, // 2. 업데이트할 데이터
      { new: true, upsert: true }     // 3. 옵션 (new: 최신 데이터 반환, upsert: 없으면 생성)
    );

    res.status(200).json({ success: true, message: '저장 완료', data: savedPortfolio });
  } catch (error) {
    console.error('Portfolio Save Error:', error);
    res.status(500).json({ success: false, message: '저장 실패' });
  }
});

// 2. 포트폴리오 조회 (GET /api/portfolio/:userId)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 가장 최근에 만든 포트폴리오 1개 가져오기
    const portfolio = await Portfolio.findOne({ userId }).sort({ createdAt: -1 });

    if (!portfolio) {
      return res.status(404).json({ success: false, message: '포트폴리오 없음' });
    }

    res.status(200).json({ success: true, data: portfolio });
  } catch (error) {
    console.error('Portfolio Fetch Error:', error);
    res.status(500).json({ success: false, message: '조회 실패' });
  }
});

export default router;