import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getForumBoards, createPost } from '../../services/forum.service';
import { useAuthStore } from '../../stores/auth.store';
import { RichTextEditor } from '../../components/RichTextEditor';

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
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="coc-btn-secondary p-2">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-ritual font-bold text-coc-parchment">发布主题</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-coc-bg-tertiary border border-coc-border rounded-lg p-4">
        <div>
          <label className="block text-sm text-coc-text-muted mb-1">选择版块</label>
          <select
            value={boardKey}
            onChange={(e) => setBoardKey(e.target.value)}
            className="w-full bg-coc-bg-primary border border-coc-border rounded p-2 text-coc-parchment focus:border-coc-gold focus:outline-none"
          >
            {boards.map((b) => (
              <option key={b.key} value={b.key}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-coc-text-muted mb-1">标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="请输入标题"
            className="w-full bg-coc-bg-primary border border-coc-border rounded p-2 text-coc-parchment placeholder:text-coc-text-muted focus:border-coc-gold focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-coc-text-muted mb-1">内容</label>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="写下你想分享的内容..."
            minHeight="240px"
          />
        </div>

        <div>
          <label className="block text-sm text-coc-text-muted mb-1">悬赏金额（锈蚀硬币，可选）</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={user?.coins || 0}
              value={bounty}
              onChange={(e) => setBounty(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-32 bg-coc-bg-primary border border-coc-border rounded p-2 text-coc-parchment focus:border-coc-gold focus:outline-none"
            />
            <span className="text-sm text-coc-text-muted">当前余额：{user?.coins || 0} 硬币</span>
          </div>
          {bounty > 0 && (
            <p className="text-xs text-amber-400 mt-1">
              最佳回复者将获得 {bounty} 硬币悬赏。
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="coc-btn-secondary"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="coc-btn-primary disabled:opacity-50"
          >
            {loading ? '发布中...' : '发布主题'}
          </button>
        </div>
      </form>
    </div>
  );
}
