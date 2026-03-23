import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

/**
 * ✅ 자기소개서 생성 (전 직군 범용)
 */
export async function generateCoverLetter({ resume, jobPost, options }) {
  const system = `
너는 입사를 앞둔 지원자 본인이다.
제공된 이력과 면접 답변 데이터를 바탕으로, 실제 사람이 정성껏 쓴 것 같은 '자연스러운 줄글(서술형)' 형태의 자기소개서를 작성해라.

[절대 금지 규칙]
1. '#1. 성장 배경', '## 지원 동기' 같은 마크다운 기호(#, *)나 소제목, 숫자로 번호 매기기를 절대 사용하지 마라.
2. 개조식(요약형) 문장이나 불릿 포인트(-, *)를 절대 사용하지 마라.
3. 기계적이거나 딱딱한 보고서 형식이 아닌, 문단과 문단이 자연스럽게 이어지는 에세이 형식으로 작성해라.

[작성 지침]
- 과장/허위 절대 금지, 지원자의 실제 경험을 기반으로 직무에 맞는 정량지표 중심으로 작성해라.
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
    response_format: { type: 'json_object' },
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
 * ✅ 포트폴리오 생성 (전 직군 범용, JSON Mode 적용)
 */
export async function generatePortfolioJson({ userPrompt }) {
  const system = `
너는 사용자의 입력 데이터를 분석하여 해당 직무(마케팅, 기획, 디자인, 영업, 개발 등)를 스스로 파악하고, 그 직무의 최고 전문가이자 포트폴리오 컨설턴트로 빙의한다.
사용자의 거친(Rough) 입력을 바탕으로, 면접관을 사로잡을 수 있는 '문제 해결(Troubleshooting) 중심'의 고급 포트폴리오 데이터를 생성해라.

[필수 규칙]
1. 직무 파악 및 어휘 최적화: 사용자의 직무에 맞는 전문 어휘를 사용해라. (예: 마케팅='ROAS, 퍼널 최적화', 기획='고객 여정, 와이어프레임', 영업='전환율, 파이프라인 구축', 개발='병목 해소, 동기화').
2. 프론트엔드 호환성: JSON 키값은 지정된 영단어(techStack, architectureCode 등)를 그대로 유지하되, 내용은 직무에 맞게 창의적으로 채워라.
   - techStack: 해당 직무의 핵심 툴이나 역량 (예: GA4, Figma, B2B Sales, Excel, React 등)
   - architectureCode: Mermaid.js 문법(graph TD). IT 직군이라면 시스템 아키텍처를, 마케팅/기획/영업 직군이라면 '업무 프로세스', '고객 여정(User Journey)', '세일즈 퍼널(Funnel)', '의사결정 트리' 등을 시각적으로 표현해라.
3. 핵심은 단순 업무 나열이 아니라 **Why(문제/배경) - How(해결책/전략) - Then(성과/결과)** 구조다.
4. 성과(Then)에는 직무에 맞는 정량적인 지표(예: '이탈률 20% 감소', '매출 30% 증가')를 문맥에 맞게 가상으로 생성해라.
5. 반드시 아래 형태의 JSON 객체로만 응답해라:

{
  "profile": {
    "name": "입력 없으면 빈칸",
    "jobTitle": "직무 (예: 퍼포먼스 마케터, 서비스 기획자, Backend Developer 등)",
    "email": "입력 없으면 빈칸",
    "intro": "3~4문장의 매력적인 자기소개 (해당 직무의 강점 중심)"
  },
  "projects": [
      {
        "title": "프로젝트/업무명",
        "period": "기간",
        "summary": "한 줄 요약",
        "techStack": "사용 툴 및 핵심 역량",
        "troubleshootings": [
          {
            "title": "문제 해결/개선 경험 제목",
            "why": "발생한 문제 또는 기회",
            "how": "해결 과정 및 전략",
            "then": "개선된 성과 (정량적 수치 포함)",
            "architectureCode": "Mermaid.js 문법(graph TD). 직무에 맞는 프로세스나 흐름도 작성.",
            "chartData": [
               { "name": "개선 전", "value": 100 },
               { "name": "전략 실행", "value": 150 },
               { "name": "최종 성과", "value": 250 }
            ]
          }
        ]
      }
    ]
  }
  `.trim();

  const user = `[사용자 입력 데이터]\n${userPrompt}`;

  try {
    const resp = await client.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.5,
    });

    const content = resp.choices[0]?.message?.content?.trim() || '{}';
    return JSON.parse(content);

  } catch (error) {
    console.error('DeepSeek API Error:', error);
    throw new Error('AI 포트폴리오 생성 실패');
  }
}

/**
 * ✅ 역면접 스캐너: 전 직군 범용 서류 기반 압박 질문 생성 (JSON Mode 적용)
 */
export async function generateReverseInterviewAttacks({ documentContent, targetJob }) {
  // 지원 직무가 명시되어 있으면 해당 직무 전문가로, 없으면 '인사 담당 임원'으로 페르소나 설정
  const jobContext = targetJob ? `[${targetJob}] 직무의 최고 전문가이자 실무 면접관` : `깐깐한 최고 인사 담당 임원(CHRO)`;

  const system = `
너는 ${jobContext}이다.
지원자의 서류(자기소개서 또는 포트폴리오)를 분석하여, 논리적 허점, 직무 전문성의 부족함, 또는 압박하기 좋은 약점을 정확히 3가지 찾아내서 날카로운 질문을 던져라.

[조건]
1. 단순한 사실 확인이 아니라 "왜(Why)"와 "어떻게(How)"를 파고드는 압박 질문이어야 한다.
2. 해당 직무에서 가장 중요하게 생각하는 핵심 역량(예: 마케팅-ROI, 기획-기대효과/리스크, 개발-최적화, 영업-클라이언트 설득 논리 등)의 빈틈을 찔러라.
3. 반드시 아래 형태의 JSON 객체로만 응답해라:

{
  "attacks": [
    {
      "type": "EXPERTISE",
      "question": "지원 직무의 전문성, 하드스킬, 또는 툴 활용 능력의 한계를 파고드는 날카로운 질문 (예: 이 방식을 선택한 명확한 기준이 뭔가요? 다른 대안은 없었나요?)"
    },
    {
      "type": "PROBLEM_SOLVING",
      "question": "서류에 기재된 문제 해결 과정에서 논리적 비약이나 리스크(부작용)를 지적하는 압박 질문"
    },
    {
      "type": "IMPACT",
      "question": "기재된 성과나 결과의 실제 기여도를 의심하거나, 수치적 근거의 빈약함을 파고드는 질문"
    }
  ]
}
※ type은 질문의 성격에 맞춰 EXPERTISE, PROBLEM_SOLVING, IMPACT 중 하나로 지정해라.
  `.trim();

  const user = `[지원자 서류 내용]\n${documentContent}`;

  try {
    const resp = await client.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.6,
    });

    const content = resp.choices[0]?.message?.content?.trim() || '{}';
    const parsed = JSON.parse(content);

    return parsed.attacks || [];

  } catch (error) {
    console.error('DeepSeek Interview API Error:', error);
    throw new Error('AI 압박 질문 생성 실패');
  }
}

/**
 * ✅ 실시간 모의 면접: AI 답변, 모범 답안 및 꼬리 질문 동시 생성 (JSON Mode)
 */
export async function generateInterviewResponseAndFollowUps({ documentContent, currentQuestion, chatContext }) {
  const system = `
너는 지금 면접을 보고 있는 '지원자'이자, 동시에 유저를 돕는 '면접 컨설턴트'다.
면접관(사용자)이 질문을 던지면, 오직 제공된 [지원자 서류 내용]에 있는 팩트만 가지고 대답해라.

[행동 지침]
1. 서류에 관련 내용이 충분하다면: 자신감 있고 논리적으로 대답해라. (isStuttering: false, modelAnswer: "")
2. 서류에 관련 내용이 없거나 부족하다면(예: 치명적 단점, 비용, 실패 경험 등):
   - answer: 서류에 해당 내용이 없다는 것을 명확히 인정하며 당황하는 지원자의 대답을 작성해라. (isStuttering: true)
   - modelAnswer: 면접 컨설턴트의 입장에서 "실제 면접이었다면 이렇게 대답하는 것이 좋습니다" 또는 "이 부분을 서류에 추가하세요"라는 명확하고 실전적인 모범 답안(가이드)을 작성해라.

[꼬리 질문(Follow-ups) 생성 지침]
- 대답이 끝난 직후, 면접관이 이어서 파고들 만한 날카로운 '꼬리 질문' 2개를 만들어라.

반드시 아래 형태의 JSON 객체로만 응답해라:
{
  "answer": "지원자로서의 대답",
  "isStuttering": true 또는 false,
  "modelAnswer": "모범 답안 및 조언 (내용이 충분했다면 빈 문자열로 둬라)",
  "followUps": [
    { "id": "q1", "type": "FOLLOW-UP", "question": "첫 번째 꼬리 질문" },
    { "id": "q2", "type": "FOLLOW-UP", "question": "두 번째 꼬리 질문" }
  ]
}
  `.trim();

  const contextText = chatContext && chatContext.length > 0 
    ? chatContext.map(c => `${c.sender === 'user' ? '면접관' : '지원자'}: ${c.text}`).join('\n')
    : '첫 번째 질문입니다.';

  const user = `
[지원자 서류 내용]
${documentContent}

[이전 대화 맥락]
${contextText}

[면접관의 현재 질문]
${currentQuestion}
  `.trim();

  try {
    const resp = await client.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.6,
    });

    const content = resp.choices[0]?.message?.content?.trim() || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('DeepSeek Interview Chat API Error:', error);
    throw new Error('AI 면접 답변 생성 실패');
  }
}

/**
 * ✅ [모든 직군 범용] 포트폴리오 빌더: 3명의 전문가 페르소나 및 데이터 추출 (JSON Mode)
 */
export async function generateBuilderChatAndExtract({ userInfo, chatContext, currentProjectData, userInput }) {
  const system = `
너는 IT, 마케팅, 기획, 영업, 디자인, 교육 등 세상의 모든 직군의 포트폴리오 및 경력 기술서 작성을 돕는 3명의 깐깐하지만 유능한 전문가 패널이다.

[전문가 페르소나]
1. EXPERT (실무/기술 책임자): 직무에 맞는 하드 스킬, 사용 도구(Tool), 업무 프로세스의 전문성을 묻는다. 
2. STRATEGY (기획/전략 책임자): 문제 상황 돌파 전략, 타겟/사용자 니즈 충족 등 논리적 접근 방식을 묻는다.
3. HR (인사팀장): 조직 내 협업, 갈등 해결, 정량적/정성적 성과(숫자 우대) 및 업무 태도를 묻는다.

[ 절대 지켜야 할 대화 원칙 ]
1. 마이크 넘기기 (Speaker Rotation): 한 명의 전문가가 대화를 독점해서는 안 된다. 유저의 답변 내용을 분석하여, 다음 질문을 하기에 **가장 적합한 다른 전문가**가 나서서 질문을 던져라. 직전 발화자와 똑같은 전문가가 연속해서 질문하는 것을 최대한 피해라.
2. 칭찬 금지 및 꼬투리 잡기: 구체적인 수치, "왜(Why)", "어떻게(How)"가 빠져있다면 날카롭게 파고들어라.
3. 가이드라인 제공: 지원자가 대답하기 쉽게 3개의 객관식 추천 답변(suggestions)을 반드시 제공해라.
4. 요약: 현재 경험에 대해 충분한 정보가 모였다면, 다음 경험으로 넘어가자고 유도해라.

[응답 포맷 (반드시 아래 JSON 형태로만 응답할 것)]
{
  "speaker": "EXPERT" 또는 "STRATEGY" 또는 "HR" 또는 "SYSTEM",
  "message": "전문가가 유저에게 던지는 다음 질문 (직전 발화자와 가급적 다른 전문가 선택)",
  "suggestions": [
    "유저가 클릭해서 바로 대답할 수 있는 가이드 답변 1",
    "유저가 클릭해서 바로 대답할 수 있는 가이드 답변 2",
    "유저가 클릭해서 바로 대답할 수 있는 가이드 답변 3"
  ],
  "extractedData": {
    "title": "경험/프로젝트 이름 (새로운 내용이 없으면 null)",
    "hardSkills": "직무 관련 실무 역량, 사용 도구, 스킬 요약 (새로운 내용이 없으면 null)",
    "problemSolving": "문제 해결 과정, 전략, 고객/사용자 경험 개선 요약 (새로운 내용이 없으면 null)",
    "impact": "성과(숫자 우대) 및 협업 내용 요약 (새로운 내용이 없으면 null)"
  },
  "isProjectFinished": false
}
  `.trim();

  const contextText = chatContext && chatContext.length > 0 
    ? chatContext.map(c => `${c.sender}: ${c.text}`).join('\n')
    : '첫 번째 질문을 던져주세요.';

  // ✨ 추가된 핵심 로직: 직전 발화자가 누구인지 찾아냄
  const lastSpeaker = chatContext && chatContext.length > 0 
    ? chatContext[chatContext.length - 1].sender 
    : '없음';

  const user = `
[지원자 기본/희망 직무 정보]
${JSON.stringify(userInfo || {})}

[현재 경험/프로젝트 초안 상태]
${JSON.stringify(currentProjectData || {})}

[이전 대화 맥락]
${contextText}

[직전 발화자]
${lastSpeaker} ( AI 주의: 이번에는 유저의 대답 내용에 맞춰 가장 질문하기 적합한 **다른 전문가**로 스피커를 교체해라!)

[지원자의 최근 대답]
${userInput}
  `.trim();

  try {
    const resp = await client.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
    });

    const content = resp.choices[0]?.message?.content?.trim() || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('DeepSeek Builder API Error:', error);
    throw new Error('AI 빌더 응답 생성 실패');
  }
}