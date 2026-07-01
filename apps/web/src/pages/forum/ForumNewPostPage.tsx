import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getForumBoards, createPost } from '../../services/forum.service';
import { useAuthStore } from '../../stores/auth.store';
import { RichTextEditor } from '../../components/RichTextEditor';
import { PageShell, Surface } from '@components/system';

export function ForumNewPostPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [boards, setBoards] = useState<{ key: string; name: string }[]>([]);
  const [boardKey, setBoardKey] = useState(searchParams.get('board') || '');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [bounty, setBounty] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getForumBoards().then((res) => {
      setBoards(res.boards);
      if (!boardKey && res.boards.length > 0) {
        setBoardKey(res.boards[0].key);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardKey || !title.trim() || !content.trim()) {
      alert('请选择版块并填写标题和内容');
      return;
    }
    if ((user?.coins || 0) < bounty) {
      alert('锈蚀硬币不足以支付悬赏');
      return;
    }

    setLoading(true);
    try {
      const res = await createPost({
        boardKey,
        title: title.trim(),
        content: content.trim(),
        bountyCoin: bounty > 0 ? bounty : undefined,
      });
      if (res.reward) {
        alert(`发布成功！获得奖励：灵魂碎片 +${res.reward.rewardExp}，锈蚀硬币 +${res.reward.rewardCoin}`);
      } else {
        alert('发布成功！');
      }
      navigate(`/forums/${res.post.id}`);
    } catch (err: any) {
      alert(err.message || '发布失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      eyebrow="forum editor"
      title="发布主题"
      description="选择版块、标题和正文。编辑器内容流保持不变。"
      contentClassName="max-w-3xl"
    >
      <Surface variant="panel" padding="sm" className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="coc-btn-secondary min-h-11 min-w-11 p-2">
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm text-[var(--coc-text-secondary)]">返回上一页</span>
      </Surface>

      <Surface variant="solid" padding="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[#b0a898] mb-1">选择版块</label>
          <select
            value={boardKey}
            onChange={(e) => setBoardKey(e.target.value)}
            className="min-h-11 w-full bg-[#1a1a1a] border border-[#3a3a3a]/40 rounded px-3 py-2 text-[#e8d4a0] focus:border-coc-gold focus:outline-none"
          >
            {boards.map((b) => (
              <option key={b.key} value={b.key}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-[#b0a898] mb-1">标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="请输入标题"
            className="min-h-11 w-full bg-[#1a1a1a] border border-[#3a3a3a]/40 rounded px-3 py-2 text-[#e8d4a0] placeholder:text-[#6b6558] focus:border-coc-gold focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-[#b0a898] mb-1">内容</label>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="写下你想分享的内容..."
            minHeight="240px"
          />
        </div>

        <div>
          <label className="block text-sm text-[#b0a898] mb-1">悬赏金额（锈蚀硬币，可选）</label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <input
              type="number"
              min={0}
              max={user?.coins || 0}
              value={bounty}
              onChange={(e) => setBounty(Math.max(0, parseInt(e.target.value) || 0))}
              className="min-h-11 w-full bg-[#1a1a1a] border border-[#3a3a3a]/40 rounded px-3 py-2 text-[#e8d4a0] focus:border-coc-gold focus:outline-none sm:w-36"
            />
            <span className="text-sm text-[#b0a898]">当前余额：{user?.coins || 0} 锈蚀硬币</span>
          </div>
          {bounty > 0 && (
            <p className="text-xs text-amber-400 mt-1">
              最佳回复者将获得 {bounty} 锈蚀硬币悬赏。
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="coc-btn-secondary min-h-11"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="coc-btn-primary min-h-11 disabled:opacity-50"
          >
            {loading ? '发布中...' : '发布主题'}
          </button>
        </div>
      </form>
      </Surface>
    </PageShell>
  );
}
