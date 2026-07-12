import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import { prisma } from '../../../config/database';
import { parseStageAssetByteRange, resolveStageAssetFile, stageAssetContentType, verifyStageAssetDeliverySignature } from './stage-asset-delivery';

const router = Router();
const assetRoot = () => process.env.STAGE_ASSET_ROOT || '/opt/coc-platform-data/stage-assets';

function singleQueryValue(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

router.get('/delivery/:assetId', async (req, res, next) => {
  try {
    const version = Number(singleQueryValue(req.query.v));
    const expiresAt = Number(singleQueryValue(req.query.e));
    const viewerUserId = singleQueryValue(req.query.u);
    const signature = singleQueryValue(req.query.sig);
    const secret = process.env.STAGE_ASSET_DELIVERY_SECRET;
    if (!secret || !viewerUserId || !signature || !Number.isSafeInteger(version) || version < 1 || !verifyStageAssetDeliverySignature({
      assetId: req.params.assetId, version, viewerUserId, expiresAt, signature, secret,
    })) {
      return res.status(403).json({ success: false, error: { code: 'STAGE_ASSET_FORBIDDEN', message: '素材投递链接无效或已过期' } });
    }

    const asset = await (prisma as any).stageAsset.findFirst({
      where: { id: req.params.assetId, version, deletedAt: null },
      select: { storageKey: true, mimeType: true, size: true },
    });
    if (!asset) return res.status(404).json({ success: false, error: { code: 'STAGE_ASSET_FORBIDDEN', message: '素材不存在' } });
    const filePath = resolveStageAssetFile(assetRoot(), asset.storageKey);
    if (!filePath) return res.status(404).json({ success: false, error: { code: 'STAGE_ASSET_FORBIDDEN', message: '素材不可用' } });
    const [canonicalRoot, canonicalFile] = await Promise.all([realpath(assetRoot()).catch(() => null), realpath(filePath).catch(() => null)]);
    if (!canonicalRoot || !canonicalFile || !canonicalFile.startsWith(`${canonicalRoot}${path.sep}`)) return res.status(404).json({ success: false, error: { code: 'STAGE_ASSET_FORBIDDEN', message: '素材不可用' } });
    const info = await stat(canonicalFile).catch(() => null);
    if (!info?.isFile()) return res.status(404).json({ success: false, error: { code: 'STAGE_ASSET_FORBIDDEN', message: '素材不可用' } });
    const contentType = stageAssetContentType(asset.mimeType);
    if (contentType === 'application/octet-stream') return res.status(415).json({ success: false, error: { code: 'STAGE_ASSET_FORBIDDEN', message: '素材类型不受支持' } });

    const rangeHeader = req.header('range');
    const range = parseStageAssetByteRange(rangeHeader, info.size);
    if (rangeHeader && !range) {
      res.setHeader('Content-Range', `bytes */${info.size}`);
      return res.status(416).end();
    }
    const start = range?.start ?? 0;
    const end = range?.end ?? info.size - 1;
    res.status(range ? 206 : 200);
    res.set({
      'Content-Type': contentType,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    });
    if (range) res.setHeader('Content-Range', `bytes ${start}-${end}/${info.size}`);
    createReadStream(canonicalFile, { start, end }).on('error', next).pipe(res);
  } catch (error) {
    next(error);
  }
});

export default router;
