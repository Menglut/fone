// src/services/llm.js
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

// 🔥 OpenAI SDK를 사용하지만 baseURL을 DeepSeek로 바꿈
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com', // 또는 'https://api.deepseek.com/v1'
});

export async function generateCoverLetter({ resume, jobPost, options }) {
  const system = `
너는 한국어 자기소개서 코치이자 편집자다.
과장/허위 절대 금지, 지원자의 실제 경험을 기반으로 정량지표 중심으로 작성해라.
문장 길이는 15~28자로 유지하고, 중복 표현을 줄여라.
  `.trim();

  const user = `
[지원자 이력]
${JSON.stringify(resume, null, 2)}

[채용 공고]
${jobPost}

[옵션] 톤:${options?.tone || '담백'}, 분량:${options?.length || '1500자'}, 유형:${options?.type || '자유형'}

위 정보를 바탕으로 한국어 자기소개서를 작성해줘.
  `.trim();

  const resp = await client.chat.completions.create({
    model: 'deepseek-chat',  // DeepSeek 측에서 안내하는 모델 이름
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.4,
  });

  return resp.choices[0]?.message?.content?.trim() || '';
}
