import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/auth.store';

export function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    nickname: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || '注册失败');
      }

      setAuth(data.data.user, data.data.token);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center coc-bg-abyss relative overflow-hidden">
      {/* 主卡片 */}
      <div className="relative w-full max-w-md mx-4">
        <div className="relative border border-coc-void/80 rounded-lg p-8 
                        backdrop-blur-md bg-black/40 shadow-2xl">
          {/* 顶部符文装饰 */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-30">
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-coc-madness"></div>
            <div className="w-2 h-2 rotate-45 border border-coc-madness"></div>
            <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-coc-madness"></div>
          </div>

          {/* Logo 区域 */}
          <div className="text-center mb-10 pt-4">
            {/* 用 logo 素材替换 */}
            <div className="relative inline-block mb-6">
              <img
                src="/logo.png"
                alt="沉没之城"
                className="w-64 h-auto mx-auto drop-shadow-[0_0_12px_rgba(201,162,39,0.4)]"
                onError={(e) => {
                  // 如果 logo 加载失败，回退到文字
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden">
                {/* 召唤符号 */}
                <div className="relative inline-block mb-6">
                  <div className="text-5xl animate-breathe">
                    ⚜️
                  </div>
                  <div className="absolute -inset-4 bg-coc-madness/10 rounded-full blur-xl opacity-0 
                                  group-hover:opacity-100 transition-opacity"></div>
                </div>
                
                {/* 标题 */}
                <h1 className="text-4xl font-ritual font-bold coc-text-metal mb-3 tracking-widest">
                  沉没之城
                </h1>
                
                <p className="text-sm font-rune text-coc-parchment-faded tracking-[0.3em] uppercase mb-1">
                  Sunken City
                </p>            
                <p className="text-xs text-coc-madness/60 font-rune tracking-wider">
                  v1.1 · 深渊凝视
                </p>
              </div>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-4 bg-coc-madness/10 border border-coc-madness/30 rounded 
                            text-coc-madness-glow text-sm text-center animate-madness-flicker">
              <span className="font-rune">⚠ {error}</span>
            </div>
          )}

          {/* 表单 */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="relative">
              <label className="block text-xs font-rune text-coc-parchment-dim mb-2 tracking-wider">
                灵魂印记 / EMAIL
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full coc-input"
                required
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-rune text-coc-parchment-dim mb-2 tracking-wider">
                真名 / NAME
              </label>
              <input
                type="text"
                placeholder="你的调查员代号"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                className="w-full coc-input"
                required
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-rune text-coc-parchment-dim mb-2 tracking-wider">
                深渊密语 / PASSWORD
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full coc-input"
                required
                minLength={6}
              />
              <p className="mt-1 text-xs text-coc-parchment-faded">
                至少6个字符，建议使用难以被窥视的组合
              </p>
            </div>

            <button 
              type="submit" 
              className="w-full coc-btn-gold mt-8 group"
              disabled={loading}
            >
              <span className="relative z-10">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-coc-abyss/30 border-t-coc-abyss 
                                     rounded-full animate-spin"></span>
                    缔结契约...
                  </span>
                ) : (
                  '接受召唤'
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-coc-gold via-coc-gold-glow to-coc-gold 
                              opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </button>
          </form>

          {/* 底部链接 */}
          <div className="mt-8 pt-6 border-t border-coc-void text-center">
            <p className="text-sm text-coc-parchment-dim">
              已接受召唤？
              <a href="/login" 
                 className="ml-2 text-coc-gold hover:text-coc-gold-glow transition-colors 
                            font-ritual tracking-wide"
              >
                揭开帷幕
              </a>
            </p>
          </div>

          {/* 底部符文装饰 */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-20">
            <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-coc-parchment-faded"></div>
            <div className="text-coc-parchment-faded text-xs font-rune">✦</div>
            <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-coc-parchment-faded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
