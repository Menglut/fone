import express from 'express';
import User from '../models/user.js';

const router = express.Router();

function isMongoObjectId(value) {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
}

function buildUserQuery(userId) {
  return {
    $or: [
      ...(isMongoObjectId(userId) ? [{ _id: userId }] : []),
      { email: userId },
    ],
  };
}

function normalizeCareerProfile(careerProfile = {}) {
  return {
    status: careerProfile.status || 'rookie',
    jobCategory: careerProfile.jobCategory || '',
    jobDetail: careerProfile.jobDetail || '',
  };
}

// 1. 내 프로필 조회
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const userProfile = await User.findOne(buildUserQuery(userId));

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: '유저를 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      data: userProfile,
    });
  } catch (error) {
    console.error('Profile Fetch Error:', error);
    res.status(500).json({
      success: false,
      message: '프로필 조회 실패',
    });
  }
});

// 2. 내 프로필 정보 수정
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      name,
      email,
      intro,
      careerProfile,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '유저 ID가 필요합니다.',
      });
    }

    const updateData = {
      name,
      email,
      intro,
      careerProfile: normalizeCareerProfile(careerProfile),
    };

    // undefined 값은 DB에 덮어쓰지 않도록 제거
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedUser = await User.findOneAndUpdate(
      buildUserQuery(userId),
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: '업데이트할 유저를 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Profile Update Error:', error);
    res.status(500).json({
      success: false,
      message: '프로필 업데이트 실패',
    });
  }
});

export default router;