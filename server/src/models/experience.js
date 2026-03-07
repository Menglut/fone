import mongoose from 'mongoose';

const experienceSchema = new mongoose.Schema(
  {
    // 어떤 유저의 경험인지 식별
    userId: {
      type: String,
      required: true,
      index: true,
    },
    // 프로젝트 이름
    title: {
      type: String,
      default: '새로운 프로젝트',
    },
    // 진행 기간
    period: {
      type: String,
      default: '',
    },
    // 맡은 역할
    role: {
      type: String,
      default: '',
    },
    // 사용 기술 스택 (배열 또는 문자열 처리 가능하도록 설정)
    techStack: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    // 한 줄 요약
    summary: {
      type: String,
      default: '',
    },

    // ✨ [핵심 수정] 상세 트러블슈팅 리스트 (STAR 기법 반영)
    // 여러 개의 문제 해결 사례를 저장할 수 있도록 배열로 변경했습니다.
    troubleshootings: [
      {
        id: { type: String }, // 프론트엔드 관리를 위한 고유 ID
        title: { type: String, default: '' }, // 문제 해결 주제
        why: { type: String, default: '' },   // [Situation/Task] 원인 및 배경
        how: { type: String, default: '' },   // [Action] 해결 과정
        then: { type: String, default: '' },  // [Result] 결과 및 성과

        // 🎨 시각화 데이터 저장용
        architectureCode: { type: String, default: '' }, // Mermaid 다이어그램 코드
        chartData: { type: Array, default: [] },        // Recharts 그래프 숫자 데이터
      }
    ],
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);

const Experience = mongoose.model('Experience', experienceSchema);
export default Experience;