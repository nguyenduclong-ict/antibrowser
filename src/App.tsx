import React, { useEffect, useState } from 'react';
import { useSidecar } from './hooks/useSidecar';
import { LoadingScreen } from './components/LoadingScreen';
import { invoke } from '@tauri-apps/api/core';
import { User } from './lib/bridge/NodeSidecarBridge';

export default function App() {
  const { sidecars, allReady, bootMessage } = useSidecar();
  const [users, setUsers] = useState<User[]>([]);
  const [socketLogs, setSocketLogs] = useState<string[]>([]);
  const [inputPing, setInputPing] = useState('Hello Sidecar!');
  const [restStatus, setRestStatus] = useState<'checking' | 'ok' | 'failed'>('checking');
  const [isRestarting, setIsRestarting] = useState(false);

  const nodeBridge = sidecars.nodejs;

  // Listen to realtime socket events from sidecar when ready
  useEffect(() => {
    if (!nodeBridge) return;

    // 1. Check REST API health
    const checkHealth = async () => {
      try {
        const health = await nodeBridge.getHealth();
        if (health.status === 'ok') {
          setRestStatus('ok');
          // Get sample user list
          const userList = await nodeBridge.getListUsers();
          setUsers(userList);
        } else {
          setRestStatus('failed');
        }
      } catch (err) {
        console.error('REST sidecar check error:', err);
        setRestStatus('failed');
      }
    };

    checkHealth();

    // 2. Register socket.io event listeners
    const addLog = (msg: string) => {
      setSocketLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
    };

    nodeBridge.on('connect', () => {
      addLog('Socket connected successfully to Node.js Sidecar!');
    });

    nodeBridge.on('welcome', (data: { message: string }) => {
      addLog(`[Event welcome] Sidecar sent: "${data.message}"`);
    });

    nodeBridge.on('pong-event', (data: { reply: string; time: string }) => {
      addLog(`[Event pong-event] Sidecar replied: "${data.reply}" at ${data.time}`);
    });

    nodeBridge.on('disconnect', () => {
      addLog('Socket disconnected from Node.js Sidecar!');
    });

    return () => {
      // socket.io listener cleanup automatically in useSidecar or manually
      nodeBridge.off('connect', () => {});
      nodeBridge.off('welcome', () => {});
      nodeBridge.off('pong-event', () => {});
      nodeBridge.off('disconnect', () => {});
    };
  }, [nodeBridge]);

  // Send ping via socket
  const handleSendPing = () => {
    if (!nodeBridge) return;
    nodeBridge.pingSocket({ message: inputPing });
    setSocketLogs((prev) => [`[${new Date().toLocaleTimeString()}] [Send ping-event] sent: "${inputPing}"`, ...prev]);
  };

  // Call Tauri Command to hot restart sidecar
  const handleRestartSidecar = async () => {
    if (isRestarting) return;
    setIsRestarting(true);
    setRestStatus('checking');
    setUsers([]);
    setSocketLogs((prev) => [`[System] Sending hot restart command to Tauri...`, ...prev]);
    try {
      await invoke('restart_sidecar', { name: 'nodejs' });
      setSocketLogs((prev) => [`[System] Restart command sent successfully. Waiting for sidecar to re-connect...`, ...prev]);
    } catch (err) {
      console.error(err);
      setSocketLogs((prev) => [`[System Error] Restart failed: ${err}`, ...prev]);
    } finally {
      setIsRestarting(false);
    }
  };

  if (!allReady || !nodeBridge) {
    return <LoadingScreen message={bootMessage} />;
  }

  return (
    <div style={styles.appContainer}>
      {/* Background decorations */}
      <div style={styles.glow1}></div>
      <div style={styles.glow2}></div>

      {/* Main Card */}
      <div style={styles.mainCard}>
        {/* Header */}
        <header style={styles.header}>
          <div>
            <h1 style={styles.appTitle}>Tauri Node.js Bridge</h1>
            <p style={styles.appSubtitle}>Base project template with dynamically managed Node.js sidecar</p>
          </div>
          <button 
            style={isRestarting ? { ...styles.btnRestart, opacity: 0.5 } : styles.btnRestart} 
            onClick={handleRestartSidecar}
            disabled={isRestarting}
          >
            {isRestarting ? 'Restarting...' : 'Restart Sidecar 🔄'}
          </button>
        </header>

        {/* Status Section */}
        <section style={styles.statusGrid}>
          <div style={styles.statusCard}>
            <span style={styles.statusLabel}>Axum Server (Tauri)</span>
            <span style={styles.statusValueOk}>Running 🟢</span>
          </div>
          <div style={styles.statusCard}>
            <span style={styles.statusLabel}>Sidecar Node.js REST</span>
            <span style={restStatus === 'ok' ? styles.statusValueOk : styles.statusValueErr}>
              Port {nodeBridge.port} {restStatus === 'ok' ? '🟢' : '🔴'}
            </span>
          </div>
          <div style={styles.statusCard}>
            <span style={styles.statusLabel}>Realtime WebSockets</span>
            <span style={nodeBridge.socket.connected ? styles.statusValueOk : styles.statusValueErr}>
              {nodeBridge.socket.connected ? 'Connected 🟢' : 'Disconnected 🔴'}
            </span>
          </div>
        </section>

        {/* Main Content split */}
        <div style={styles.contentSplit}>
          {/* Left panel: Users from REST */}
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>REST API: /api/list-users</h3>
            <div style={styles.userListContainer}>
              {users.length > 0 ? (
                users.map((user) => (
                  <div key={user.id} style={styles.userCard}>
                    <div style={styles.userAvatar}>{user.name[0]}</div>
                    <div>
                      <h4 style={styles.userName}>{user.name}</h4>
                      <p style={styles.userDetail}>User ID: #{user.id}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div style={styles.emptyState}>Loading data from REST API...</div>
              )}
            </div>
          </div>

          {/* Right panel: Realtime logs over Socket.io */}
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>WebSockets: Socket.io Realtime</h3>
            
            <div style={styles.inputGroup}>
              <input 
                type="text" 
                value={inputPing} 
                onChange={(e) => setInputPing(e.target.value)} 
                style={styles.inputText}
                placeholder="Ping message content..."
              />
              <button onClick={handleSendPing} style={styles.btnSend}>Send Ping ⚡</button>
            </div>

            <div style={styles.logsConsole}>
              {socketLogs.length > 0 ? (
                socketLogs.map((log, index) => (
                  <div key={index} style={styles.logLine}>{log}</div>
                ))
              ) : (
                <div style={styles.emptyState}>No event logs yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer style={styles.footer}>
          <span>Premium & Dynamic template designed by Antigravity AI</span>
          <span>Tauri v2 + Hono + Socket.io + React TS</span>
        </footer>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  appContainer: {
    width: '100vw',
    height: '100vh',
    background: '#0a0b0d',
    color: '#f3f4f6',
    fontFamily: "'Outfit', 'Inter', sans-serif",
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
  },
  glow1: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    background: 'rgba(99, 102, 241, 0.08)',
    borderRadius: '50%',
    filter: 'blur(100px)',
    top: '-5%',
    right: '5%',
  },
  glow2: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    background: 'rgba(16, 185, 129, 0.06)',
    borderRadius: '50%',
    filter: 'blur(100px)',
    bottom: '-5%',
    left: '5%',
  },
  mainCard: {
    width: '100%',
    maxWidth: '960px',
    height: '100%',
    maxHeight: '680px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '24px',
    boxShadow: '0 30px 60px rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    display: 'flex',
    flexDirection: 'column',
    padding: '30px',
    boxSizing: 'border-box',
    zIndex: 10,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    paddingBottom: '20px',
    marginBottom: '20px',
  },
  appTitle: {
    margin: '0 0 5px 0',
    fontSize: '24px',
    fontWeight: 700,
    background: 'linear-gradient(90deg, #818cf8, #34d399)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px',
  },
  appSubtitle: {
    margin: 0,
    fontSize: '13px',
    color: '#9ca3af',
  },
  btnRestart: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    padding: '8px 16px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    marginBottom: '20px',
  },
  statusCard: {
    background: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '16px',
    padding: '12px 18px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  statusLabel: {
    fontSize: '11px',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  statusValueOk: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#34d399',
  },
  statusValueErr: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#f87171',
  },
  contentSplit: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.2fr',
    gap: '20px',
    flex: 1,
    minHeight: 0, // Quan trọng để flex child không overflow
    marginBottom: '20px',
  },
  panel: {
    background: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  panelTitle: {
    margin: '0 0 15px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#e5e7eb',
    borderLeft: '3px solid #818cf8',
    paddingLeft: '10px',
  },
  userListContainer: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#818cf8',
    color: '#ffffff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 600,
    fontSize: '14px',
  },
  userName: {
    margin: 0,
    fontSize: '13px',
    fontWeight: 600,
    color: '#f3f4f6',
  },
  userDetail: {
    margin: 0,
    fontSize: '11px',
    color: '#9ca3af',
  },
  emptyState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    color: '#6b7280',
    fontSize: '13px',
  },
  inputGroup: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px',
  },
  inputText: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '10px',
    padding: '8px 12px',
    color: '#ffffff',
    fontSize: '13px',
    outline: 'none',
  },
  btnSend: {
    background: '#818cf8',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  logsConsole: {
    flex: 1,
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    borderRadius: '12px',
    padding: '12px',
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: '11px',
    color: '#34d399',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  logLine: {
    lineHeight: '1.4',
    wordBreak: 'break-all',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '11px',
    color: '#4b5563',
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    paddingTop: '15px',
  },
};
