import React, { useState, useEffect } from 'react';
import { BrowserProfile, NodeSidecarBridge, ProxyEntry, ExtensionEntry } from '../lib/bridge/NodeSidecarBridge';
import { theme } from '../styles/theme';
import { 
  X, 
  Save, 
  Sliders, 
  Globe, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  Dice5,
  RefreshCw
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profileData: Omit<BrowserProfile, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  profile: BrowserProfile | null; // Null nghĩa là tạo mới, khác null nghĩa là chỉnh sửa
  bridge: NodeSidecarBridge;
}

const COMMON_RESOLUTIONS = [
  { label: '1920 x 1080 (Full HD)', w: 1920, h: 1080 },
  { label: '1920 x 947 (Maximized Chrome 1080p)', w: 1920, h: 947 },
  { label: '1440 x 900 (Macbook Air 13")', w: 1440, h: 900 },
  { label: '1366 x 768 (Laptop HD)', w: 1366, h: 768 },
  { label: '1280 x 720 (Standard HD)', w: 1280, h: 720 },
];

const TIMEZONES = [
  { label: 'Automatic (GeoIP Proxy)', value: 'auto' },
  { label: 'Asia/Ho_Chi_Minh (Vietnam)', value: 'Asia/Ho_Chi_Minh' },
  { label: 'America/New_York (US Eastern)', value: 'America/New_York' },
  { label: 'America/Los_Angeles (US Western)', value: 'America/Los_Angeles' },
  { label: 'Europe/London (UK)', value: 'Europe/London' },
  { label: 'Europe/Paris (France)', value: 'Europe/Paris' },
  { label: 'Asia/Singapore', value: 'Asia/Singapore' },
  { label: 'Asia/Tokyo (Japan)', value: 'Asia/Tokyo' },
];

const LOCALES = [
  { label: 'Automatic (GeoIP Proxy)', value: 'auto' },
  { label: 'vi-VN (Tiếng Việt)', value: 'vi-VN' },
  { label: 'en-US (Tiếng Anh - Mỹ)', value: 'en-US' },
  { label: 'en-GB (Tiếng Anh - Anh)', value: 'en-GB' },
  { label: 'zh-CN (Tiếng Trung)', value: 'zh-CN' },
  { label: 'ja-JP (Tiếng Nhật)', value: 'ja-JP' },
  { label: 'ru-RU (Tiếng Nga)', value: 'ru-RU' },
];

export function ProfileModal({ isOpen, onClose, onSave, profile, bridge }: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'proxy' | 'fingerprint'>('general');
  
  // States của Form
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<'windows' | 'macos'>('windows');
  const [proxyType, setProxyType] = useState<'none' | 'http' | 'socks5'>('none');
  const [proxyHost, setProxyHost] = useState('');
  const [proxyPort, setProxyPort] = useState(8080);
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');
  const [webrtc, setWebrtc] = useState<'auto' | 'default' | string>('auto');
  const [seed, setSeed] = useState('');
  const [cpuCores, setCpuCores] = useState(8);
  const [deviceMemory, setDeviceMemory] = useState(8);
  const [viewportWidth, setViewportWidth] = useState(1920);
  const [viewportHeight, setViewportHeight] = useState(947);
  const [timezone, setTimezone] = useState('auto');
  const [locale, setLocale] = useState('auto');
  const [storageQuota, setStorageQuota] = useState<number | undefined>(5000);
  const [humanize, setHumanize] = useState(true);
  const [humanPreset, setHumanPreset] = useState<'default' | 'careful'>('default');

  // Trạng thái kiểm tra Proxy
  const [proxyChecking, setProxyChecking] = useState(false);
  const [proxyCheckResult, setProxyCheckResult] = useState<{ status: 'idle' | 'live' | 'dead'; ip?: string; country?: string; error?: string }>({ status: 'idle' });

  // State lưu danh sách Proxy tập trung
  const [savedProxies, setSavedProxies] = useState<ProxyEntry[]>([]);
  const [selectedProxyId, setSelectedProxyId] = useState<string>('');
  const [availableExtensions, setAvailableExtensions] = useState<ExtensionEntry[]>([]);
  const [selectedExtensionIds, setSelectedExtensionIds] = useState<string[]>([]);

  // States vân tay nâng cao
  const [canvasNoise, setCanvasNoise] = useState(true);
  const [webglNoise, setWebglNoise] = useState(true);
  const [audioNoise, setAudioNoise] = useState(true);
  const [clientRectsNoise, setClientRectsNoise] = useState(true);
  const [geolocationMode, setGeolocationMode] = useState<'auto' | 'custom' | 'block'>('auto');
  const [latitude, setLatitude] = useState(10.762622);
  const [longitude, setLongitude] = useState(106.660172);
  const [accuracy, setAccuracy] = useState(10);

  // Load thông tin profile khi mở modal chỉnh sửa
  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setPlatform(profile.platform);
      setProxyType(profile.proxyType);
      setProxyHost(profile.proxyHost);
      setProxyPort(profile.proxyPort);
      setProxyUsername(profile.proxyUsername || '');
      setProxyPassword(profile.proxyPassword || '');
      setWebrtc(profile.webrtc);
      setSeed(profile.seed);
      setCpuCores(profile.cpuCores);
      setDeviceMemory(profile.deviceMemory);
      setViewportWidth(profile.viewportWidth);
      setViewportHeight(profile.viewportHeight);
      setTimezone(profile.timezone);
      setLocale(profile.locale);
      setStorageQuota(profile.storageQuota);
      setHumanize(profile.humanize);
      setHumanPreset(profile.humanPreset);
      setSelectedExtensionIds(profile.extensionPaths || []);
      setCanvasNoise(profile.canvasNoise ?? true);
      setWebglNoise(profile.webglNoise ?? true);
      setAudioNoise(profile.audioNoise ?? true);
      setClientRectsNoise(profile.clientRectsNoise ?? true);
      setGeolocationMode(profile.geolocationMode || 'auto');
      setLatitude(profile.latitude ?? 10.762622);
      setLongitude(profile.longitude ?? 106.660172);
      setAccuracy(profile.accuracy ?? 10);
    } else {
      // Reset về mặc định khi tạo mới
      setName('');
      setPlatform('windows');
      setProxyType('none');
      setProxyHost('');
      setProxyPort(8080);
      setProxyUsername('');
      setProxyPassword('');
      setWebrtc('auto');
      setSeed(String(Math.floor(Math.random() * 90000) + 10000));
      setCpuCores(8);
      setDeviceMemory(8);
      setViewportWidth(1920);
      setViewportHeight(947);
      setTimezone('auto');
      setLocale('auto');
      setStorageQuota(5000);
      setHumanize(true);
      setHumanPreset('default');
      setSelectedExtensionIds([]);
      setCanvasNoise(true);
      setWebglNoise(true);
      setAudioNoise(true);
      setClientRectsNoise(true);
      setGeolocationMode('auto');
      setLatitude(10.762622);
      setLongitude(106.660172);
      setAccuracy(10);
    }
    setProxyCheckResult({ status: 'idle' });
    setSelectedProxyId('');
  }, [profile, isOpen]);

  // Load danh sách Proxy đã lưu từ database
  useEffect(() => {
    if (isOpen) {
      bridge.getProxies().then((list) => {
        setSavedProxies(list);
      }).catch((err) => {
        console.error('Lỗi tải danh sách proxy trong modal:', err);
      });

      // Tải danh sách Extension
      bridge.getExtensions().then((list) => {
        setAvailableExtensions(list);
      }).catch((err) => {
        console.error('Lỗi tải danh sách extensions trong modal:', err);
      });
    }
  }, [isOpen]);

  const handleSelectSavedProxy = (id: string) => {
    setSelectedProxyId(id);
    if (id === '') return;
    const found = savedProxies.find((p) => p.id === id);
    if (found) {
      setProxyType(found.proxyType);
      setProxyHost(found.proxyHost);
      setProxyPort(found.proxyPort);
      setProxyUsername(found.proxyUsername || '');
      setProxyPassword(found.proxyPassword || '');
    }
  };

  const handleProxyHostChange = (value: string) => {
    if (value.includes(':')) {
      const parts = value.trim().split(':');
      if (parts.length >= 2) {
        setProxyHost(parts[0] || '');
        const port = parseInt(parts[1] || '', 10);
        if (!isNaN(port)) {
          setProxyPort(port);
        }
        if (parts[2] !== undefined) {
          setProxyUsername(parts[2]);
        }
        if (parts[3] !== undefined) {
          setProxyPassword(parts[3]);
        }
        return;
      }
    }
    setProxyHost(value);
  };

  if (!isOpen) return null;

  // Sinh ngẫu nhiên hạt giống vân tay tĩnh
  const handleRandomizeSeed = () => {
    setSeed(String(Math.floor(Math.random() * 90000) + 10000));
  };

  // Tính năng ngẫu nhiên hóa toàn bộ vân tay
  const handleRandomizeAll = () => {
    handleRandomizeSeed();
    
    // CPU ngẫu nhiên (4, 8, 12, 16)
    const cpus = [4, 8, 12, 16];
    setCpuCores(cpus[Math.floor(Math.random() * cpus.length)]!);

    // RAM ngẫu nhiên (4, 8, 16)
    const rams = [4, 8, 16];
    setDeviceMemory(rams[Math.floor(Math.random() * rams.length)]!);

    // Độ phân giải ngẫu nhiên
    const res = COMMON_RESOLUTIONS[Math.floor(Math.random() * COMMON_RESOLUTIONS.length)]!;
    setViewportWidth(res.w);
    setViewportHeight(res.h);
  };

  // Gửi lệnh check proxy tới Sidecar
  const handleCheckProxy = async () => {
    if (!proxyHost || !proxyPort) return;
    setProxyChecking(true);
    setProxyCheckResult({ status: 'idle' });
    try {
      const res = await bridge.checkProxy({
        proxyType: proxyType as 'http' | 'socks5',
        proxyHost,
        proxyPort,
        proxyUsername: proxyUsername || undefined,
        proxyPassword: proxyPassword || undefined,
      });
      if (res.status === 'live') {
        setProxyCheckResult({ status: 'live', ip: res.ip, country: res.country });
      } else {
        setProxyCheckResult({ status: 'dead', error: res.error || 'Connection timeout' });
      }
    } catch (err: any) {
      setProxyCheckResult({ status: 'dead', error: err.message });
    } finally {
      setProxyChecking(false);
    }
  };

  // Lưu thông tin
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onSave({
      name,
      platform,
      proxyType,
      proxyHost,
      proxyPort,
      proxyUsername: proxyUsername || undefined,
      proxyPassword: proxyPassword || undefined,
      webrtc,
      seed,
      cpuCores,
      deviceMemory,
      viewportWidth,
      viewportHeight,
      timezone,
      locale,
      storageQuota,
      humanize,
      humanPreset,
      extensionPaths: selectedExtensionIds,
      canvasNoise,
      webglNoise,
      audioNoise,
      clientRectsNoise,
      geolocationMode,
      latitude: geolocationMode === 'custom' ? latitude : undefined,
      longitude: geolocationMode === 'custom' ? longitude : undefined,
      accuracy: geolocationMode === 'custom' ? accuracy : undefined,
    });
    onClose();
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>
            {profile ? 'Chỉnh Sửa Profile Antidetect' : 'Tạo Mới Profile Antidetect'}
          </h2>
          <button style={styles.btnClose} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div style={styles.tabContainer}>
          <button 
            style={activeTab === 'general' ? styles.activeTabBtn : styles.tabBtn} 
            onClick={() => setActiveTab('general')}
            type="button"
          >
            <Sliders size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
            Cấu Hình Chung
          </button>
          <button 
            style={activeTab === 'proxy' ? styles.activeTabBtn : styles.tabBtn} 
            onClick={() => setActiveTab('proxy')}
            type="button"
          >
            <Globe size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
            Thiết Lập Proxy
          </button>
          <button 
            style={activeTab === 'fingerprint' ? styles.activeTabBtn : styles.tabBtn} 
            onClick={() => setActiveTab('fingerprint')}
            type="button"
          >
            <Cpu size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
            Vân Tay Nâng Cao
          </button>
        </div>

        <form onSubmit={handleSave} style={styles.form}>
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div style={styles.tabPanel}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Tên Profile</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  style={styles.input} 
                  required
                  placeholder="Ví dụ: Tài khoản Facebook 01"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Giả Lập Hệ Điều Hành (Platform)</label>
                <div style={styles.radioGroup}>
                  <label style={platform === 'windows' ? styles.activeRadioLabel : styles.radioLabel}>
                    <input 
                      type="radio" 
                      name="platform" 
                      value="windows" 
                      checked={platform === 'windows'} 
                      onChange={() => setPlatform('windows')}
                      style={styles.radioInput}
                    />
                    Windows Desktop
                  </label>
                  <label style={platform === 'macos' ? styles.activeRadioLabel : styles.radioLabel}>
                    <input 
                      type="radio" 
                      name="platform" 
                      value="macos" 
                      checked={platform === 'macos'} 
                      onChange={() => setPlatform('macos')}
                      style={styles.radioInput}
                    />
                    macOS Desktop
                  </label>
                </div>
              </div>

              <div style={styles.grid2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Độ Phân Giải Màn Hình</label>
                  <select 
                    value={`${viewportWidth}x${viewportHeight}`} 
                    onChange={(e) => {
                      const [w, h] = e.target.value.split('x').map(Number);
                      if (w && h) {
                        setViewportWidth(w);
                        setViewportHeight(h);
                      }
                    }} 
                    style={styles.select}
                  >
                    {COMMON_RESOLUTIONS.map((r, i) => (
                      <option key={i} value={`${r.w}x${r.h}`}>{r.label}</option>
                    ))}
                    <option value="custom">Custom (Nhập tay bên tab advanced)...</option>
                  </select>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Cơ Chế Antidetect</label>
                  <input 
                    type="text" 
                    value="CloakBrowser Patched Chromium" 
                    disabled 
                    style={{ ...styles.input, opacity: 0.6, background: 'rgba(255,255,255,0.02)' }}
                  />
                </div>
              </div>

              {/* Nạp extensions cho Profile */}
              {availableExtensions.length > 0 && (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nạp Tiện Ích Mở Rộng (Chrome Extensions)</label>
                  <div style={styles.extensionsList}>
                    {availableExtensions.map((ext) => (
                      <label key={ext.id} style={styles.extensionCheckboxLabel}>
                        <input 
                          type="checkbox" 
                          checked={selectedExtensionIds.includes(ext.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedExtensionIds((prev) => [...prev, ext.id]);
                            } else {
                              setSelectedExtensionIds((prev) => prev.filter((id) => id !== ext.id));
                            }
                          }}
                          style={styles.checkboxInput}
                        />
                        <span style={styles.extensionCheckboxText}>
                          <strong>{ext.name}</strong> <span style={{ color: theme.colors.textSecondary, fontSize: '11px' }}>v{ext.version}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROXY */}
          {activeTab === 'proxy' && (
            <div style={styles.tabPanel}>
              {savedProxies.length > 0 && (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Chọn Nhanh Từ Proxy Đã Lưu</label>
                  <select 
                    value={selectedProxyId} 
                    onChange={(e) => handleSelectSavedProxy(e.target.value)} 
                    style={styles.select}
                  >
                    <option value="">-- Chọn Proxy đã lưu (Tùy chọn) --</option>
                    {savedProxies.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.country ? `[${p.country.toUpperCase()}] ` : ''}({p.proxyType.toUpperCase()}://{p.proxyHost}:{p.proxyPort})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={styles.inputGroup}>
                <label style={styles.label}>Giao Thức Proxy</label>
                <select 
                  value={proxyType} 
                  onChange={(e) => setProxyType(e.target.value as any)} 
                  style={styles.select}
                >
                  <option value="none">Mạng Không Proxy (Direct Connection)</option>
                  <option value="http">HTTP Proxy</option>
                  <option value="socks5">SOCKS5 Proxy</option>
                </select>
              </div>

              {proxyType !== 'none' && (
                <>
                  <div style={styles.grid2}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Địa chỉ IP / Host Proxy</label>
                      <input 
                        type="text" 
                        value={proxyHost} 
                        onChange={(e) => handleProxyHostChange(e.target.value)} 
                        style={styles.input} 
                        required
                        placeholder="Ví dụ: 192.168.1.10"
                      />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Cổng (Port)</label>
                      <input 
                        type="number" 
                        value={proxyPort} 
                        onChange={(e) => setProxyPort(Number(e.target.value))} 
                        style={styles.input} 
                        required
                        placeholder="Ví dụ: 8080"
                      />
                    </div>
                  </div>

                  <div style={styles.grid2}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Tài Khoản Proxy (Username - Tùy chọn)</label>
                      <input 
                        type="text" 
                        value={proxyUsername} 
                        onChange={(e) => setProxyUsername(e.target.value)} 
                        style={styles.input} 
                        placeholder="Nhập username nếu có..."
                      />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Mật Khẩu Proxy (Password - Tùy chọn)</label>
                      <input 
                        type="password" 
                        value={proxyPassword} 
                        onChange={(e) => setProxyPassword(e.target.value)} 
                        style={styles.input} 
                        placeholder="Nhập password nếu có..."
                      />
                    </div>
                  </div>

                  <div style={styles.proxyCheckContainer}>
                    <button 
                      type="button" 
                      onClick={handleCheckProxy} 
                      disabled={proxyChecking || !proxyHost} 
                      style={proxyHost ? styles.btnCheckProxy : { ...styles.btnCheckProxy, opacity: 0.5, cursor: 'not-allowed' }}
                    >
                      <RefreshCw size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle', animation: proxyChecking ? 'spin 1s linear infinite' : 'none' }} />
                      {proxyChecking ? 'Đang kiểm tra kết nối...' : 'Kiểm Tra Proxy'}
                    </button>

                    {proxyCheckResult.status === 'live' && (
                      <div style={styles.checkLive}>
                        <CheckCircle2 size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
                        Kết nối Proxy tốt! Quốc gia: <strong>{proxyCheckResult.country || 'Không rõ'}</strong> | IP: <strong>{proxyCheckResult.ip}</strong>
                      </div>
                    )}

                    {proxyCheckResult.status === 'dead' && (
                      <div style={styles.checkDead}>
                        <AlertTriangle size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
                        Proxy Lỗi: {proxyCheckResult.error}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: ADVANCED FINGERPRINT */}
          {activeTab === 'fingerprint' && (
            <div style={{ ...styles.tabPanel, maxHeight: '380px', overflowY: 'auto', paddingRight: '12px' }}>
              <div style={styles.seedGroup}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Hạt Giống Vân Tay (Master Seed)</label>
                  <input 
                    type="text" 
                    value={seed} 
                    onChange={(e) => setSeed(e.target.value)} 
                    style={styles.input} 
                    required
                  />
                </div>
                <button type="button" onClick={handleRandomizeSeed} style={styles.btnActionSec}>
                  <RefreshCw size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} /> Random Seed
                </button>
                <button type="button" onClick={handleRandomizeAll} style={styles.btnActionPri}>
                  <Dice5 size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} /> Randomize All Specs
                </button>
              </div>

              <div style={styles.grid2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Số Nhân CPU Giả Lập</label>
                  <select 
                    value={cpuCores} 
                    onChange={(e) => setCpuCores(Number(e.target.value))} 
                    style={styles.select}
                  >
                    <option value={2}>2 Cores</option>
                    <option value={4}>4 Cores</option>
                    <option value={8}>8 Cores (Khuyên dùng)</option>
                    <option value={12}>12 Cores</option>
                    <option value={16}>16 Cores</option>
                  </select>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Dung Lượng RAM Giả Lập</label>
                  <select 
                    value={deviceMemory} 
                    onChange={(e) => setDeviceMemory(Number(e.target.value))} 
                    style={styles.select}
                  >
                    <option value={2}>2 GB</option>
                    <option value={4}>4 GB</option>
                    <option value={8}>8 GB (Khuyên dùng)</option>
                    <option value={16}>16 GB</option>
                  </select>
                </div>
              </div>

              <div style={styles.grid2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Múi Giờ (Timezone)</label>
                  <select 
                    value={timezone} 
                    onChange={(e) => setTimezone(e.target.value)} 
                    style={styles.select}
                  >
                    {TIMEZONES.map((tz, i) => (
                      <option key={i} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Ngôn Ngữ (Locale)</label>
                  <select 
                    value={locale} 
                    onChange={(e) => setLocale(e.target.value)} 
                    style={styles.select}
                  >
                    {LOCALES.map((l, i) => (
                      <option key={i} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.grid2}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Giả Lập WebRTC IP</label>
                  <select 
                    value={webrtc} 
                    onChange={(e) => setWebrtc(e.target.value)} 
                    style={styles.select}
                  >
                    <option value="auto">Tự động lấy IP của Proxy (An toàn nhất)</option>
                    <option value="default">Mặc định trình duyệt (Có thể lộ IP thật)</option>
                  </select>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Hạn Ngạch Bộ Nhớ Cache (Quota MB)</label>
                  <input 
                    type="number" 
                    value={storageQuota || ''} 
                    onChange={(e) => setStorageQuota(e.target.value ? Number(e.target.value) : undefined)} 
                    style={styles.input}
                    placeholder="Ví dụ: 5000"
                  />
                </div>
              </div>

              {/* Giả lập nhiễu vân tay nâng cao */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nhiễu Vân Tay Cấp Thấp (Hardware Spoofing)</label>
                <div style={styles.fingerprintNoisesGrid}>
                  <label style={styles.checkboxLabel}>
                    <input type="checkbox" checked={canvasNoise} onChange={(e) => setCanvasNoise(e.target.checked)} style={styles.checkboxInput} />
                    Canvas Noise
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input type="checkbox" checked={webglNoise} onChange={(e) => setWebglNoise(e.target.checked)} style={styles.checkboxInput} />
                    WebGL Noise
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input type="checkbox" checked={audioNoise} onChange={(e) => setAudioNoise(e.target.checked)} style={styles.checkboxInput} />
                    Audio Noise
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input type="checkbox" checked={clientRectsNoise} onChange={(e) => setClientRectsNoise(e.target.checked)} style={styles.checkboxInput} />
                    ClientRects Noise
                  </label>
                </div>
              </div>

              {/* Cấu hình vị trí địa lý (Geolocation) */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Vị Trí Địa Lý (Geolocation)</label>
                <select value={geolocationMode} onChange={(e) => setGeolocationMode(e.target.value as any)} style={styles.select}>
                  <option value="auto">Tự động điều chỉnh theo IP Proxy (GeoIP)</option>
                  <option value="custom">Nhập tọa độ địa lý thủ công (Latitude/Longitude)</option>
                  <option value="block">Chặn hoàn toàn quyền truy cập vị trí</option>
                </select>
              </div>

              {geolocationMode === 'custom' && (
                <div style={styles.grid3}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Kinh độ (Latitude)</label>
                    <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(Number(e.target.value))} style={styles.input} placeholder="Ví dụ: 10.7626" />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Vĩ độ (Longitude)</label>
                    <input type="number" step="any" value={longitude} onChange={(e) => setLongitude(Number(e.target.value))} style={styles.input} placeholder="Ví dụ: 106.6601" />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Sai số (Accuracy m)</label>
                    <input type="number" value={accuracy} onChange={(e) => setAccuracy(Number(e.target.value))} style={styles.input} placeholder="Ví dụ: 10" />
                  </div>
                </div>
              )}

              <div style={styles.checkboxGroup}>
                <label style={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={humanize} 
                    onChange={(e) => setHumanize(e.target.checked)}
                    style={styles.checkboxInput}
                  />
                  Kích hoạt Giả lập Hành vi Con người (Humanize Actions)
                </label>
              </div>

              {humanize && (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Hành vi Preset</label>
                  <select 
                    value={humanPreset} 
                    onChange={(e) => setHumanPreset(e.target.value as any)} 
                    style={styles.select}
                  >
                    <option value="default">Default Preset (Tốc độ tự nhiên chuẩn)</option>
                    <option value="careful">Careful Preset (Chậm rãi, cẩn thận hơn)</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Footer Action buttons */}
          <div style={styles.modalFooter}>
            <button type="button" onClick={onClose} style={styles.btnCancel}>Hủy Bỏ</button>
            <button type="submit" style={styles.btnSave}>
              <Save size={14} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
              Lưu Cấu Hình Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '20px',
    boxShadow: theme.shadows.flat,
    width: '100%',
    maxWidth: '640px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  modalTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: theme.colors.textPrimary,
  },
  btnClose: {
    background: 'none',
    border: 'none',
    color: theme.colors.textSecondary,
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
  },
  tabContainer: {
    display: 'flex',
    background: 'rgba(255, 255, 255, 0.01)',
    borderBottom: `1px solid ${theme.colors.border}`,
    padding: '5px 15px 0 15px',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: theme.colors.textSecondary,
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  activeTabBtn: {
    background: 'none',
    border: 'none',
    borderBottom: `2px solid ${theme.colors.accent}`,
    color: theme.colors.accent,
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
  },
  tabPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
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
    transition: 'all 0.2s',
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
  },
  radioGroup: {
    display: 'flex',
    gap: '15px',
  },
  radioLabel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.01)',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '12px',
    color: theme.colors.textSecondary,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  activeRadioLabel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    background: 'rgba(79, 70, 229, 0.08)',
    border: `1px solid ${theme.colors.accent}`,
    borderRadius: '12px',
    color: theme.colors.accent,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: 600,
  },
  radioInput: {
    margin: 0,
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '15px',
  },
  fingerprintNoisesGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    background: 'rgba(255, 255, 255, 0.01)',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '12px',
    padding: '12px 16px',
  },
  seedGroup: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px',
  },
  btnActionPri: {
    background: theme.colors.successBg,
    border: `1px solid ${theme.colors.successBorder}`,
    color: theme.colors.success,
    padding: '10px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  btnActionSec: {
    background: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.textPrimary,
    padding: '10px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  proxyCheckContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '5px',
  },
  btnCheckProxy: {
    background: theme.colors.accent,
    color: theme.colors.textPrimary,
    border: 'none',
    borderRadius: '10px',
    padding: '10px 18px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
  },
  checkLive: {
    fontSize: '12px',
    color: theme.colors.success,
    background: theme.colors.successBg,
    border: `1px solid ${theme.colors.successBorder}`,
    borderRadius: '8px',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
  },
  checkDead: {
    fontSize: '12px',
    color: theme.colors.danger,
    background: theme.colors.dangerBg,
    border: `1px solid ${theme.colors.dangerBorder}`,
    borderRadius: '8px',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '5px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    fontWeight: 600,
    color: theme.colors.textPrimary,
    cursor: 'pointer',
  },
  checkboxInput: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  extensionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    background: 'rgba(255, 255, 255, 0.01)',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '12px',
    padding: '12px 16px',
    maxHeight: '140px',
    overflowY: 'auto',
  },
  extensionCheckboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  extensionCheckboxText: {
    color: theme.colors.textPrimary,
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    borderTop: `1px solid ${theme.colors.border}`,
    paddingTop: '20px',
    marginTop: '15px',
  },
  btnCancel: {
    background: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.textSecondary,
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnSave: {
    background: theme.colors.accent,
    color: theme.colors.textPrimary,
    border: 'none',
    padding: '10px 24px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
};
