import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/auth.store';
import { getAuthSubmitLabel } from '@components/auth/authPortalMeta';

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
    <div className="auth-portal">
      <div className="auth-portal__card">
          <div className="auth-portal__brand">
            <img src="/logo.png" alt="沉没之城" />
            <h1 className="sr-only">沉没之城</h1>
          </div>

          {error && (
            <div className="auth-portal__notice" data-kind="error">
              <span>{error}</span>
            </div>
          )}

          <form className="auth-portal__form" onSubmit={handleSubmit}>
            <div className="auth-portal__field">
              <label>
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

            <div className="auth-portal__field">
              <label>
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

            <div className="auth-portal__field">
              <label>
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
              className="auth-portal__submit"
              data-mode="register"
              disabled={loading}
            >
              {getAuthSubmitLabel({ mode: 'register', loading })}
            </button>
          </form>

          <div className="auth-portal__footer">
            <p>
              已接受召唤？
              <a href="/login" 
              >
                揭开帷幕
              </a>
            </p>
          </div>
      </div>
    </div>
  );
}
