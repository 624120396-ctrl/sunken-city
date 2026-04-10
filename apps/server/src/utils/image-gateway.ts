/**
 * 豆包/火山引擎 图像/视频生成网关
 * 支持 Seedream 系列图生图、文生图，以及 Seedance 视频生成
 *
 * 注意：调用图像生成 API 时必须使用您在火山方舟控制台创建的 Endpoint ID
 * （格式如 ep-2026xxxxxx-xxxxx），而不是模型名称 doubao-seedream-4.5
 */
import { fetchWithResilience } from './fetch-with-resilience';

const ARK_IMAGE_API_KEY = process.env.ARK_IMAGE_API_KEY || '';
const ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

export interface ImageGenerationOptions {
  endpointId: string;   // 火山方舟控制台创建的推理端点 ID
  prompt: string;
  negativePrompt?: string;
  size?: '512x512' | '768x768' | '1024x1024' | '1280x720' | '1920x1080' | string;
  n?: number;
  seed?: number;
}

export interface ImageResult {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
  size?: string;
}

/**
 * 文生图
 */
export async function generateImage(
  options: ImageGenerationOptions
): Promise<ImageResult[]> {
  const apiKey = ARK_IMAGE_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ARK_IMAGE_API_KEY environment variable');
  }

  const response = await fetchWithResilience(`${ARK_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.endpointId,
      prompt: options.prompt,
      negative_prompt: options.negativePrompt,
      size: options.size || '512x512',
      n: options.n || 1,
      seed: options.seed,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Image generation error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    data?: ImageResult[];
    usage?: { total_tokens?: number };
  };

  return data.data || [];
}

/**
 * 图生图（基于已有图片进行风格迁移/重绘）
 */
export interface ImageEditOptions extends ImageGenerationOptions {
  imageUrl: string;
  strength?: number; // 0-1，重绘幅度
}

export async function editImage(
  options: ImageEditOptions
): Promise<ImageResult[]> {
  const apiKey = ARK_IMAGE_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ARK_IMAGE_API_KEY environment variable');
  }

  const response = await fetchWithResilience(`${ARK_BASE_URL}/images/edits`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.endpointId,
      image: options.imageUrl,
      prompt: options.prompt,
      negative_prompt: options.negativePrompt,
      size: options.size || '512x512',
      n: options.n || 1,
      strength: options.strength ?? 0.7,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Image edit error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { data?: ImageResult[] };
  return data.data || [];
}

/**
 * 为沉没之城角色卡生成头像
 */
export async function generateCharacterAvatar(
  endpointId: string,
  character: {
    name: string;
    age: number;
    gender: string;
    occupation: string;
    background?: string;
  }
): Promise<Buffer | null> {
  // 根据角色信息拼 prompt，固定为克苏鲁/暗黑风格 anime portrait
  const prompt = `
    ${character.gender === '女' ? 'A female' : 'A male'} investigator in his/her ${character.age}s,
    profession: ${character.occupation},
    dark fantasy style, mysterious atmosphere,
    1920s vintage clothing, subtle occult elements in background,
    detailed anime portrait, cinematic lighting, muted colors,
    single character in center, clean face, no text, no watermark
  `.trim();

  const results = await generateImage({
    endpointId,
    prompt,
    size: '1920x1920',
    n: 1,
  });

  const url = results[0]?.url;
  if (!url) return null;

  // 下载图片并返回 Buffer
  const imgRes = await fetchWithResilience(url);
  if (!imgRes.ok) return null;
  const arrayBuffer = await imgRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * 为游戏房间生成场景卡背景图
 */
export async function generateSceneImage(
  endpointId: string,
  sceneDescription: string,
  atmosphere: 'normal' | 'dark' | 'horror' | 'mystery' | 'warm' = 'dark'
): Promise<Buffer | null> {
  const atmosphereWords: Record<string, string> = {
    normal: 'neutral atmosphere, clear lighting',
    dark: 'oppressive darkness, low-key lighting',
    horror: 'horror, twisted shadows, dread',
    mystery: 'misty, enigmatic, muted palette',
    warm: 'warm lighting, cozy but eerie undertone',
  };

  const prompt = `
    ${sceneDescription},
    ${atmosphereWords[atmosphere] || atmosphereWords.dark},
    dark fantasy RPG scene illustration,
    cinematic composition, no text, no UI, no watermark
  `.trim();

  const results = await generateImage({
    endpointId,
    prompt,
    size: '2560x1440',
    n: 1,
  });

  const url = results[0]?.url;
  if (!url) return null;

  const imgRes = await fetchWithResilience(url);
  if (!imgRes.ok) return null;
  const arrayBuffer = await imgRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * 通用prompt优化器（可复用）
 * 把用户的口语化描述转化为高质量英文提示词
 */
export function optimizePrompt(rawDescription: string): string {
  return `
    ${rawDescription},
    highly detailed, atmospheric lighting, cinematic composition,
    concept art style, no text, no watermark
  `.trim();
}