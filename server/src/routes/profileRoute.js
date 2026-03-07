import express from 'express';
import User from '../models/user.js'; // ✨ 통합된 User 모델을 불러옵니다!

const router = express.Router();

// 1. 내 프로필(유저 정보) 조회
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // 이메일이나 MongoDB _id 둘 중 하나로 유저를 찾습니다.
    const userProfile = await User.findOne({
      $or: [{ _id: userId.match(/^[0-9a-fA-F]{24}$/) ? userId : null }, { email: userId }]
    });

    if (!userProfile) {
      return res.status(404).json({ success: false, message: '유저를 찾을 수 없습니다.' });
    }

    res.status(200).json({ success: true, data: userProfile });
  } catch (error) {
    console.error('Profile Fetch Error:', error);
    res.status(500).json({ success: false, message: '프로필 조회 실패' });
  }
});

// 2. 내 프로필 정보 수정 (jobTitle, github, intro 업데이트)
router.post('/', async (req, res) => {
  try {
    const { userId, name, email, jobTitle, github, intro } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: '유저 ID가 필요합니다.' });
    }

    // 기존 유저 정보를 찾아서 업데이트합니다.
    const updatedUser = await User.findOneAndUpdate(
      { $or: [{ _id: userId.match(/^[0-9a-fA-F]{24}$/) ? userId : null }, { email: userId }] },
      { name, email, jobTitle, github, intro },
      { new: true } // 업데이트된 최신 문서를 반환
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: '업데이트할 유저를 찾을 수 없습니다.' });
    }

    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Profile Update Error:', error);
    res.status(500).json({ success: false, message: '프로필 업데이트 실패' });
  }
});

export default router;