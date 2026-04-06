import { useState, useEffect } from 'react';
import { Save, Globe, Wrench, Shield, Users } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  maxCharactersPerUser: number;
  maxRoomsPerUser: number;
}

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    siteName: 'COC跑团平台',
    siteDescription: '克苏鲁的呼唤在线跑团平台',
    maintenanceMode: false,
    allowRegistration: true,
    maxCharactersPerUser: 10,
    maxRoomsPerUser: 5,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await apiFetch('/admin/settings');
      const data = await handleApiResponse<{ settings: SystemSettings }>(response);
      setSettings(data.settings);
    } catch (error) {
      console.error('获取设置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await apiFetch('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      await handleApiResponse(response);
      setMessage({ type: 'success', text: '设置已保存' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '保存失败' });
    } finally {
      setSaving(false);
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
      <h1 className="text-2xl font-serif font-bold mb-6">系统设置</h1>

      {message && (
        <div className={`coc-card mb-6 ${
          message.type === 'success' ? 'border-l-4 border-green-400' : 'border-l-4 border-red-400'
        }`}>
          <p className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>
            {message.text}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* 网站信息 */}
        <div className="coc-card">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={18} className="text-coc-accent-cyan" />
            <h2 className="font-bold">网站信息</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-coc-text-secondary mb-1">
                网站名称
              </label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="w-full coc-input"
                maxLength={100}
              />
            </div>
            
            <div>
              <label className="block text-sm text-coc-text-secondary mb-1">
                网站描述
              </label>
              <textarea
                value={settings.siteDescription}
                onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                className="w-full coc-input min-h-[80px]"
                maxLength={500}
              />
            </div>
          </div>
        </div>

        {/* 系统模式 */}
        <div className="coc-card">
          <div className="flex items-center gap-2 mb-4">
            <Wrench size={18} className="text-coc-accent-gold" />
            <h2 className="font-bold">系统模式</h2>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 bg-coc-bg-tertiary rounded cursor-pointer">
              <div>
                <div className="font-medium">维护模式</div>
                <div className="text-sm text-coc-text-muted">开启后普通用户无法访问</div>
              </div>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="w-5 h-5 accent-coc-accent-red"
              />
            </label>
            
            <label className="flex items-center justify-between p-3 bg-coc-bg-tertiary rounded cursor-pointer">
              <div>
                <div className="font-medium">允许注册</div>
                <div className="text-sm text-coc-text-muted">关闭后新用户无法注册</div>
              </div>
              <input
                type="checkbox"
                checked={settings.allowRegistration}
                onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                className="w-5 h-5 accent-coc-accent-red"
              />
            </label>
          </div>
        </div>

        {/* 用户限制 */}
        <div className="coc-card">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-purple-400" />
            <h2 className="font-bold">用户限制</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-coc-text-secondary mb-1">
                每个用户最多角色卡数
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={settings.maxCharactersPerUser}
                onChange={(e) => setSettings({ ...settings, maxCharactersPerUser: parseInt(e.target.value) || 1 })}
                className="w-full coc-input"
              />
            </div>
            
            <div>
              <label className="block text-sm text-coc-text-secondary mb-1">
                每个用户最多房间数
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={settings.maxRoomsPerUser}
                onChange={(e) => setSettings({ ...settings, maxRoomsPerUser: parseInt(e.target.value) || 1 })}
                className="w-full coc-input"
              />
            </div>
          </div>
        </div>

        {/* 管理员信息 */}
        <div className="coc-card">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-coc-accent-red" />
            <h2 className="font-bold">管理员信息</h2>
          </div>
          
          <div className="p-4 bg-coc-bg-tertiary rounded">
            <p className="text-sm text-coc-text-secondary">
              当前设置仅在内存中生效，重启服务器后会重置为环境变量值。
            </p>
            <p className="text-sm text-coc-text-muted mt-2">
              如需永久保存设置，请在服务器环境变量中配置。
            </p>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="coc-btn-primary flex items-center gap-2"
          >
            <Save size={18} />
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}
