import { prisma } from '../../config/database';
import { generateImage } from '../../utils/image-gateway';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const SEEDREAM_ENDPOINT = process.env.SEEDREAM_ENDPOINT || 'ep-20260408171908-9s9bs';

interface SceneGenerationOptions {
  sessionId: string;
  nodeId: string;
  worldState: string;
  prompt: string;
  scenarioId: string;
}

/**
 * 生成并保存场景图（异步触发，不阻塞主流程）
 */
export async function generateAndSaveSceneImage(
  options: SceneGenerationOptions
): Promise<string | null> {
  const { sessionId, nodeId, worldState, prompt, scenarioId } = options;

  try {
    // 1. 检查是否已有缓存
    const existingAsset = await prisma.scenarioAsset.findFirst({
      where: {
        scenarioId,
        nodeId,
        type: 'scene',
        worldState,
      },
    });

    if (existingAsset?.imageUrl) {
      return existingAsset.imageUrl;
    }

    // 2. 调用 Seedream API 生成图片
    const results = await generateImage({
      endpointId: SEEDREAM_ENDPOINT,
      prompt,
      size: '1920x1080',
      n: 1,
    });

    const imageUrl = results[0]?.url;
    if (!imageUrl) {
      console.error('[AI-Image] No image URL returned');
      return null;
    }

    // 3. 下载图片到本地
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const fileName = `${nodeId}-${worldState}-${Date.now()}.png`;
    const relativePath = `scenes/${scenarioId}/${fileName}`;
    const absolutePath = path.join(UPLOAD_DIR, relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer);

    const publicUrl = `/uploads/${relativePath}`;

    // 4. 写入数据库
    if (existingAsset) {
      await prisma.scenarioAsset.update({
        where: { id: existingAsset.id },
        data: { imageUrl: publicUrl, prompt },
      });
    } else {
      await prisma.scenarioAsset.create({
        data: {
          scenarioId,
          nodeId,
          type: 'scene',
          worldState,
          imageUrl: publicUrl,
          prompt,
        },
      });
    }

    // 5. 同时更新 ScenarioNode.generatedImageUrl
    await prisma.scenarioNode.updateMany({
      where: { scenarioId, nodeId, worldState },
      data: { generatedImageUrl: publicUrl },
    });

    console.log(`[AI-Image] Scene image saved: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('[AI-Image] Generation failed:', error);
    return null;
  }
}

/**
 * 异步触发场景图生成（fire-and-forget）
 */
export function requestSceneGeneration(
  sessionId: string,
  nodeId: string,
  worldState: string,
  prompt: string,
  scenarioId: string
): void {
  // [2026-04-12] 暂时关闭单人跑团 AI 生图功能
  console.log('[AI-Image] Solo scenario image generation is temporarily disabled.');
  return;

  generateAndSaveSceneImage({
    sessionId,
    nodeId,
    worldState,
    prompt,
    scenarioId,
  }).catch((err) => {
    console.error('[AI-Image] Background generation error:', err);
  });
}

/**
 * 获取场景图 URL（优先从缓存读取）
 */
export async function getSceneImageUrl(
  scenarioId: string,
  nodeId: string,
  worldState: string
): Promise<string | null> {
  const asset = await prisma.scenarioAsset.findFirst({
    where: {
      scenarioId,
      nodeId,
      type: 'scene',
      worldState,
    },
  });

  return asset?.imageUrl || null;
}
