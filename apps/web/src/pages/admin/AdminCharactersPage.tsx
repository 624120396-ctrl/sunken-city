import { useState, useEffect } from 'react';
import { Search, Trash2, UserCircle, AlertTriangle } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { Modal } from '@components/ui/Modal';

interface Character {
  id: string;
  name: string;
  occupation: string;
  age: number;
  hp: number;
  mp: number;
  san: number;
  createdAt: string;
  user: {
    id: string;
    nickname: string;
    email: string;
  };
}

export function AdminCharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchCharacters();
  }, [page, search]);

  const fetchCharacters = async () => {
    try {
      const response = await apiFetch(`/admin/characters?page=${page}&limit=10&search=${encodeURIComponent(search)}`);
      const data = await handleApiResponse<{ 
        characters: Character[];
        pagination: { totalPages: number };
      }>(response);
      setCharacters(data.characters);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('获取角色卡列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCharacter) return;
    
    try {
      const response = await apiFetch(`/admin/characters/${selectedCharacter.id}`, {
        method: 'DELETE',
      });
      await handleApiResponse(response);
      setShowDeleteModal(false);
      setSelectedCharacter(null);
      fetchCharacters();
    } catch (error: any) {
      alert(error.message || '删除失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-coc-accent-red border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-serif font-bold mb-6">角色卡管理</h1>

      {/* 搜索 */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-coc-text-muted" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜索角色名或职业..."
            className="w-full coc-input pl-10"
          />
        </div>
      </div>

      {/* 角色卡列表 */}
      <div className="coc-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-coc-bg-tertiary">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-coc-text-secondary">角色</th>
              <th className="text-left p-4 text-sm font-medium text-coc-text-secondary">属性</th>
              <th className="text-left p-4 text-sm font-medium text-coc-text-secondary">所属用户</th>
              <th className="text-left p-4 text-sm font-medium text-coc-text-secondary">创建时间</th>
              <th className="text-right p-4 text-sm font-medium text-coc-text-secondary">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-coc-border">
            {characters.map((char) => (
              <tr key={char.id} className="hover:bg-coc-bg-tertiary/50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-coc-accent-gold/20 flex items-center justify-center text-coc-accent-gold font-bold">
                      {char.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{char.name}</div>
                      <div className="text-sm text-coc-text-muted">{char.occupation} · {char.age}岁</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex gap-3 text-sm">
                    <span className="text-coc-accent-red">HP:{char.hp}</span>
                    <span className="text-coc-accent-cyan">MP:{char.mp}</span>
                    <span className="text-coc-accent-gold">SAN:{char.san}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <UserCircle size={16} className="text-coc-text-muted" />
                    <span>{char.user.nickname}</span>
                  </div>
                  <div className="text-xs text-coc-text-muted">{char.user.email}</div>
                </td>
                <td className="p-4 text-sm text-coc-text-secondary">
                  {new Date(char.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedCharacter(char);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 text-coc-text-muted hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                      title="删除角色卡"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {characters.length === 0 && (
          <div className="text-center py-12 text-coc-text-muted">
            没有找到角色卡
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="coc-btn-secondary disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-coc-text-secondary">
            第 {page} / {totalPages} 页
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="coc-btn-secondary disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}

      {/* 删除确认弹窗 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedCharacter(null);
        }}
        title="确认删除角色卡"
      >
        <div className="text-center py-4">
          <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
          <p className="text-coc-text-secondary mb-2">
            确定要删除角色卡 <strong>{selectedCharacter?.name}</strong> 吗？
          </p>
          <p className="text-sm text-red-400">
            此操作不可撤销。
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedCharacter(null);
              }}
              className="coc-btn-secondary flex-1"
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              className="coc-btn-primary flex-1 bg-red-600 hover:bg-red-700"
            >
              确认删除
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
