import React, { useEffect, useState } from "react";
import { useSidecar } from "./hooks/useSidecar";
import { LoadingScreen } from "./components/LoadingScreen";
import { invoke } from "@tauri-apps/api/core";
import { BrowserProfile } from "./lib/bridge/NodeSidecarBridge";
import { ProfileModal } from "./components/ProfileModal";
import { theme } from "./styles/theme";
import { ProxyManager } from "./components/ProxyManager";
import { ExtensionManager } from "./components/ExtensionManager";
import { SystemSettingsManager } from "./components/SystemSettingsManager";
import {
  Folder,
  Globe,
  Cpu,
  Settings,
  Plus,
  RefreshCw,
  Play,
  Square,
  Edit,
  Trash2,
  Activity,
  Layers,
} from "lucide-react";

export default function App() {
  const { sidecars, allReady, bootMessage } = useSidecar();

  // States quản lý dữ liệu
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [currentTab, setCurrentTab] = useState<
    "profiles" | "proxies" | "extensions" | "settings"
  >("profiles");
  const [activeProfile, setActiveProfile] = useState<BrowserProfile | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  const nodeBridge = sidecars.nodejs;

  // 1. Đọc danh sách profiles ban đầu khi sidecar sẵn sàng
  const loadProfiles = async () => {
    if (!nodeBridge) return;
    try {
      const list = await nodeBridge.getProfiles();
      setProfiles(list);
      addLog("Đã tải thành công danh sách profiles từ database cục bộ.");
    } catch (err) {
      console.error("Lỗi tải danh sách profiles:", err);
      addLog("Lỗi kết nối API lấy danh sách profiles.");
    }
  };

  const addLog = (msg: string) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
  };

  useEffect(() => {
    if (!nodeBridge) return;
    loadProfiles();
  }, [nodeBridge]);

  // 2. Lắng nghe sự kiện WebSocket real-time từ Node.js sidecar
  useEffect(() => {
    if (!nodeBridge) return;

    nodeBridge.on("connect", () => {
      addLog("Đã kết nối Socket.io thành công tới Node.js Sidecar!");
    });

    nodeBridge.on("welcome", (data: { message: string }) => {
      addLog(`[System] Lời chào từ Sidecar: "${data.message}"`);
    });

    // Lắng nghe sự kiện đồng bộ trạng thái profile tức thời
    nodeBridge.on(
      "profile:status-changed",
      (data: { id: string; status: "Stopped" | "Running" | "Starting" }) => {
        addLog(
          `[Profile Status] Profile ID #${data.id.substring(0, 8)} đã chuyển sang trạng thái: "${data.status}"`,
        );
        setProfiles((prevList) =>
          prevList.map((p) =>
            p.id === data.id ? { ...p, status: data.status } : p,
          ),
        );
      },
    );

    nodeBridge.on("disconnect", () => {
      addLog("Mất kết nối Socket.io với Node.js Sidecar.");
    });

    return () => {
      nodeBridge.off("connect", () => {});
      nodeBridge.off("welcome", () => {});
      nodeBridge.off("profile:status-changed", () => {});
      nodeBridge.off("disconnect", () => {});
    };
  }, [nodeBridge]);

  // Khởi chạy Profile
  const handleLaunchProfile = async (id: string) => {
    if (!nodeBridge) return;
    addLog(`Đang khởi chạy profile ID: ${id.substring(0, 8)}...`);
    try {
      const res = await nodeBridge.launchProfile(id);
      if (res.success) {
        addLog(`Khởi chạy profile thành công! Cửa sổ trình duyệt đang mở.`);
      }
    } catch (err: any) {
      console.error(err);
      addLog(
        `Lỗi khởi chạy trình duyệt: ${err.response?.data?.error || err.message}`,
      );
    }
  };

  // Buộc đóng Profile đang chạy
  const handleStopProfile = async (id: string) => {
    if (!nodeBridge) return;
    addLog(`Đang dừng profile ID: ${id.substring(0, 8)}...`);
    try {
      const res = await nodeBridge.stopProfile(id);
      if (res.success) {
        addLog(`Đã đóng trình duyệt profile thành công.`);
      }
    } catch (err: any) {
      console.error(err);
      addLog(
        `Lỗi đóng trình duyệt: ${err.response?.data?.error || err.message}`,
      );
    }
  };

  // Xóa Profile
  const handleDeleteProfile = async (id: string, name: string) => {
    if (!nodeBridge) return;
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa profile "${name}"? Thao tác này sẽ xóa sạch dữ liệu cache & cookie của trình duyệt!`,
      )
    )
      return;

    try {
      const res = await nodeBridge.deleteProfile(id);
      if (res.success) {
        setProfiles((prev) => prev.filter((p) => p.id !== id));
        addLog(`Đã xóa thành công profile "${name}".`);
      }
    } catch (err: any) {
      console.error(err);
      addLog(`Lỗi xóa profile: ${err.message}`);
    }
  };

  // Mở modal tạo mới
  const handleOpenCreateModal = () => {
    setActiveProfile(null);
    setIsModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (profile: BrowserProfile) => {
    setActiveProfile(profile);
    setIsModalOpen(true);
  };

  // Lưu profile (tạo mới hoặc cập nhật)
  const handleSaveProfile = async (
    profileData: Omit<BrowserProfile, "id" | "createdAt"> & { id?: string },
  ) => {
    if (!nodeBridge) return;
    try {
      if (activeProfile) {
        // Cập nhật
        const updated = await nodeBridge.updateProfile(
          activeProfile.id,
          profileData,
        );
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === updated.id ? { ...updated, status: "Stopped" } : p,
          ),
        );
        addLog(`Đã cập nhật cấu hình profile "${updated.name}" thành công.`);
      } else {
        // Tạo mới
        const created = await nodeBridge.createProfile(profileData);
        setProfiles((prev) => [created, ...prev]);
        addLog(`Đã tạo thành công profile "${created.name}".`);
      }
    } catch (err: any) {
      console.error(err);
      alert(
        `Không thể lưu profile: ${err.response?.data?.error || err.message}`,
      );
    }
  };

  // Khởi động lại Sidecar từ Rust
  const handleRestartSidecar = async () => {
    if (isRestarting) return;
    setIsRestarting(true);
    setProfiles([]);
    addLog(`Đang gửi lệnh yêu cầu Rust khởi động lại Sidecar Node.js...`);
    try {
      await invoke("restart_sidecar", { name: "nodejs" });
      addLog(`Đã gửi lệnh khởi động lại. Chờ Node.js Sidecar kết nối lại...`);
    } catch (err) {
      console.error(err);
      addLog(`Lỗi khởi động lại Sidecar: ${err}`);
    } finally {
      setIsRestarting(false);
    }
  };

  // Metrics thống kê
  const totalProfiles = profiles.length;
  const activeProfiles = profiles.filter((p) => p.status === "Running").length;
  const inactiveProfiles = profiles.filter(
    (p) => p.status === "Stopped" || !p.status,
  ).length;

  if (!allReady || !nodeBridge) {
    return <LoadingScreen message={bootMessage} />;
  }

  return (
    <div style={styles.appContainer}>
      {/* Main UI Layout */}
      <div style={styles.dashboardLayout}>
        {/* SIDEBAR TRÁI */}
        <aside style={styles.sidebar}>
          <div style={styles.logoContainer}>
            <img
              src="/logo.png"
              alt="Antibrowsers Logo"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                objectFit: "contain",
              }}
            />
            <div>
              <h1 style={styles.logoText}>antibrowsers</h1>
              <span style={styles.logoSubtext}>Antidetect Controller</span>
            </div>
          </div>

          <nav style={styles.menuList}>
            <button
              style={
                currentTab === "profiles"
                  ? styles.menuItemActive
                  : styles.menuItem
              }
              onClick={() => setCurrentTab("profiles")}
            >
              <Folder size={16} style={{ marginRight: "8px" }} />
              <span>Profiles Trình Duyệt</span>
            </button>
            <button
              style={
                currentTab === "proxies"
                  ? styles.menuItemActive
                  : styles.menuItem
              }
              onClick={() => setCurrentTab("proxies")}
            >
              <Globe size={16} style={{ marginRight: "8px" }} />
              <span>Proxy Management</span>
            </button>
            <button
              style={
                currentTab === "extensions"
                  ? styles.menuItemActive
                  : styles.menuItem
              }
              onClick={() => setCurrentTab("extensions")}
            >
              <Layers size={16} style={{ marginRight: "8px" }} />
              <span>Extensions (Chrome)</span>
            </button>
            <button
              style={
                currentTab === "settings"
                  ? styles.menuItemActive
                  : styles.menuItem
              }
              onClick={() => setCurrentTab("settings")}
            >
              <Settings size={16} style={{ marginRight: "8px" }} />
              <span>Cài Đặt Hệ Thống</span>
            </button>
          </nav>

          <div style={styles.sidebarFooter}>
            <span>Core: CloakBrowser v0.3.30</span>
            <span>Tauri Shell v2.0.0</span>
          </div>
        </aside>

        {/* PHẦN MAIN CONTENT BÊN PHẢI */}
        <main style={styles.mainContent}>
          {currentTab === "profiles" && (
            <>
              {/* Header */}
              <header style={styles.header}>
                <div>
                  <h2 style={styles.mainTitle}>Quản Lý Browser Profiles</h2>
                </div>
                <div style={styles.headerActions}>
                  <button
                    style={styles.btnRestart}
                    onClick={handleRestartSidecar}
                    disabled={isRestarting}
                  >
                    <RefreshCw
                      size={14}
                      style={{
                        marginRight: "6px",
                        animation: isRestarting
                          ? "spin 1s linear infinite"
                          : "none",
                      }}
                    />
                    {isRestarting ? "Restarting..." : "Restart Sidecar"}
                  </button>
                  <button
                    style={styles.btnCreate}
                    onClick={handleOpenCreateModal}
                  >
                    <Plus size={14} style={{ marginRight: "6px" }} />
                    Tạo Profile Mới
                  </button>
                </div>
              </header>

              {/* Metrics Statistics */}
              <section style={styles.metricsGrid}>
                <div style={styles.metricCard}>
                  <span style={styles.metricLabel}>Tổng số Profile</span>
                  <span style={styles.metricValue}>{totalProfiles}</span>
                </div>
                <div style={styles.metricCard}>
                  <span style={styles.metricLabel}>
                    Đang hoạt động (Running)
                  </span>
                  <span style={styles.metricValueActive}>
                    {activeProfiles}{" "}
                    <Activity
                      size={14}
                      style={{
                        marginLeft: "6px",
                        display: "inline",
                        verticalAlign: "middle",
                      }}
                    />
                  </span>
                </div>
                <div style={styles.metricCard}>
                  <span style={styles.metricLabel}>Đang tắt (Stopped)</span>
                  <span style={styles.metricValueInactive}>
                    {inactiveProfiles}{" "}
                    <Square
                      size={12}
                      style={{
                        marginLeft: "6px",
                        display: "inline",
                        verticalAlign: "middle",
                        fill: theme.colors.textSecondary,
                      }}
                    />
                  </span>
                </div>
              </section>

              {/* Profiles Table Card */}
              <section style={styles.tableCard}>
                <div style={styles.tableHeader}>
                  <h3 style={styles.tableTitle}>Danh sách Profile Cấu hình</h3>
                </div>

                <div style={styles.tableContainer}>
                  {profiles.length > 0 ? (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th
                            style={{
                              ...styles.th,
                              width: "260px",
                              minWidth: "220px",
                            }}
                          >
                            Tên Profile
                          </th>
                          <th style={styles.th}>Proxy</th>
                          <th style={styles.th}>Fingerprint</th>
                          <th style={styles.th}>Trạng Thái</th>
                          <th
                            className="sticky-action-header"
                            style={{ ...styles.th, textAlign: "right" }}
                          >
                            Thao Tác
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {profiles.map((p) => {
                          const isRunning = p.status === "Running";
                          const isStarting = p.status === "Starting";
                          return (
                            <tr key={p.id} style={styles.tr}>
                              {/* Name & Platform */}
                              <td style={styles.td}>
                                <div style={styles.profileNameCell}>
                                  <span style={styles.osIcon}>
                                    <Cpu
                                      size={18}
                                      style={{
                                        color:
                                          p.platform === "windows"
                                            ? theme.colors.textSecondary
                                            : theme.colors.accent,
                                      }}
                                    />
                                  </span>
                                  <div>
                                    <div style={styles.profileNameText}>
                                      {p.name}
                                    </div>
                                    <div style={styles.profileIdText}>
                                      ID: #{p.id.substring(0, 8)} | OS:{" "}
                                      {p.platform}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              {/* Proxy */}
                              <td style={styles.td}>
                                {p.proxyType !== "none" ? (
                                  <div style={styles.proxyCell}>
                                    <span style={styles.proxyBadge}>
                                      {p.proxyType.toUpperCase()}
                                    </span>
                                    <span style={styles.proxyHostText}>
                                      {p.proxyHost}:{p.proxyPort}
                                    </span>
                                  </div>
                                ) : (
                                  <span style={styles.proxyDirect}>
                                    Mạng Trực Tiếp
                                  </span>
                                )}
                              </td>
                              {/* Specs */}
                              <td style={styles.td}>
                                <div style={styles.specsCell}>
                                  <div>
                                    Seed: <strong>{p.seed}</strong>
                                  </div>
                                  <div style={styles.specsSubText}>
                                    CPU: {p.cpuCores} Cores | RAM:{" "}
                                    {p.deviceMemory} GB | {p.viewportWidth}x
                                    {p.viewportHeight}
                                  </div>
                                </div>
                              </td>
                              {/* Status */}
                              <td style={styles.td}>
                                {isRunning && (
                                  <span style={styles.statusBadgeRunning}>
                                    <Activity
                                      size={12}
                                      style={{
                                        marginRight: "6px",
                                        display: "inline",
                                        verticalAlign: "middle",
                                      }}
                                    />
                                    Running
                                  </span>
                                )}
                                {isStarting && (
                                  <span style={styles.statusBadgeStarting}>
                                    <RefreshCw
                                      size={12}
                                      style={{
                                        marginRight: "6px",
                                        display: "inline",
                                        verticalAlign: "middle",
                                        animation: "spin 1s linear infinite",
                                      }}
                                    />
                                    Starting...
                                  </span>
                                )}
                                {(!p.status || p.status === "Stopped") && (
                                  <span style={styles.statusBadgeStopped}>
                                    <Square
                                      size={10}
                                      style={{
                                        marginRight: "6px",
                                        display: "inline",
                                        verticalAlign: "middle",
                                      }}
                                    />
                                    Stopped
                                  </span>
                                )}
                              </td>
                              {/* Actions */}
                              <td
                                className="sticky-action-cell"
                                style={{ ...styles.td, textAlign: "right" }}
                              >
                                <div style={styles.actionsCell}>
                                  {isRunning ? (
                                    <button
                                      style={styles.btnActionStop}
                                      onClick={() => handleStopProfile(p.id)}
                                    >
                                      <Square
                                        size={12}
                                        style={{
                                          marginRight: "6px",
                                          display: "inline",
                                          verticalAlign: "middle",
                                        }}
                                      />{" "}
                                      Dừng
                                    </button>
                                  ) : (
                                    <button
                                      style={
                                        isStarting
                                          ? {
                                              ...styles.btnActionLaunch,
                                              opacity: 0.5,
                                              cursor: "not-allowed",
                                            }
                                          : styles.btnActionLaunch
                                      }
                                      onClick={() => handleLaunchProfile(p.id)}
                                      disabled={isStarting}
                                    >
                                      <Play
                                        size={12}
                                        style={{
                                          marginRight: "6px",
                                          display: "inline",
                                          verticalAlign: "middle",
                                          fill: "#ffffff",
                                        }}
                                      />{" "}
                                      Mở
                                    </button>
                                  )}

                                  <button
                                    style={
                                      isRunning
                                        ? {
                                            ...styles.btnActionEdit,
                                            opacity: 0.5,
                                            cursor: "not-allowed",
                                          }
                                        : styles.btnActionEdit
                                    }
                                    onClick={() => handleOpenEditModal(p)}
                                    disabled={isRunning}
                                  >
                                    <Edit
                                      size={12}
                                      style={{
                                        marginRight: "4px",
                                        display: "inline",
                                        verticalAlign: "middle",
                                      }}
                                    />{" "}
                                    Sửa
                                  </button>
                                  <button
                                    style={
                                      isRunning
                                        ? {
                                            ...styles.btnActionDelete,
                                            opacity: 0.5,
                                            cursor: "not-allowed",
                                          }
                                        : styles.btnActionDelete
                                    }
                                    onClick={() =>
                                      handleDeleteProfile(p.id, p.name)
                                    }
                                    disabled={isRunning}
                                  >
                                    <Trash2
                                      size={12}
                                      style={{
                                        marginRight: "4px",
                                        display: "inline",
                                        verticalAlign: "middle",
                                      }}
                                    />{" "}
                                    Xóa
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div style={styles.emptyState}>
                      <Folder
                        size={48}
                        style={{
                          color: theme.colors.textMuted,
                          marginBottom: "15px",
                        }}
                      />
                      <div style={{ marginBottom: "15px" }}>
                        Chưa có Profile trình duyệt nào được tạo.
                      </div>
                      <button
                        style={styles.btnCreateEmpty}
                        onClick={handleOpenCreateModal}
                      >
                        <Plus
                          size={14}
                          style={{
                            marginRight: "6px",
                            display: "inline",
                            verticalAlign: "middle",
                          }}
                        />{" "}
                        Tạo Profile Đầu Tiên
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {currentTab === "proxies" && (
            <ProxyManager bridge={nodeBridge} addLog={addLog} />
          )}

          {currentTab === "extensions" && (
            <ExtensionManager bridge={nodeBridge} addLog={addLog} />
          )}

          {currentTab === "settings" && (
            <SystemSettingsManager bridge={nodeBridge} addLog={addLog} />
          )}
        </main>
      </div>

      {/* Profile Form Modal */}
      <ProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProfile}
        profile={activeProfile}
        bridge={nodeBridge}
      />
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  appContainer: {
    width: "100vw",
    height: "100vh",
    background: theme.colors.bg,
    color: theme.colors.textPrimary,
    fontFamily: "'Outfit', 'Inter', sans-serif",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    boxSizing: "border-box",
    position: "relative",
    overflow: "hidden",
  },
  dashboardLayout: {
    width: "100%",
    height: "100%",
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    position: "relative",
    zIndex: 10,
  },
  sidebar: {
    background: theme.colors.panel,
    borderRight: `1px solid ${theme.colors.border}`,
    padding: "30px 20px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "40px",
  },
  logoIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 800,
    color: theme.colors.textPrimary,
    letterSpacing: "-0.5px",
  },
  logoSubtext: {
    fontSize: "10px",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: "1px",
    fontWeight: 600,
  },
  menuList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: 1,
  },
  menuItem: {
    background: "none",
    border: "none",
    color: theme.colors.textSecondary,
    padding: "12px 16px",
    borderRadius: theme.radius.button,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    transition: "all 0.2s",
  },
  menuItemActive: {
    background: "rgba(79, 70, 229, 0.08)",
    border: "none",
    color: theme.colors.accent,
    padding: "12px 16px",
    borderRadius: theme.radius.button,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    transition: "all 0.2s",
  },
  sidebarFooter: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "10px",
    color: theme.colors.textMuted,
    borderTop: `1px solid ${theme.colors.border}`,
    paddingTop: "15px",
  },
  mainContent: {
    padding: "40px",
    display: "flex",
    flexDirection: "column",
    gap: "30px",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mainTitle: {
    margin: "0 0 5px 0",
    fontSize: "22px",
    fontWeight: 700,
    color: theme.colors.textPrimary,
  },
  mainSubtitle: {
    margin: 0,
    fontSize: "13px",
    color: theme.colors.textSecondary,
  },
  headerActions: {
    display: "flex",
    gap: "12px",
  },
  btnRestart: {
    background: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.textSecondary,
    padding: "10px 20px",
    borderRadius: theme.radius.button,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    transition: "all 0.2s",
  },
  btnCreate: {
    background: theme.colors.accent,
    color: theme.colors.textPrimary,
    border: "none",
    padding: "10px 24px",
    borderRadius: theme.radius.button,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    boxShadow: "none",
    transition: "all 0.2s",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
  },
  metricCard: {
    background: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.card,
    padding: "16px 24px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  metricLabel: {
    fontSize: "11px",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "6px",
  },
  metricValue: {
    fontSize: "24px",
    fontWeight: 700,
    color: theme.colors.textPrimary,
  },
  metricValueActive: {
    fontSize: "24px",
    fontWeight: 700,
    color: theme.colors.success,
  },
  metricValueInactive: {
    fontSize: "24px",
    fontWeight: 700,
    color: theme.colors.textSecondary,
  },
  tableCard: {
    background: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: "16px",
    overflow: "hidden",
  },
  tableHeader: {
    padding: "20px 24px",
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  tableTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 600,
    color: theme.colors.textPrimary,
  },
  tableContainer: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    padding: "14px 24px",
    textAlign: "left",
    fontSize: "11px",
    fontWeight: 600,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  tr: {
    borderBottom: `1px solid ${theme.colors.border}`,
    transition: "background 0.2s",
  },
  td: {
    padding: "16px 24px",
    fontSize: "13px",
    verticalAlign: "middle",
  },
  profileNameCell: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  osIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  profileNameText: {
    fontWeight: 600,
    color: theme.colors.textPrimary,
  },
  profileIdText: {
    fontSize: "10px",
    color: theme.colors.textSecondary,
    marginTop: "2px",
  },
  proxyCell: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  proxyBadge: {
    background: "rgba(79, 70, 229, 0.08)",
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.accent,
    padding: "2px 6px",
    borderRadius: "6px",
    fontSize: "9px",
    fontWeight: 700,
  },
  proxyHostText: {
    color: theme.colors.textPrimary,
  },
  proxyDirect: {
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },
  specsCell: {
    color: theme.colors.textPrimary,
  },
  specsSubText: {
    fontSize: "10px",
    color: theme.colors.textSecondary,
    marginTop: "2px",
  },
  statusBadgeRunning: {
    background: theme.colors.successBg,
    border: `1px solid ${theme.colors.successBorder}`,
    color: theme.colors.success,
    padding: "4px 10px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
  },
  statusBadgeStarting: {
    background: theme.colors.warningBg,
    border: `1px solid ${theme.colors.warningBorder}`,
    color: theme.colors.warning,
    padding: "4px 10px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
  },
  statusBadgeStopped: {
    background: "rgba(255, 255, 255, 0.02)",
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.textSecondary,
    padding: "4px 10px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
  },
  actionsCell: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
  },
  btnActionLaunch: {
    background: theme.colors.success,
    color: theme.colors.textPrimary,
    border: "none",
    borderRadius: "8px",
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    transition: "all 0.2s",
  },
  btnActionStop: {
    background: theme.colors.danger,
    color: theme.colors.textPrimary,
    border: "none",
    borderRadius: "8px",
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    transition: "all 0.2s",
  },
  btnActionEdit: {
    background: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.textPrimary,
    borderRadius: "8px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    transition: "all 0.2s",
  },
  btnActionDelete: {
    background: theme.colors.dangerBg,
    border: `1px solid ${theme.colors.dangerBorder}`,
    color: theme.colors.danger,
    borderRadius: "8px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    transition: "all 0.2s",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "60px 40px",
    color: theme.colors.textSecondary,
    fontSize: "14px",
  },
  emptyTabPlaceholder: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "80px 40px",
    color: theme.colors.textSecondary,
    background: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: "16px",
    textAlign: "center",
    gap: "8px",
  },
  btnCreateEmpty: {
    background: theme.colors.accent,
    color: theme.colors.textPrimary,
    border: "none",
    padding: "10px 20px",
    borderRadius: theme.radius.button,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    marginTop: "20px",
    transition: "all 0.2s",
  },
};
