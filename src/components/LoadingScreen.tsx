import React from 'react';

interface LoadingScreenProps {
  message: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  return (
    <div style={styles.container}>
      <div style={styles.backgroundGlow1}></div>
      <div style={styles.backgroundGlow2}></div>
      
      <div style={styles.glassCard}>
        <div style={styles.spinnerContainer}>
          <div style={styles.outerSpinner}></div>
          <div style={styles.innerSpinner}></div>
          <div style={styles.centerDot}></div>
        </div>
        
        <h2 style={styles.title}>Preparing system</h2>
        <p style={styles.message}>{message}</p>
        
        <div style={styles.progressBar}>
          <div style={styles.progressFill}></div>
        </div>
        
        <span style={styles.hint}>First-time run may take 1-2 minutes to set up the Node.js environment.</span>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100vw',
    height: '100vh',
    background: '#0d0e12',
    fontFamily: "'Outfit', 'Inter', sans-serif",
    position: 'relative',
    overflow: 'hidden',
    color: '#ffffff',
  },
  backgroundGlow1: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    background: 'rgba(99, 102, 241, 0.15)', // Indigo glow
    borderRadius: '50%',
    filter: 'blur(80px)',
    top: '10%',
    left: '10%',
  },
  backgroundGlow2: {
    position: 'absolute',
    width: '350px',
    height: '350px',
    background: 'rgba(236, 72, 153, 0.12)', // Pink glow
    borderRadius: '50%',
    filter: 'blur(90px)',
    bottom: '10%',
    right: '10%',
  },
  glassCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 50px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    width: '80%',
    maxWidth: '460px',
    zIndex: 10,
    textAlign: 'center',
  },
  spinnerContainer: {
    position: 'relative',
    width: '80px',
    height: '80px',
    marginBottom: '30px',
  },
  outerSpinner: {
    boxSizing: 'border-box',
    position: 'absolute',
    width: '100%',
    height: '100%',
    border: '4px solid transparent',
    borderTopColor: '#6366f1',
    borderBottomColor: '#ec4899',
    borderRadius: '50%',
    animation: 'spin 1.5s linear infinite',
  },
  innerSpinner: {
    boxSizing: 'border-box',
    position: 'absolute',
    width: '80%',
    height: '80%',
    top: '10%',
    left: '10%',
    border: '3px solid transparent',
    borderLeftColor: '#10b981',
    borderRightColor: '#f59e0b',
    borderRadius: '50%',
    animation: 'spin-reverse 1.2s linear infinite',
  },
  centerDot: {
    position: 'absolute',
    width: '8px',
    height: '8px',
    background: '#ffffff',
    borderRadius: '50%',
    top: 'calc(50% - 4px)',
    left: 'calc(50% - 4px)',
    boxShadow: '0 0 10px #ffffff',
  },
  title: {
    margin: '0 0 10px 0',
    fontSize: '22px',
    fontWeight: 600,
    letterSpacing: '-0.5px',
    background: 'linear-gradient(90deg, #a5b4fc, #fbcfe8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  message: {
    margin: '0 0 25px 0',
    fontSize: '15px',
    color: '#9ca3af',
    fontWeight: 400,
    minHeight: '22px',
  },
  progressBar: {
    width: '100%',
    height: '4px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '20px',
  },
  progressFill: {
    width: '45%', // Giả lập tiến trình hoặc chạy vô hạn
    height: '100%',
    background: 'linear-gradient(90deg, #6366f1, #ec4899)',
    borderRadius: '2px',
    animation: 'loading-bar 2s ease-in-out infinite',
  },
  hint: {
    fontSize: '11px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
};

// Chèn CSS animation bằng javascript để giữ file sạch sẽ và chạy trực tiếp mà không cần cấu hình CSS
const styleSheet = document.createElement('style');
styleSheet.type = 'text/css';
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes spin-reverse {
    0% { transform: rotate(360deg); }
    100% { transform: rotate(0deg); }
  }
  @keyframes loading-bar {
    0% { transform: translateX(-100%); }
    50% { transform: translateX(100%); }
    100% { transform: translateX(-100%); }
  }
`;
document.head.appendChild(styleSheet);
