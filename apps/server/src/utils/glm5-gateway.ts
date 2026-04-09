/**
 * 腾讯云 GLM-5 模型网关
 * Base URL: https://tokenhub.tencentmaas.com/v1/chat/completions
 * 模型: glm-5
 */

const GLM5_API_KEY = process.env.GLM5_API_KEY || '';
const GLM5_BASE_URL = 'https://tokenhub.tencentmaas.com/v1/chat/completions';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export async function codingChat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const apiKey = GLM5_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GLM5_API_KEY environment variable');
  }

  const model = options.model || 'glm-5';
  const temperature = options.temperature ?? 0.3;
  const maxTokens = options.maxTokens ?? 4096;

  const bodyMessages: ChatMessage[] = [];
  if (options.systemPrompt) {
    bodyMessages.push({ role: 'system', content: options.systemPrompt });
  }
  bodyMessages.push(...messages);

  const response = await fetch(GLM5_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: bodyMessages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GLM-5 API error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('GLM-5 API returned empty content');
  }

  return content;
}

export async function reviewPrismaSchemaChange(
  oldSchema: string,
  newSchema: string,
  relatedFiles: string
): Promise<string> {
  return codingChat(
    [
      {
        role: 'user',
        content: `请作为 Prisma + Node.js 专家审查以下 schema 变更，列出所有需要同步修改的地方：\n\n【Old Schema】\n${oldSchema}\n\n【New Schema】\n${newSchema}\n\n【相关代码片段】\n${relatedFiles}\n\n请输出：\n1. 需要同步更新的路由/服务文件列表\n2. 是否需要 migrate 或 db push\n3. 是否有 JSON 字段类型风险\n4. 是否有 breaking change 会导致线上 500`,
      },
    ],
    {
      systemPrompt:
        '你是一个严格的代码审查员，只输出结构化的检查清单，不输出废话。',
      temperature: 0.1,
      maxTokens: 2048,
    }
  );
}

export async function generateRouteTests(routeCode: string): Promise<string> {
  return codingChat(
    [
      {
        role: 'user',
        content: `请为以下 Express 路由文件生成完整的 vitest + supertest 测试用例。使用 Prisma 的 mock 方案，覆盖正常路径和错误边界。\n\n${routeCode}`,
      },
    ],
    {
      systemPrompt:
        '你是一个测试工程专家，生成的测试代码必须可直接运行，使用 TypeScript、vitest、supertest。',
      temperature: 0.2,
      maxTokens: 4096,
    }
  );
}

export async function diagnoseFrontendIssue(
  sourceCode: string,
  issueDescription: string,
  dataSample?: string
): Promise<string> {
  return codingChat(
    [
      {
        role: 'user',
        content: `前端问题诊断\n\n【问题描述】\n${issueDescription}\n\n【源码】\n${sourceCode}\n\n${
          dataSample ? `【数据样本】\n${dataSample}\n\n` : ''
        }请找出所有可能导致该问题的地方，并给出修复代码。`,
      },
    ],
    {
      systemPrompt:
        '你是一个精通 React + TypeScript + Tailwind CSS 的前端工程师，善于排查显示异常、类型转换错误和构建产物问题。',
      temperature: 0.2,
      maxTokens: 4096,
    }
  );
}
