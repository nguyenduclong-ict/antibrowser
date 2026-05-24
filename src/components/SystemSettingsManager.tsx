import React, { useState, useEffect } from 'react';
import { NodeSidecarBridge } from '../lib/bridge/NodeSidecarBridge';
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

  useEffect(() => {
    loadSettings();
  }, []);

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
