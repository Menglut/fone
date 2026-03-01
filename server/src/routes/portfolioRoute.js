import express from 'express';
import Portfolio from '../models/portfolio.js'; // 위에서 만든 모델 import

const router = express.Router();

// 1. 포트폴리오 저장 (POST /api/portfolio)
router.post('/', async (req, res) => {
  try {
    const { userId, title, content } = req.body;
    
    // 이미 있는 유저라면 업데이트, 없으면 새로 생성 (upsert)
    // 혹은 매번 새로 생성하려면 .create() 사용
    const newPortfolio = await Portfolio.create({
      userId,
      title,
      content
    });

    res.status(201).json({ success: true, data: newPortfolio });
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