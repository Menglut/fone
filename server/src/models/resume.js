import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    // 어떤 유저의 자기소개서인지 식별
    userId: {
      type: String,
      required: true,
      index: true, // 빠른 검색을 위해 인덱스 추가
    },
    // 자소서 제목 (예: "네이버 프론트엔드 신입 지원")
    title: {
      type: String,
      default: '새 자기소개서',
    },
    // 지원 회사명 (선택)
    targetCompany: {
      type: String,
      default: '',
    },
    // 지원 직무 (선택)
    targetJob: {
      type: String,
      default: '',
    },
    // 문항 및 답변 리스트
    qnaList: [
      {
        question: { type: String, default: '' }, // 질문 (예: "지원동기를 적어주세요")
        answer: { type: String, default: '' },   // 답변 내용
      }
    ],
    // 자소서 내용 저장
    content: {
        type: String,
        default: ''
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      updatedAt: {
        type: Date,
        default: Date.now
      }
  },
  {
    // ✨ timestamps를 true로 설정하면 createdAt, updatedAt이 자동 생성/갱신됩니다.
    // 대시보드에서 "최근 수정일"을 띄울 때 매우 유용합니다!
    timestamps: true,
  }
);

const Resume = mongoose.model('Resume', resumeSchema);
export default Resume;