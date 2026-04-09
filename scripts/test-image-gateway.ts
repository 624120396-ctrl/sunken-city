import { generateImage, generateCharacterAvatar } from '../apps/server/src/utils/image-gateway';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  if (!process.env.ARK_IMAGE_API_KEY) {
    console.error('错误：缺少环境变量 ARK_IMAGE_API_KEY');
    console.error('请运行：export ARK_IMAGE_API_KEY=7882b64c-610b-4c44-bd57-139d7463a40f');
    process.exit(1);
  }

  const endpointId = process.argv[2];
  if (!endpointId) {
    console.log('用法：npx tsx scripts/test-image-gateway.ts <endpoint-id>');
    console.log('提示：您需要在火山方舟控制台为 doubao-seedream-4.5 创建一个推理端点，');
    console.log('      然后使用端点 ID（如 ep-2026xxxxxx-xxxxx）作为参数。');
    process.exit(0);
  }

  const mode = process.argv[3] || 'simple';

  if (mode === 'avatar') {
    console.log('正在生成角色卡头像...');
    const buf = await generateCharacterAvatar(endpointId, {
      name: '测试调查员',
      age: 32,
      gender: '男',
      occupation: '私家侦探',
    });
    if (!buf) {
      console.error('生成失败');
      process.exit(1);
    }
    const out = path.resolve(__dirname, '../tmp/test-avatar.png');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    console.log('头像已保存到:', out);
    return;
  }

  if (mode === 'scene') {
    const { generateSceneImage } = await import('../apps/server/src/utils/image-gateway');
    console.log('正在生成场景图...');
    const buf = await generateSceneImage(
      endpointId,
      'A decaying Victorian mansion hallway, broken chandeliers, moonlight through shattered windows',
      'horror'
    );
    if (!buf) {
      console.error('生成失败');
      process.exit(1);
    }
    const out = path.resolve(__dirname, '../tmp/test-scene.png');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    console.log('场景图已保存到:', out);
    return;
  }

  // 默认：简单文生图测试
  console.log('正在生成简单测试图片...');
  const results = await generateImage({
    endpointId,
    prompt: 'A dark fantasy investigator portrait, mysterious atmosphere, cinematic lighting',
    size: '512x512',
    n: 1,
  });

  if (!results[0]?.url) {
    console.error('生成失败，无图片 URL 返回');
    process.exit(1);
  }

  console.log('图片 URL:', results[0].url);

  // 下载保存
  const imgRes = await fetch(results[0].url);
  const arrayBuffer = await imgRes.arrayBuffer();
  const out = path.resolve(__dirname, '../tmp/test-image.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(arrayBuffer));
  console.log('图片已保存到:', out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
