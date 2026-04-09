import { useState, useEffect } from 'react';
import { Crown, Plus, Trash2, Search, Loader2 } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { Modal } from '@components/ui/Modal';
import { Skeleton } from '@components/ui/Skeleton';
import {
  getForumBoards,
  getBoardModerators,
  addBoardModerator,
  removeBoardModerator,
} from '../../services/forum.service';

interface Board {
  key: string;
  name: string;
  description?: string;
}

interface Moderator {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl?: string;
}

const BOARD_MODERATOR_TITLES: Record<string, string> = {
  lore: '校长',
  strategy: '行政官',
  creative: '梦主',
  tavern: '老板',
  arkham_hall: '市长',
};

export function AdminBoardModeratorsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [modsMap, setModsMap] = useState<Record<string, Moderator[]>>({});
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; displayId: number; nickname: string; email: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [appointing, setAppointing] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const bRes = await getForumBoards();
      setBoards(bRes.boards);
      const map: Record<string, Moderator[]> = {};
      await Promise.all(
        bRes.boards.map(async (b) => {
          const mRes = await getBoardModerators(b.key);
          map[b.key] = mRes.moderators;
        })
      );
      setModsMap(map);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await apiFetch(`/admin/users?search=${encodeURIComponent(search.trim())}&limit=10&page=1`);
      const data = await handleApiResponse<{ users: { id: string; displayId: number; nickname: string; email: string }[] }>(res);
      setSearchResults(data.users);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleAppoint = async (userId: string, nickname: string) => {
    if (!selectedBoard) return;
    setAppointing(true);
    try {
      await addBoardModerator(selectedBoard.key, userId);
      setModalOpen(false);
      setSearch('');
      setSearchResults([]);
      await loadAll();
      alert(`已任命 ${nickname} 为「${selectedBoard.name}」的${BOARD_MODERATOR_TITLES[selectedBoard.key] || '版主'}`);
    } catch (err: any) {
      alert(err.message || '任命失败');
    } finally {
      setAppointing(false);
    }
  };

  const handleRemove = async (board: Board, mod: Moderator) => {
    if (!confirm(`确定撤销 ${mod.nickname} 在「${board.name}」的${BOARD_MODERATOR_TITLES[board.key] || '版主'}身份？`)) return;
    try {
      await removeBoardModerator(board.key, mod.userId);
      await loadAll();
    } catch (err: any) {
      alert(err.message || '撤销失败');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-coc-parchment flex items-center gap-2">
            <Crown className="text-coc-accent-gold" size={28} />
            版主管理
          </h1>
          <p className="text-sm text-coc-text-muted mt-1">为各版块任命或撤销具有删帖、精华、置顶权限的管理者</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="coc-card space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-14" />
                </div>
                <Skeleton className="h-7 w-16" />
              </div>
              <div className="space-y-2">
                <Skeleton circle className="h-8 w-8" />
                <Skeleton circle className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => {
            const mods = modsMap[board.key] || [];
            const title = BOARD_MODERATOR_TITLES[board.key] || '版主';
            return (
              <div key={board.key} className="bg-coc-bg-tertiary border border-coc-border rounded-lg p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-bold text-coc-parchment">{board.name}</div>
                    <div className="text-xs text-coc-gold">{title}</div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedBoard(board);
                      setModalOpen(true);
                    }}
                    className="coc-btn-primary flex items-center gap-1 text-xs px-3 py-1.5"
                  >
                    <Plus size={14} />
                    任命
                  </button>
                </div>

                <div className="space-y-2">
                  {mods.length === 0 && (
                    <div className="text-xs text-coc-text-muted italic">暂无{title}</div>
                  )}
                  {mods.map((mod) => (
                    <div
                      key={mod.id}
                      className="flex items-center justify-between bg-coc-bg-primary border border-coc-border rounded px-3 py-2"
                    >
                      <span className="text-sm text-coc-parchment">{mod.nickname}</span>
                      <button
                        onClick={() => handleRemove(board, mod)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="撤销"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && selectedBoard && (
        <Modal
          isOpen
          onClose={() => {
            setModalOpen(false);
            setSearch('');
            setSearchResults([]);
          }}
          title={`任命${BOARD_MODERATOR_TITLES[selectedBoard.key] || '版主'} · ${selectedBoard.name}`}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="输入用户ID或昵称搜索..."
                className="flex-1 bg-coc-bg-primary border border-coc-border rounded px-3 py-2 text-sm text-coc-parchment placeholder:text-coc-text-muted focus:border-coc-gold focus:outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="coc-btn-secondary flex items-center gap-1 text-sm px-3 py-2"
              >
                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                搜索
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between bg-coc-bg-primary border border-coc-border rounded px-3 py-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-coc-parchment">{u.nickname}</span>
                      <span className="font-mono text-[10px] text-coc-gold">#{String(u.displayId).padStart(8, '0')}</span>
                    </div>
                    <div className="text-xs text-coc-text-muted">{u.email}</div>
                  </div>
                  <button
                    onClick={() => handleAppoint(u.id, u.nickname)}
                    disabled={appointing}
                    className="coc-btn-primary text-xs px-3 py-1.5"
                  >
                    {appointing ? '任命中...' : '任命'}
                  </button>
                </div>
              ))}
              {!searching && searchResults.length === 0 && search.trim() && (
                <div className="text-xs text-coc-text-muted text-center py-4">未找到匹配用户</div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
