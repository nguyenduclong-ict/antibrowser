import React, { useState, useEffect } from 'react';
import { NodeSidecarBridge, ChromiumStatus } from '../lib/bridge/NodeSidecarBridge';
import { theme } from '../styles/theme';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  CheckCircle2
} from 'lucide-react';

interface SystemSettingsManagerProps {
  bridge: NodeSidecarBridge;
  addLog: (msg: string) => void;
}

export function SystemSettingsManager({ bridge, addLog }: SystemSettingsManagerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [defaultCacheDir, setDefaultCacheDir] = useState('');

  // Chromium states
  const [chromiumStatus, setChromiumStatus] = useState<ChromiumStatus | null>(null);
  const [chromiumLoading, setChromiumLoading] = useState(true);
  const [localDownload, setLocalDownload] = useState<{
    status: 'Idle' | 'Downloading' | 'Extracting' | 'Installed' | 'Error';
    progress: number;
    message?: string;
  }>({ status: 'Idle', progress: 0 });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await bridge.getSettings();
      setLanguage(res.language);
      setThemeMode(res.theme);
      setDefaultCacheDir(res.defaultCacheDir);
    } catch (err: any) {
      console.error(err);
      addLog('Lỗi tải cài đặt hệ thống từ sidecar.');
    } finally {
      setLoading(false);
    }
  };

  const fetchChromiumStatus = async () => {
    setChromiumLoading(true);
    try {
      const status = await bridge.getChromiumStatus();
      setChromiumStatus(status);
    } catch (err) {
      console.error('Lỗi tải trạng thái Chromium:', err);
      addLog('Lỗi kiểm tra trạng thái nhân Chromium.');
    } finally {
      setChromiumLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    fetchChromiumStatus();

    // Lắng nghe sự kiện socket để hiển thị tiến độ tải tại chỗ
    bridge.on('chromium:download-status', (data: { status: any; message: string }) => {
      setLocalDownload(prev => ({
        ...prev,
        status: data.status,
        message: data.message
      }));
      
      if (data.status === 'Installed' || data.status === 'Idle') {
        fetchChromiumStatus();
        setTimeout(() => {
          setLocalDownload(prev => ({ ...prev, status: 'Idle', progress: 0, message: '' }));
        }, 3000);
      }
    });

    bridge.on('chromium:download-progress', (data: { progress: number }) => {
      setLocalDownload(prev => ({
        ...prev,
        status: 'Downloading',
        progress: data.progress
      }));
    });

    return () => {
      bridge.off('chromium:download-status', () => {});
      bridge.off('chromium:download-progress', () => {});
    };
  }, []);

  const handleDownloadChromium = async () => {
    addLog('Bắt đầu gửi yêu cầu tải nhân Chromium Stealth...');
    try {
      setLocalDownload({ status: 'Downloading', progress: 0, message: 'Đang gửi yêu cầu tải...' });
      const res = await bridge.downloadChromium();
      if (res.success) {
        addLog('Đã kích hoạt tiến trình tải Chromium ngầm thành công.');
      }
    } catch (err: any) {
      console.error(err);
      addLog(`Lỗi kích hoạt tải Chromium: ${err.message}`);
      setLocalDownload({ status: 'Error', progress: 0, message: err.message });
    }
  };

  const handleClearChromiumCache = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhân Chromium Stealth? Hệ thống sẽ cần tải lại Chromium ở lần chạy tiếp theo.')) return;
    
    addLog('Đang xóa cache nhân Chromium...');
    try {
      const res = await bridge.clearChromiumCache();
      if (res.success) {
        addLog('Đã xóa thành công nhân Chromium.');
        fetchChromiumStatus();
      }
    } catch (err: any) {
      console.error(err);
      addLog(`Lỗi xóa nhân Chromium: ${err.message}`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    addLog('Đang cập nhật cài đặt hệ thống...');
    try {
      await bridge.updateSettings({
        language,
        theme: themeMode,
        defaultCacheDir,
      });
      setSuccessMsg('Đã lưu cài đặt hệ thống thành công!');
      addLog('Cập nhật cài đặt hệ thống thành công.');
      
      // Tự động tắt thông báo thành công sau 3 giây
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      addLog(`Lỗi lưu cài đặt: ${err.message}`);
      alert(`Lỗi lưu cài đặt: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h2 style={styles.mainTitle}>Cài Đặt Hệ Thống</h2>
          <p style={styles.mainSubtitle}>Quản lý môi trường hoạt động cục bộ, ngôn ngữ giao diện và thư mục lưu trữ dữ liệu</p>
        </div>
      </header>

      {loading ? (
        <div style={styles.loadingState}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: theme.colors.accent }} />
          <div style={{ marginTop: '10px' }}>Đang tải cài đặt hệ thống...</div>
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} style={styles.formCard}>
          <h3 style={styles.cardTitle}>
            <Settings size={18} style={{ marginRight: '8px', display: 'inline', verticalAlign: 'middle', color: theme.colors.accent }} />
            Cấu hình tham số hệ thống
          </h3>

          {successMsg && (
            <div style={styles.successAlert}>
              <CheckCircle2 size={16} style={{ marginRight: '8px' }} />
              {successMsg}
            </div>
          )}

          <div style={styles.formBody}>
            {/* Chọn Ngôn Ngữ */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Ngôn ngữ Giao diện</label>
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value as any)} 
                style={styles.select}
              >
                <option value="vi">Tiếng Việt (Vietnamese)</option>
                <option value="en">Tiếng Anh (English)</option>
              </select>
              <span style={styles.helperText}>Ngôn ngữ hiển thị chính trên ứng dụng điều khiển.</span>
            </div>

            {/* Chọn Theme */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Giao diện đồ họa (Theme)</label>
              <select 
                value={themeMode} 
                onChange={(e) => setThemeMode(e.target.value as any)} 
                style={styles.select}
              >
                <option value="dark">Sleek Dark Mode (Chế độ tối)</option>
                <option value="light">Premium Light Mode (Chế độ sáng)</option>
              </select>
              <span style={styles.helperText}>Màu sắc giao diện Dashboard.</span>
            </div>

            {/* Thư mục Cache mặc định */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Thư mục lưu trữ cache trình duyệt mặc định</label>
              <div style={styles.directoryInputWrapper}>
                <input 
                  type="text" 
                  value={defaultCacheDir} 
                  onChange={(e) => setDefaultCacheDir(e.target.value)} 
                  style={styles.input} 
                  required
                />
              </div>
              <span style={styles.helperText}>Nơi lưu trữ cookie, cache, localstorage của các Profile. Nên dùng đường dẫn cục bộ tốc độ cao (SSD).</span>
            </div>

            {/* Quản lý Nhân Trình Duyệt Chromium Stealth */}
            <div style={styles.chromiumCard}>
              <h4 style={styles.runtimeTitle}>Quản Lý Nhân Trình Duyệt Chromium Stealth</h4>
              
              {chromiumLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.colors.textSecondary, fontSize: '13px', padding: '10px 0' }}>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', color: theme.colors.accent }} />
                  <span>Đang tải thông tin nhân trình duyệt...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={styles.infoGrid}>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Trạng thái cài đặt:</span>
                      <span style={chromiumStatus?.installed ? { color: theme.colors.success, fontWeight: 600 } : { color: theme.colors.danger, fontWeight: 600 }}>
                        {chromiumStatus?.installed ? 'Đã Cài Đặt (Sẵn Sàng)' : 'Chưa Cài Đặt'}
                      </span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Phiên bản nhân:</span>
                      <span style={styles.infoValue}>{chromiumStatus?.version || 'N/A'}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Platform Tag:</span>
                      <span style={styles.infoValue}>{chromiumStatus?.platform || 'N/A'}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Thư mục Cache nhân:</span>
                      <span 
                        style={{ ...styles.infoValue, fontSize: '11px', wordBreak: 'break-all', maxWidth: '240px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} 
                        title={chromiumStatus?.cacheDir}
                      >
                        {chromiumStatus?.cacheDir || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Tiến độ tải Chromium nội bộ */}
                  {localDownload.status !== 'Idle' && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: `1px solid ${theme.colors.border}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                        <span style={{ color: localDownload.status === 'Error' ? theme.colors.danger : theme.colors.accent }}>
                          {localDownload.status === 'Downloading' && 'Đang tải file (~120MB)...'}
                          {localDownload.status === 'Extracting' && 'Đang giải nén...'}
                          {localDownload.status === 'Installed' && 'Cài đặt thành công!'}
                          {localDownload.status === 'Error' && 'Lỗi cài đặt.'}
                        </span>
                        <span>{localDownload.progress}%</span>
                      </div>
                      {(localDownload.status === 'Downloading' || localDownload.status === 'Extracting') && (
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${localDownload.progress}%`, background: theme.colors.accent, transition: 'width 0.3s' }} />
                        </div>
                      )}
                      {localDownload.status === 'Error' && (
                        <span style={{ fontSize: '11px', color: theme.colors.danger }}>{localDownload.message}</span>
                      )}
                    </div>
                  )}

                  {/* Nút hành động */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                    {!chromiumStatus?.installed && localDownload.status === 'Idle' && (
                      <button
                        type="button"
                        onClick={handleDownloadChromium}
                        style={styles.btnActionPrimary}
                      >
                        Tải Nhân Trình Duyệt Stealth
                      </button>
                    )}
                    {chromiumStatus?.installed && (
                      <>
                        <button
                          type="button"
                          onClick={handleClearChromiumCache}
                          style={styles.btnActionDanger}
                        >
                          Xóa Nhân Trình Duyệt
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadChromium}
                          style={styles.btnActionSecondary}
                          disabled={localDownload.status !== 'Idle'}
                        >
                          Cập nhật / Tải lại
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Thông tin Môi trường Runtime */}
            <div style={styles.runtimeInfoCard}>
              <h4 style={styles.runtimeTitle}>Thông tin Môi trường Runtime</h4>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Node.js Portable Version:</span>
                  <span style={styles.infoValue}>v22.11.0</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Tauri Core Version:</span>
                  <span style={styles.infoValue}>v2.0.0 (Rust)</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Stealth Browser Engine:</span>
                  <span style={styles.infoValue}>CloakBrowser Chromium v0.3.30</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Database Engine:</span>
                  <span style={styles.infoValue}>JSON Local database</span>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.formFooter}>
            <button 
              type="submit" 
              style={saving ? { ...styles.btnSave, opacity: 0.7, cursor: 'not-allowed' } : styles.btnSave}
              disabled={saving}
            >
              <Save size={14} style={{ marginRight: '6px' }} />
              {saving ? 'Đang lưu cài đặt...' : 'Lưu Thay Đổi Cài Đặt'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainTitle: {
    margin: '0 0 5px 0',
    fontSize: '22px',
    fontWeight: 700,
    color: theme.colors.textPrimary,
  },
  mainSubtitle: {
    margin: 0,
    fontSize: '13px',
    color: theme.colors.textSecondary,
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60px 0',
    color: theme.colors.textSecondary,
  },
  formCard: {
    background: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  cardTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 700,
    color: theme.colors.textPrimary,
  },
  successAlert: {
    background: theme.colors.successBg,
    border: `1px solid ${theme.colors.successBorder}`,
    color: theme.colors.success,
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    fontWeight: 600,
  },
  formBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.input,
    padding: '10px 14px',
    color: theme.colors.textPrimary,
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    background: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.input,
    padding: '10px 14px',
    color: theme.colors.textPrimary,
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
    width: '100%',
  },
  directoryInputWrapper: {
    display: 'flex',
    gap: '10px',
  },
  helperText: {
    fontSize: '11px',
    color: theme.colors.textMuted,
    lineHeight: '1.4',
  },
  runtimeInfoCard: {
    background: 'rgba(255, 255, 255, 0.01)',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '12px',
    padding: '16px 20px',
    marginTop: '10px',
  },
  chromiumCard: {
    background: 'rgba(255, 255, 255, 0.01)',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '12px',
    padding: '20px',
    marginTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  btnActionPrimary: {
    background: theme.colors.accent,
    color: theme.colors.textPrimary,
    border: 'none',
    padding: '8px 16px',
    borderRadius: theme.radius.button,
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnActionSecondary: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.textPrimary,
    padding: '8px 16px',
    borderRadius: theme.radius.button,
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnActionDanger: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: `1px solid rgba(239, 68, 68, 0.2)`,
    color: theme.colors.danger,
    padding: '8px 16px',
    borderRadius: theme.radius.button,
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  runtimeTitle: {
    margin: '0 0 12px 0',
    fontSize: '13px',
    fontWeight: 700,
    color: theme.colors.textPrimary,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px 30px',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
    paddingBottom: '6px',
  },
  infoLabel: {
    color: theme.colors.textSecondary,
  },
  infoValue: {
    color: theme.colors.accent,
    fontWeight: 600,
  },
  formFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    borderTop: `1px solid ${theme.colors.border}`,
    paddingTop: '20px',
  },
  btnSave: {
    background: theme.colors.accent,
    color: theme.colors.textPrimary,
    border: 'none',
    padding: '10px 24px',
    borderRadius: theme.radius.button,
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
};
