import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, ChevronLeft, Plus, Edit, Trash2, Pin } from 'lucide-react';
import { RuneBorder } from '@components/ui/RuneBorder';
import type { Announcement } from '@services/announcement.service';
import {
  getAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '@services/announcement.service';
import { Skeleton } from '@components/ui/Skeleton';

export function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    content: '',
    isPinned: false,
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAdminAnnouncements();
      setAnnouncements(data.announcements);
    } catch (err) {
      console.error(err);
      alert('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', content: '', isPinned: false, isActive: true });
    setIsModalOpen(true);
  };

  const openEdit = (item: Announcement) => {
    setEditing(item);
    setForm({
      title: item.title,
      content: item.content,
      isPinned: item.isPinned,
      isActive: item.isActive ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateAnnouncement(editing.id, form);
      } else {
        await createAnnouncement(form);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      alert('保存失败：' + (err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这条公告吗？')) return;
    try {
      await deleteAnnouncement(id);
      await loadData();
    } catch (err) {
      alert('删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="p-2 text-coc-parchment-dim hover:text-coc-parchment rounded hover:bg-coc-abyss transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-coc-gold" />
            <h1 className="text-2xl font-ritual font-bold text-coc-parchment">公告管理</h1>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-coc-gold text-coc-abyss rounded hover:bg-coc-gold-glow transition-colors font-medium"
        >
          <Plus size={18} />
          发布公告
        </button>
      </div>

      <RuneBorder variant="gold" intensity="normal">
        <div className="coc-bg-parchment p-6">
          {loading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 rounded border border-coc-void bg-coc-abyss/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <div className="flex items-center gap-2 pt-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <p className="text-coc-parchment-dim text-center py-12">暂无公告</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded border ${
                    item.isPinned
                      ? 'border-coc-gold/40 bg-coc-gold/5'
                      : 'border-coc-void bg-coc-abyss/30'
                  } ${!item.isActive ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {item.isPinned && (
                          <Pin className="w-4 h-4 text-coc-gold" />
                        )}
                        <span className="font-ritual font-bold text-coc-parchment">
                          {item.title}
                        </span>
                        {!item.isActive && (
                          <span className="text-xs px-2 py-0.5 bg-coc-void text-coc-parchment-faded rounded">
                            未发布
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-coc-parchment-dim line-clamp-2">
                        {item.content}
                      </p>
                      <p className="text-xs text-coc-parchment-faded mt-2">
                        发布时间: {new Date(item.publishedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-2 text-coc-parchment-dim hover:text-coc-gold transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-coc-parchment-dim hover:text-coc-blood transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </RuneBorder>

      {/* 编辑弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl mx-4">
            <RuneBorder variant="gold" intensity="strong">
              <div className="coc-bg-parchment p-6">
                <h2 className="text-xl font-ritual font-bold text-coc-parchment mb-6">
                  {editing ? '编辑公告' : '发布公告'}
                </h2>

                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">标题</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-gold focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">内容</label>
                    <textarea
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-gold focus:outline-none resize-none"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.isPinned}
                        onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                        className="w-4 h-4 bg-coc-abyss border-coc-void rounded"
                      />
                      <span className="text-sm text-coc-parchment-dim">置顶</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                        className="w-4 h-4 bg-coc-abyss border-coc-void rounded"
                      />
                      <span className="text-sm text-coc-parchment-dim">立即发布</span>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-4 py-2 bg-coc-void text-coc-parchment rounded hover:bg-coc-void/80 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-coc-gold text-coc-abyss rounded hover:bg-coc-gold-glow transition-colors font-medium"
                    >
                      保存
                    </button>
                  </div>
                </form>
              </div>
            </RuneBorder>
          </div>
        </div>
      )}
    </div>
  );
}
