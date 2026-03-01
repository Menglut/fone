// src/routes/authRoute.js
import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/user.js';
import bcrypt from 'bcryptjs';

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);// 구글 클라이언트 ID 세팅

// ----------------------------------------------------
// 1. 일반 회원가입 API
// ----------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 이미 가입된 이메일인지 확인
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: '이미 사용 중인 이메일입니다.' });
    }

    // 비밀번호 암호화 (해싱)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 새 유저 저장
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword
    });

    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    console.error('회원가입 에러:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// ----------------------------------------------------
// 2. 일반 로그인 API
// ----------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 유저 찾기
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: '존재하지 않는 드라이버입니다.' });
    }

    // 구글 가입자인지 확인 (비밀번호가 없을 경우)
    if (!user.password) {
      return res.status(400).json({ success: false, message: '구글 계정으로 가입된 이메일입니다. 구글 로그인을 이용해주세요.' });
    }

    // 비밀번호 비교
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('로그인 에러:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    // 1. 구글 라이브러리를 통해 티켓이 진짜인지 검증하고 포장 뜯기
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    // 2. 포장 뜯은 데이터에서 필요한 정보 꺼내기
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    console.log(`👤 구글 로그인 요청: ${name} (${email})`);

    // 3. DB에서 유저 찾기 (없으면 새로 가입시키기)
    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.create({ googleId, email, name, picture });
      console.log('✨ 새로운 드라이버 등록 완료!');
    }

    // 4. 프론트엔드로 성공 응답 보내기
    res.status(200).json({ success: true, data: user });

  } catch (error) {
    console.error('❌ 구글 로그인 처리 실패:', error);
    res.status(401).json({ success: false, message: '유효하지 않은 구글 토큰입니다.' });
  }
});

export default router;