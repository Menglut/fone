import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },

  content: {
    profile: {
      name: { type: String, default: '' },
      jobTitle: { type: String, default: '' },
      email: { type: String, default: '' },
      intro: { type: String, default: '' },
      github: { type: String, default: '' } // (옵션) 깃허브 링크 추가
    },
    projects: [{
      id: { type: String }, // 프론트엔드용 고유 ID
      title: { type: String, default: '' }, // 예: MONG
      period: { type: String, default: '' }, // 예: 2025.09.01-2025.10.20
      summary: { type: String, default: '' }, // 프로젝트 한줄 소개
      techStack: { type: String, default: '' }, // 예: Java 17, SpringBoot...

      // ✨ 핵심: 문제 해결 경험(트러블슈팅) 배열 안에 누락된 시각화 필드 추가!
      troubleshootings: [{
        id: { type: String },
        title: { type: String, default: '' }, // 예: CQRS 기반 저장 구조 전환
        why: { type: String, default: '' },   // 문제 상황 및 배경
        how: { type: String, default: '' },   // 해결 과정 및 아키텍처 설계
        then: { type: String, default: '' },  // 개선된 결과 (TPS 증가 등)

        // 👇 이 부분이 없어서 데이터가 다 날아가고 있었습니다!
        architectureCode: { type: String, default: '' }, // 다이어그램 코드
        chartData: { type: Array, default: [] },         // 차트 배열 데이터
        imageUrl: { type: String, default: '' }          // 단일 이미지 URL (기존 imageUrls 배열 대신 사용)
      }]
    }]
  }
}, {
  timestamps: true 
});

const Portfolio = mongoose.model('Portfolio', portfolioSchema);
export default Portfolio;