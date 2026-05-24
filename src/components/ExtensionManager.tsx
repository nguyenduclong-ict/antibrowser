import React, { useState, useEffect, useRef } from 'react';
import { NodeSidecarBridge, ExtensionEntry } from '../lib/bridge/NodeSidecarBridge';
import { theme } from '../styles/theme';
import { 
  UploadCloud, 
  Trash2, 
  Puzzle, 
  RefreshCw, 
  CheckCircle2
} from 'lucide-react';

interface ExtensionManagerProps {
  bridge: NodeSidecarBridge;
  addLog: (msg: string) => void;
}

export function ExtensionManager({ bridge, addLog }: ExtensionManagerProps) {
  const [extensions, setExtensions] = useState<ExtensionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadExtensions = async () => {
    setLoading(true);
    try {
      const list = await bridge.getExtensions();
      setExtensions(list);
    } catch (err: any) {
      console.error(err);
      addLog('Lỗi tải danh sách extensions từ sidecar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExtensions();
  }, []);

  // Xóa extension
  const handleDeleteExtension = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tiện ích mở rộng "${name}"? Thao tác này sẽ xóa sạch thư mục nguồn của tiện ích này trên máy!`)) return;
    
    try {
      const res = await bridge.deleteExtension(id);
      if (res.success) {
        setExtensions((prev) => prev.filter((e) => e.id !== id));
        addLog(`Đã xóa tiện ích mở rộng "${name}".`);
      }
    } catch (err: any) {
      addLog(`Lỗi khi xóa tiện ích: ${err.message}`);
    }
  };

  // Upload file ZIP extension
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      alert('Vui lòng chọn file nén định dạng .zip của Chrome Extension!');
      return;
    }

    setUploading(true);
    addLog(`Đang tải lên và cài đặt tiện ích mở rộng: ${file.name}...`);
    try {
      const newExt = await bridge.uploadExtension(file);
      setExtensions((prev) => [newExt, ...prev]);
      addLog(`Đã cài đặt thành công tiện ích: "${newExt.name}" v${newExt.version}`);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message;
      alert(`Không thể cài đặt tiện ích: ${errMsg}`);
      addLog(`Cài đặt tiện ích thất bại: ${errMsg}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h2 style={styles.mainTitle}>Quản Lý Tiện Ích Mở Rộng (Chrome Extensions)</h2>
          <p style={styles.mainSubtitle}>Upload các tiện ích Chrome dạng ZIP để tự động nạp vào các Profile trình duyệt khi khởi chạy</p>
        </div>
        <div style={styles.headerActions}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".zip" 
            style={{ display: 'none' }} 
          />
          <button 
            style={uploading ? { ...styles.btnUpload, opacity: 0.7, cursor: 'not-allowed' } : styles.btnUpload} 
            onClick={handleUploadClick}
            disabled={uploading}
          >
            {uploading ? (
              <RefreshCw size={14} style={{ marginRight: '6px', animation: 'spin 1s linear infinite' }} />
            ) : (
              <UploadCloud size={14} style={{ marginRight: '6px' }} />
            )}
            {uploading ? 'Đang giải nén...' : 'Tải Lên Extension (.ZIP)'}
          </button>
        </div>
      </header>

      {/* Guide Alert */}
      <div style={styles.guideCard}>
        <Puzzle size={18} style={{ color: theme.colors.accent, flexShrink: 0 }} />
        <div style={styles.guideText}>
          <strong>Hướng dẫn sử dụng:</strong> Hãy tải về extension của Chrome dưới dạng file `.zip` (bạn có thể dùng các trang web tải CRX/ZIP từ Chrome Web Store), sau đó click nút tải lên ở trên. Hệ thống sẽ tự động giải nén cô lập và quản lý. Khi tạo Profile mới, bạn có thể tích chọn để nạp extension này.
        </div>
      </div>

      {/* Extensions Grid */}
      <section style={styles.gridSection}>
        {loading ? (
          <div style={styles.loadingState}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: theme.colors.accent }} />
            <div style={{ marginTop: '10px' }}>Đang tải danh sách tiện ích mở rộng...</div>
          </div>
        ) : extensions.length > 0 ? (
          <div style={styles.grid}>
            {extensions.map((ext) => (
              <div key={ext.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.extIconWrapper}>
                    <Puzzle size={22} style={{ color: theme.colors.accent }} />
                  </div>
                  <div style={styles.extMeta}>
                    <h3 style={styles.extName} title={ext.name}>{ext.name}</h3>
                    <span style={styles.extVersion}>Version {ext.version}</span>
                  </div>
                </div>
                
                <div style={styles.cardBody}>
                  <div style={styles.infoLine}>
                    <span style={styles.infoLabel}>Mã tiện ích:</span>
                    <span style={styles.infoValue} title={ext.id}>#{ext.id.substring(0, 8)}...</span>
                  </div>
                  <div style={styles.infoLine}>
                    <span style={styles.infoLabel}>Đường dẫn lưu:</span>
                    <span style={styles.infoValue} title={ext.localPath}>Local Folder</span>
                  </div>
                  <div style={styles.infoLine}>
                    <span style={styles.infoLabel}>Ngày cài:</span>
                    <span style={styles.infoValue}>{new Date(ext.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={styles.cardFooter}>
                  <span style={styles.statusBadgeActive}>
                    <CheckCircle2 size={12} style={{ marginRight: '4px' }} />
                    Sẵn sàng
                  </span>
                  <button 
                    style={styles.btnDelete} 
                    onClick={() => handleDeleteExtension(ext.id, ext.name)}
                    title="Xóa tiện ích"
                  >
                    <Trash2 size={14} style={{ marginRight: '4px' }} />
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <Puzzle size={48} style={{ color: theme.colors.textMuted, marginBottom: '15px' }} />
            <div>Chưa có tiện ích mở rộng (Chrome Extensions) nào được cài đặt.</div>
            <button style={styles.btnUploadEmpty} onClick={handleUploadClick}>
              Cài Đặt Tiện Ích Đầu Tiên
            </button>
          </div>
        )}
      </section>
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
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  btnUpload: {
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
  guideCard: {
    background: 'rgba(79, 70, 229, 0.04)',
    border: `1px solid rgba(79, 70, 229, 0.15)`,
    borderRadius: '12px',
    padding: '16px 20px',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  guideText: {
    fontSize: '12px',
    color: theme.colors.textSecondary,
    lineHeight: '1.5',
  },
  gridSection: {
    minHeight: '200px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  card: {
    background: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: `1px solid ${theme.colors.border}`,
    paddingBottom: '12px',
  },
  extIconWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: 'rgba(79, 70, 229, 0.08)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  extMeta: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  extName: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 700,
    color: theme.colors.textPrimary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  extVersion: {
    fontSize: '11px',
    color: theme.colors.textSecondary,
    marginTop: '2px',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  infoLine: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
  },
  infoLabel: {
    color: theme.colors.textSecondary,
  },
  infoValue: {
    color: theme.colors.textPrimary,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '150px',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: `1px solid ${theme.colors.border}`,
    paddingTop: '12px',
    marginTop: '5px',
  },
  statusBadgeActive: {
    color: theme.colors.success,
    background: theme.colors.successBg,
    border: `1px solid ${theme.colors.successBorder}`,
    fontSize: '11px',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '8px',
    display: 'inline-flex',
    alignItems: 'center',
  },
  btnDelete: {
    background: 'none',
    border: 'none',
    color: theme.colors.danger,
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'background 0.2s',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60px 0',
    color: theme.colors.textSecondary,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '80px 40px',
    color: theme.colors.textSecondary,
    background: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '16px',
    fontSize: '14px',
  },
  btnUploadEmpty: {
    background: theme.colors.accent,
    color: theme.colors.textPrimary,
    border: 'none',
    padding: '10px 20px',
    borderRadius: theme.radius.button,
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '20px',
  },
};
