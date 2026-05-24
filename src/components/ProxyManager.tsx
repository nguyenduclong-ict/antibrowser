import React, { useState, useEffect } from "react";
import { NodeSidecarBridge, ProxyEntry } from "../lib/bridge/NodeSidecarBridge";
import { theme } from "../styles/theme";
import {
  Globe,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";

interface ProxyManagerProps {
  bridge: NodeSidecarBridge;
  addLog: (msg: string) => void;
}

export function ProxyManager({ bridge, addLog }: ProxyManagerProps) {
  const [proxies, setProxies] = useState<ProxyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [checkingIds, setCheckingIds] = useState<string[]>([]);

  // States cho form Thêm Proxy
  const [showAddForm, setShowAddForm] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [proxyName, setProxyName] = useState("");
  const [proxyType, setProxyType] = useState<"http" | "socks5">("socks5");
  const [proxyHost, setProxyHost] = useState("");
  const [proxyPort, setProxyPort] = useState(1080);
  const [proxyUser, setProxyUser] = useState("");
  const [proxyPass, setProxyPass] = useState("");

  // Tải danh sách proxy
  const loadProxies = async () => {
    setLoading(true);
    try {
      const list = await bridge.getProxies();
      setProxies(list);
    } catch (err: any) {
      console.error(err);
      addLog("Lỗi tải danh sách proxy từ sidecar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProxies();
  }, []);

  const handleProxyHostChange = (value: string) => {
    if (value.includes(":")) {
      const parts = value.trim().split(":");
      if (parts.length >= 2) {
        setProxyHost(parts[0] || "");
        const port = parseInt(parts[1] || "", 10);
        if (!isNaN(port)) {
          setProxyPort(port);
        }
        if (parts[2] !== undefined) {
          setProxyUser(parts[2]);
        }
        if (parts[3] !== undefined) {
          setProxyPass(parts[3]);
        }
        return;
      }
    }
    setProxyHost(value);
  };

  // Check 1 proxy cụ thể
  const handleCheckProxy = async (id: string) => {
    setCheckingIds((prev) => [...prev, id]);
    addLog(`Đang kiểm tra kết nối proxy ID: ${id.substring(0, 8)}...`);
    try {
      const updated = await bridge.checkProxyById(id);
      setProxies((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updated } : p)),
      );
      if (updated.status === "live") {
        addLog(
          `Proxy [${updated.name}] HOẠT ĐỘNG. IP: ${updated.exitIp} (Ping: ${updated.ping}ms)`,
        );
      } else {
        addLog(`Proxy [${updated.name}] KHÔNG HOẠT ĐỘNG hoặc lỗi kết nối.`);
      }
    } catch (err: any) {
      addLog(`Lỗi kiểm tra proxy: ${err.message}`);
    } finally {
      setCheckingIds((prev) => prev.filter((i) => i !== id));
    }
  };

  // Check hàng loạt proxy đã chọn
  const handleCheckSelected = async () => {
    const idsToCheck =
      selectedIds.length > 0 ? selectedIds : proxies.map((p) => p.id);
    if (idsToCheck.length === 0) return;

    setCheckingIds((prev) => [...prev, ...idsToCheck]);
    addLog(`Đang kiểm tra hàng loạt ${idsToCheck.length} proxies...`);
    try {
      const results = await bridge.checkProxiesBulk(idsToCheck);

      // Cập nhật lại danh sách proxy trên UI
      setProxies((prev) =>
        prev.map((p) => {
          const matched = results.find((r) => r.id === p.id);
          return matched ? { ...p, ...matched } : p;
        }),
      );
      addLog(`Đã hoàn tất kiểm tra hàng loạt proxies.`);
    } catch (err: any) {
      addLog(`Lỗi kiểm tra hàng loạt: ${err.message}`);
    } finally {
      setCheckingIds((prev) => prev.filter((i) => !idsToCheck.includes(i)));
    }
  };

  // Xóa 1 proxy
  const handleDeleteProxy = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa proxy "${name}"?`)) return;
    try {
      const res = await bridge.deleteProxy(id);
      if (res.success) {
        setProxies((prev) => prev.filter((p) => p.id !== id));
        setSelectedIds((prev) => prev.filter((i) => i !== id));
        addLog(`Đã xóa proxy "${name}".`);
      }
    } catch (err: any) {
      addLog(`Lỗi xóa proxy: ${err.message}`);
    }
  };

  // Thêm proxy
  const handleAddProxy = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (bulkInput.trim()) {
        // Hỗ trợ thêm nhanh bằng cách dán chuỗi định dạng (host:port hoặc host:port:user:pass)
        const lines = bulkInput.trim().split("\n");
        let count = 0;
        for (const line of lines) {
          const parts = line.trim().split(":");
          if (parts.length >= 2) {
            const host = parts[0]!;
            const port = parseInt(parts[1]!, 10);
            if (isNaN(port)) continue;

            const username = parts[2] || undefined;
            const password = parts[3] || undefined;

            await bridge.createProxy({
              name: `Proxy Quick #${Math.floor(Math.random() * 900) + 100}`,
              proxyType,
              proxyHost: host,
              proxyPort: port,
              proxyUsername: username,
              proxyPassword: password,
            });
            count++;
          }
        }
        addLog(`Đã thêm nhanh thành công ${count} proxy.`);
      } else {
        // Điền form thủ công
        if (!proxyHost || !proxyPort) return;
        const newProxy = await bridge.createProxy({
          name: proxyName || `Proxy ${proxyHost}:${proxyPort}`,
          proxyType,
          proxyHost,
          proxyPort,
          proxyUsername: proxyUser || undefined,
          proxyPassword: proxyPass || undefined,
        });
        addLog(`Đã thêm thành công proxy "${newProxy.name}".`);
      }

      // Reset form & reload danh sách
      setShowAddForm(false);
      setBulkInput("");
      setProxyName("");
      setProxyHost("");
      setProxyPort(1080);
      setProxyUser("");
      setProxyPass("");
      loadProxies();
    } catch (err: any) {
      alert(`Lỗi thêm proxy: ${err.message}`);
    }
  };

  // Chọn / bỏ chọn checkbox
  const handleSelectToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAllToggle = () => {
    if (selectedIds.length === proxies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(proxies.map((p) => p.id));
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h2 style={styles.mainTitle}>Quản Lý Proxy Tập Trung</h2>
          <p style={styles.mainSubtitle}>
            Lưu trữ, kiểm tra tình trạng Live/Dead hàng loạt và tái sử dụng
            Proxy cho các Profile
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            style={styles.btnCheckBulk}
            onClick={handleCheckSelected}
            disabled={checkingIds.length > 0}
          >
            <RefreshCw
              size={14}
              style={{
                marginRight: "6px",
                animation:
                  checkingIds.length > 0 ? "spin 1s linear infinite" : "none",
              }}
            />
            Kiểm Tra Kết Nối (
            {selectedIds.length > 0
              ? `${selectedIds.length} Đã Chọn`
              : "Tất Cả"}
            )
          </button>
          <button
            style={styles.btnCreate}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus size={14} style={{ marginRight: "6px" }} />
            {showAddForm ? "Đóng Form" : "Thêm Proxy Mới"}
          </button>
        </div>
      </header>

      {/* Add Proxy Form */}
      {showAddForm && (
        <section style={styles.formCard}>
          <h3 style={styles.cardTitle}>Thêm Proxy Mới</h3>
          <form onSubmit={handleAddProxy} style={styles.form}>
            <div style={styles.tabSelector}>
              <div
                style={{
                  fontSize: "12px",
                  color: theme.colors.textSecondary,
                  marginBottom: "8px",
                }}
              >
                Chọn một trong hai phương thức thêm:
              </div>
            </div>

            <div style={styles.grid2}>
              {/* Cột 1: Nhập tay */}
              <div style={styles.formColumn}>
                <h4 style={styles.subFormTitle}>1. Nhập Thủ Công</h4>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Tên Gợi Nhớ</label>
                  <input
                    type="text"
                    value={proxyName}
                    onChange={(e) => setProxyName(e.target.value)}
                    style={styles.input}
                    placeholder="Ví dụ: Proxy US_01"
                  />
                </div>
                <div style={styles.grid2}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Loại Proxy</label>
                    <select
                      value={proxyType}
                      onChange={(e) => setProxyType(e.target.value as any)}
                      style={styles.select}
                    >
                      <option value="socks5">SOCKS5</option>
                      <option value="http">HTTP</option>
                    </select>
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Cổng (Port)</label>
                    <input
                      type="number"
                      value={proxyPort}
                      onChange={(e) => setProxyPort(Number(e.target.value))}
                      style={styles.input}
                    />
                  </div>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Địa chỉ IP / Host</label>
                  <input
                    type="text"
                    value={proxyHost}
                    onChange={(e) => handleProxyHostChange(e.target.value)}
                    style={styles.input}
                    placeholder="Ví dụ: 192.168.1.1"
                  />
                </div>
                <div style={styles.grid2}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Username (Nếu có)</label>
                    <input
                      type="text"
                      value={proxyUser}
                      onChange={(e) => setProxyUser(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Password (Nếu có)</label>
                    <input
                      type="password"
                      value={proxyPass}
                      onChange={(e) => setProxyPass(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>
              </div>

              {/* Cột 2: Nhập nhanh */}
              <div style={styles.formColumn}>
                <h4 style={styles.subFormTitle}>
                  2. Nhập Nhanh Hàng Loạt (Quick Paste)
                </h4>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Dán chuỗi định dạng (Mỗi proxy 1 dòng)
                  </label>
                  <textarea
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    style={styles.textarea}
                    placeholder="Ví dụ định dạng SOCKS5:&#10;192.168.1.10:1080&#10;192.168.1.11:1080:user:pass"
                  />
                </div>
              </div>
            </div>

            <div style={styles.formFooter}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={styles.btnCancel}
              >
                Hủy Bỏ
              </button>
              <button type="submit" style={styles.btnSave}>
                Thêm Vào Cơ Sở Dữ Liệu
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Proxies Table */}
      <section style={styles.tableCard}>
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <RefreshCw
                size={24}
                style={{
                  animation: "spin 1s linear infinite",
                  color: theme.colors.accent,
                }}
              />
              <div style={{ marginTop: "10px" }}>
                Đang tải danh sách proxy...
              </div>
            </div>
          ) : proxies.length > 0 ? (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th
                    style={{ ...styles.th, width: "40px", textAlign: "center" }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        proxies.length > 0 &&
                        selectedIds.length === proxies.length
                      }
                      onChange={handleSelectAllToggle}
                      style={styles.checkbox}
                    />
                  </th>
                  <th
                    style={{ ...styles.th, width: "180px", minWidth: "100px" }}
                  >
                    Tên gợi nhớ
                  </th>
                  <th style={styles.th}>Loại</th>
                  <th style={styles.th}>Địa chỉ (Host:Port)</th>
                  <th style={styles.th}>Exit IP thực tế</th>
                  <th
                    style={{ ...styles.th, width: "100px", minWidth: "80px" }}
                  >
                    Ping
                  </th>
                  <th
                    style={{ ...styles.th, width: "120px", minWidth: "100px" }}
                  >
                    Trạng thái
                  </th>
                  <th
                    className="sticky-action-header"
                    style={{ ...styles.th, textAlign: "right" }}
                  >
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {proxies.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  const isChecking = checkingIds.includes(p.id);

                  return (
                    <tr
                      key={p.id}
                      style={{
                        ...styles.tr,
                        background: isSelected
                          ? "rgba(79, 70, 229, 0.03)"
                          : "none",
                      }}
                    >
                      <td style={{ ...styles.td, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectToggle(p.id)}
                          style={styles.checkbox}
                        />
                      </td>
                      <td style={{ ...styles.td, fontWeight: 600 }}>
                        {p.name}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.proxyBadge}>
                          {p.proxyType.toUpperCase()}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {p.proxyHost}:{p.proxyPort}
                      </td>
                      <td style={styles.td}>
                        {p.exitIp ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <strong>{p.exitIp}</strong>
                            {p.country && (
                              <span style={styles.countryBadge}>
                                {p.country}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: theme.colors.textMuted }}>
                            Chưa check
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {p.ping ? (
                          `${p.ping} ms`
                        ) : (
                          <span style={{ color: theme.colors.textMuted }}>
                            -
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {isChecking ? (
                          <span style={styles.statusChecking}>
                            <RefreshCw
                              size={12}
                              style={{
                                marginRight: "6px",
                                display: "inline",
                                verticalAlign: "middle",
                                animation: "spin 1s linear infinite",
                              }}
                            />
                            Checking...
                          </span>
                        ) : p.status === "live" ? (
                          <span style={styles.statusLive}>
                            <CheckCircle2
                              size={12}
                              style={{
                                marginRight: "6px",
                                display: "inline",
                                verticalAlign: "middle",
                              }}
                            />
                            Live
                          </span>
                        ) : p.status === "dead" ? (
                          <span style={styles.statusDead}>
                            <AlertTriangle
                              size={12}
                              style={{
                                marginRight: "6px",
                                display: "inline",
                                verticalAlign: "middle",
                              }}
                            />
                            Dead
                          </span>
                        ) : (
                          <span style={styles.statusUnknown}>
                            <HelpCircle
                              size={12}
                              style={{
                                marginRight: "6px",
                                display: "inline",
                                verticalAlign: "middle",
                              }}
                            />
                            Unknown
                          </span>
                        )}
                      </td>
                      <td
                        className="sticky-action-cell"
                        style={{ ...styles.td, textAlign: "right" }}
                      >
                        <div style={styles.actions}>
                          <button
                            style={
                              isChecking
                                ? {
                                    ...styles.btnCheck,
                                    opacity: 0.5,
                                    cursor: "not-allowed",
                                  }
                                : styles.btnCheck
                            }
                            onClick={() => handleCheckProxy(p.id)}
                            disabled={isChecking}
                            title="Kiểm tra kết nối"
                          >
                            <RefreshCw
                              size={12}
                              style={{
                                animation: isChecking
                                  ? "spin 1s linear infinite"
                                  : "none",
                              }}
                            />
                          </button>
                          <button
                            style={styles.btnDelete}
                            onClick={() => handleDeleteProxy(p.id, p.name)}
                            title="Xóa"
                          >
                            <Trash2 size={12} />
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
              <Globe
                size={48}
                style={{ color: theme.colors.textMuted, marginBottom: "15px" }}
              />
              <div>
                Chưa có Proxy nào được lưu trong cơ sở dữ liệu tập trung.
              </div>
              <button
                style={styles.btnCreateEmpty}
                onClick={() => setShowAddForm(true)}
              >
                Thêm Proxy Đầu Tiên
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "30px",
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
  btnCheckBulk: {
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
    transition: "all 0.2s",
  },
  formCard: {
    background: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: "16px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  cardTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 700,
    color: theme.colors.textPrimary,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  tabSelector: {
    borderBottom: `1px solid ${theme.colors.border}`,
    paddingBottom: "10px",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  },
  formColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  subFormTitle: {
    margin: "0 0 5px 0",
    fontSize: "13px",
    fontWeight: 600,
    color: theme.colors.accent,
    textTransform: "uppercase",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "11px",
    fontWeight: 600,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
  },
  input: {
    background: "rgba(255, 255, 255, 0.02)",
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.input,
    padding: "10px 14px",
    color: theme.colors.textPrimary,
    fontSize: "13px",
    outline: "none",
  },
  select: {
    background: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.input,
    padding: "10px 14px",
    color: theme.colors.textPrimary,
    fontSize: "13px",
    outline: "none",
    cursor: "pointer",
  },
  textarea: {
    background: "rgba(255, 255, 255, 0.02)",
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.input,
    padding: "12px 14px",
    color: theme.colors.textPrimary,
    fontSize: "13px",
    outline: "none",
    minHeight: "140px",
    fontFamily: "monospace",
    resize: "vertical",
  },
  formFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    borderTop: `1px solid ${theme.colors.border}`,
    paddingTop: "15px",
  },
  btnCancel: {
    background: "none",
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.textSecondary,
    padding: "10px 20px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSave: {
    background: theme.colors.accent,
    color: theme.colors.textPrimary,
    border: "none",
    padding: "10px 24px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  tableCard: {
    background: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: "16px",
    overflow: "hidden",
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
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  tr: {
    borderBottom: `1px solid ${theme.colors.border}`,
    transition: "background 0.2s",
  },
  td: {
    padding: "14px 24px",
    fontSize: "13px",
    verticalAlign: "middle",
  },
  checkbox: {
    width: "14px",
    height: "14px",
    cursor: "pointer",
  },
  proxyBadge: {
    background: "rgba(79, 70, 229, 0.08)",
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.accent,
    padding: "2px 6px",
    borderRadius: "6px",
    fontSize: "10px",
    fontWeight: 700,
  },
  countryBadge: {
    background: "rgba(255, 255, 255, 0.06)",
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.textPrimary,
    padding: "1px 5px",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: 600,
    textTransform: "uppercase",
  },
  userPassText: {
    fontFamily: "monospace",
    fontSize: "12px",
  },
  statusChecking: {
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
  statusLive: {
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
  statusDead: {
    background: theme.colors.dangerBg,
    border: `1px solid ${theme.colors.dangerBorder}`,
    color: theme.colors.danger,
    padding: "4px 10px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
  },
  statusUnknown: {
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
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
  },
  btnCheck: {
    background: "rgba(255, 255, 255, 0.02)",
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.textPrimary,
    borderRadius: "6px",
    padding: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDelete: {
    background: theme.colors.dangerBg,
    border: `1px solid ${theme.colors.dangerBorder}`,
    color: theme.colors.danger,
    borderRadius: "6px",
    padding: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingState: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "60px 0",
    color: theme.colors.textSecondary,
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
  btnCreateEmpty: {
    background: theme.colors.accent,
    color: theme.colors.textPrimary,
    border: "none",
    padding: "10px 20px",
    borderRadius: theme.radius.button,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "20px",
  },
};
