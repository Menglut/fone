import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

export async function generateCoverLetter({ resume, jobPost, options }) {
  const system = `
너는 입사를 앞둔 지원자 본인이다.
제공된 이력과 면접 답변 데이터를 바탕으로, 실제 사람이 정성껏 쓴 것 같은 '자연스러운 줄글(서술형)' 형태의 자기소개서를 작성해라.

[절대 금지 규칙]
1. '#1. 성장 배경', '## 지원 동기' 같은 마크다운 기호(#, *)나 소제목, 숫자로 번호 매기기를 절대 사용하지 마라.
2. 개조식(요약형) 문장이나 불릿 포인트(-, *)를 절대 사용하지 마라.
3. 기계적이거나 딱딱한 보고서 형식이 아닌, 문단과 문단이 자연스럽게 이어지는 에세이 형식으로 작성해라.

[작성 지침]
- 과장/허위 절대 금지, 지원자의 실제 경험을 기반으로 정량지표 중심으로 작성해라.
- 하나의 완성된 글이 되도록 서론-본론-결론의 흐름을 가져라.
- 문장 길이는 15~30자 내외로 읽기 편하게 유지하고, 중복 표현을 줄여라.
  `.trim();

  const interviewAnswers = resume?.interviewAnswers || [];
  const answersBlock =
    Array.isArray(interviewAnswers) && interviewAnswers.length > 0
      ? interviewAnswers
          .map((a) => `- (${a.category || 'etc'}) ${a.answer || ''}`)
          .join('\n')
      : '(없음)';

  const resumeForJson = { ...resume };
  delete resumeForJson.interviewAnswers;

  const user = `
[지원자 이력]
${JSON.stringify(resumeForJson, null, 2)}

[추가 질문 답변(경험 보강 정보)]
${answersBlock}

[채용 공고/회사 질문]
${jobPost}

[옵션] 톤:${options?.tone || '담백'}, 분량:${options?.length || '1500자'}, 유형:${options?.type || '자유형'}

위 정보를 바탕으로 한국어 자기소개서를 작성해줘.
  `.trim();

  const resp = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.4,
  });

  return resp.choices[0]?.message?.content?.trim() || '';
}

/**
 * ✅ 추가 질문 생성 (JSON Mode 적용)
 */
export async function generateFollowupQuestions({ experienceText, companyQuestion }) {
  const system = `
너는 한국어 자기소개서 컨설턴트다.
목표: 아래 '회사 질문'에 답하기 위해, 사용자의 '경험'에서 부족한 정보를 채우는 "추가 질문 5개"를 만든다.

규칙:
- 질문은 5개 고정
- 각 질문은 한 문장, 답하기 쉽게 구체적으로
- category는 아래 중 하나만 사용: role, problem, action, metric, reflection
- 반드시 아래 형태의 JSON 객체로만 응답해라:
{
  "questions": [
    {"id": "q1", "category": "role", "text": "..."},
    {"id": "q2", "category": "action", "text": "..."}
  ]
}
  `.trim();

  const user = `
[회사 질문]
${companyQuestion}

[사용자 경험]
${experienceText}
  `.trim();

  const resp = await client.chat.completions.create({
    model: 'deepseek-chat',
    response_format: { type: 'json_object' }, // ✨ 핵심: JSON Mode 강제
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.2,
  });

  const content = resp.choices[0]?.message?.content?.trim() || '{}';

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error(`추가 질문 JSON 파싱 실패: ${content}`);
  }

  const qs = parsed?.questions || [];
  if (!Array.isArray(qs) || qs.length !== 5) {
    throw new Error(`추가 질문 배열 형태가 올바르지 않음: ${content}`);
  }

  return qs.map((q, idx) => ({
    id: typeof q.id === 'string' ? q.id : `q${idx + 1}`,
    category: q.category,
    text: q.text,
  }));
}

/**
 * ✅ 포트폴리오 생성 (JSON Mode 적용)
 */
export async function generatePortfolioJson({ userPrompt }) {
  const system = `
너는 IT 포트폴리오 전문 컨설턴트다.
사용자의 거친(Rough) 입력을 바탕으로, 깔끔하고 전문적인 포트폴리오 데이터를 생성해라.

[필수 규칙]
1. 과장하지 말고 사용자가 입력한 내용을 기반으로 '있어 보이게' 다듬어라.
2. 기술 스택이 명시되지 않았으면 문맥을 보고 추론해서 채워라.
3. 반드시 아래 형태의 JSON 객체로만 응답해라:

{
  "profile": {
    "name": "입력 없으면 빈칸",
    "jobTitle": "직무 (예: Backend Developer)",
    "email": "입력 없으면 빈칸",
    "intro": "3~4문장의 매력적인 자기소개 (강점 중심)"
  },
  "projects": [
    {
      "title": "프로젝트명",
      "period": "기간 (예: 2024.01 - 2024.06)",
      "techStack": "사용 기술 (쉼표로 구분)",
      "description": "상세 설명 (문제 해결 -> 과정 -> 성과 순으로 3문장 이상 작성)"
    }
  ]
}
  `.trim();

  const user = `[사용자 입력 데이터]\n${userPrompt}`;

  try {
    const resp = await client.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' }, // ✨ 핵심: JSON Mode 강제
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
    });

    const content = resp.choices[0]?.message?.content?.trim() || '{}';
    return JSON.parse(content);

  } catch (error) {
    console.error('DeepSeek API Error:', error);
    throw new Error('AI 포트폴리오 생성 실패');
  }
}