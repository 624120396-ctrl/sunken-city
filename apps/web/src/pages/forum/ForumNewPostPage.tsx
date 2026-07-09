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
      alert('请选择分卷，并写下密档标题与低语正文');
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
        alert(`低语已封入档案。获得奖励：灵魂碎片 +${res.reward.rewardExp}，锈蚀硬币 +${res.reward.rewardCoin}`);
      } else {
        alert('低语已封入档案。');
      }
      navigate(`/forums/${res.post.id}`);
    } catch (err: any) {
      alert(err.message || '低语未能封入档案');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      className="forum-new-post-page"
      eyebrow="WHISPER SCRIPTORIUM"
      title="誊录一则低语"
      description="墨水尚未干透，低语已在纸背生根，等待被黑暗认领。"
    >
      <Surface variant="panel" material="archive" padding="sm" className="forum-compose-backbar flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="coc-btn-secondary min-h-11 min-w-11 p-2">
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm text-[var(--coc-text-secondary)]">返回上一层档案</span>
      </Surface>

      <Surface variant="solid" material="archive" padding="lg" className="forum-compose-card">
      <form onSubmit={handleSubmit} className="forum-compose-form">
        <div>
          <label className="forum-compose-label">选择分卷</label>
          <select
            value={boardKey}
            onChange={(e) => setBoardKey(e.target.value)}
            className="forum-compose-input"
          >
            {boards.map((b) => (
              <option key={b.key} value={b.key}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="forum-compose-label">密档标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="给这则低语留下可追索的标题"
            className="forum-compose-input"
          />
        </div>

        <div>
          <label className="forum-compose-label">低语正文</label>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="写下你从雾中听见、或不愿再独自保存的内容..."
            minHeight="240px"
          />
        </div>

        <div>
          <label className="forum-compose-label">悬赏金额（锈蚀硬币，可选）</label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <input
              type="number"
              min={0}
              max={user?.coins || 0}
              value={bounty}
              onChange={(e) => setBounty(Math.max(0, parseInt(e.target.value) || 0))}
              className="forum-compose-input sm:w-36"
            />
            <span className="forum-compose-note">当前余额：{user?.coins || 0} 锈蚀硬币</span>
          </div>
          {bounty > 0 && (
            <p className="text-xs text-amber-400 mt-1">
              被选为最佳回声者将获得 {bounty} 锈蚀硬币悬赏。
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
            {loading ? '封存中...' : '封入档案'}
          </button>
        </div>
      </form>
      </Surface>
    </PageShell>
  );
}
