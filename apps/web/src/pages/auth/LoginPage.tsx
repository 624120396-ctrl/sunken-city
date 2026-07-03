import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@stores/auth.store';
import { getAuthSubmitLabel } from '@components/auth/authPortalMeta';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expiredNotice, setExpiredNotice] = useState(false);

  // 检测是否因令牌过期被重定向
  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      setExpiredNotice(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || '登录失败');
      }

      setAuth(data.data.user, data.data.token);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
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

          {expiredNotice && (
            <div className="auth-portal__notice">
              <span>你的会话已过期，请重新登录</span>
            </div>
          )}

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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full coc-input"
                required
              />
            </div>

            <button 
              type="submit" 
              className="auth-portal__submit"
              data-mode="login"
              disabled={loading}
            >
              {getAuthSubmitLabel({ mode: 'login', loading })}
            </button>
          </form>

          <div className="auth-portal__footer">
            <p>
              尚未获得召唤？
              <a href="/register" 
              >
                接受仪式
              </a>
            </p>
          </div>
      </div>
    </div>
  );
}
