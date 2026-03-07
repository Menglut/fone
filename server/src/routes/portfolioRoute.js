import express from 'express';
import Portfolio from '../models/portfolio.js'; 

const router = express.Router();

// 1. 포트폴리오 저장 및 업데이트 (POST /api/portfolio)
router.post('/', async (req, res) => {
  try {
    // 💡 portfolioId가 넘어오면 '수정', 안 넘어오면 '새로 생성'으로 처리합니다.
    const { userId, portfolioId, title, content } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' });
    }

    let savedPortfolio;

    if (portfolioId) {
      // 기존 포트폴리오 수정 모드
      savedPortfolio = await Portfolio.findByIdAndUpdate(
        portfolioId,
        { title, content, updatedAt: Date.now() },
        { new: true }
      );
    } else {
      // ✨ 핵심: portfolioId가 없으면 무조건 '새로 생성(create)' 합니다.
      savedPortfolio = await Portfolio.create({
        userId,
        title: title || '나의 포트폴리오',
        content,
      });
    }

    res.status(200).json({ success: true, message: '저장 완료', data: savedPortfolio });
  } catch (error) {
    console.error('Portfolio Save Error:', error);
    res.status(500).json({ success: false, message: '저장 실패' });
  }
});

// 2. 특정 유저의 '모든' 포트폴리오 목록 조회 (GET /api/portfolio/:userId)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // ✨ 핵심: findOne(1개) -> find(여러 개)로 변경하고, 최신순으로 정렬합니다.
    const portfolios = await Portfolio.find({ userId }).sort({ createdAt: -1 });

    // 포트폴리오가 없어도 에러가 아닌 빈 배열([])을 던져줍니다.
    res.status(200).json({ success: true, data: portfolios });
  } catch (error) {
    console.error('Portfolio Fetch Error:', error);
    res.status(500).json({ success: false, message: '조회 실패' });
  }
});

// 3. 특정 포트폴리오 1개만 조회 (수정 화면용) (GET /api/portfolio/detail/:portfolioId)
router.get('/detail/:portfolioId', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const portfolio = await Portfolio.findById(portfolioId);

    if (!portfolio) {
      return res.status(404).json({ success: false, message: '포트폴리오를 찾을 수 없습니다.' });
    }

    res.status(200).json({ success: true, data: portfolio });
  } catch (error) {
    console.error('Portfolio Detail Fetch Error:', error);
    res.status(500).json({ success: false, message: '상세 조회 실패' });
  }
});

export default router;