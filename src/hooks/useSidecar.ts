import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { NodeSidecarBridge } from '../lib/bridge/NodeSidecarBridge';

export interface SidecarMap {
  nodejs?: NodeSidecarBridge;
}

export function useSidecar() {
  const [sidecars, setSidecars] = useState<SidecarMap>({});
  const [bootMessage, setBootMessage] = useState('Đang khởi tạo ứng dụng...');
  const [allReady, setAllReady] = useState(false);

  useEffect(() => {
    let unlistenReady: (() => void) | null = null;
    let unlistenStatus: (() => void) | null = null;
    let unlistenAllReady: (() => void) | null = null;

    async function setupListeners() {
      try {
        // 1. Lắng nghe sự kiện một sidecar cụ thể đã ready
        unlistenReady = await listen<{ name: string; port: number }>('sidecar:ready', (event) => {
          const { name, port } = event.payload;
          console.log(`[useSidecar Hook] Nhận event 'sidecar:ready' từ ${name} tại port ${port}`);
          
          setSidecars((prev) => {
            const next = { ...prev };
            if (name === 'nodejs') {
              // Hủy bridge cũ nếu có trước khi tạo mới để tránh rò rỉ socket
              if (next.nodejs) {
                next.nodejs.destroy();
              }
              next.nodejs = new NodeSidecarBridge(port);
            }
            return next;
          });
        });

        // 2. Lắng nghe cập nhật trạng thái boot từ Rust
        unlistenStatus = await listen<string>('boot:status', (event) => {
          console.log('[useSidecar Hook] Nhận status boot:', event.payload);
          setBootMessage(event.payload);
        });

        // 3. Lắng nghe khi tất cả sidecars đã sẵn sàng
        unlistenAllReady = await listen<void>('sidecar:all-ready', () => {
          console.log('[useSidecar Hook] Tất cả sidecars đã sẵn sàng hoạt động!');
          setAllReady(true);
        });
      } catch (err) {
        console.error('Lỗi khi đăng ký lắng nghe sự kiện Tauri:', err);
      }
    }

    async function checkInitialStatus() {
      try {
        const statuses = await invoke<Record<string, { name: string; port: number | null; status: any }>>('get_sidecars_status');
        console.log('[useSidecar Hook] Trạng thái sidecars ban đầu từ Rust:', statuses);
        
        if (statuses.nodejs && statuses.nodejs.status === 'Ready' && statuses.nodejs.port) {
          const port = statuses.nodejs.port;
          console.log(`[useSidecar Hook] Sidecar nodejs đã ready từ trước tại port ${port}. Đang khởi tạo bridge...`);
          setSidecars((prev) => {
            const next = { ...prev };
            if (next.nodejs) {
              next.nodejs.destroy();
            }
            next.nodejs = new NodeSidecarBridge(port);
            return next;
          });
          setAllReady(true);
        }
      } catch (err) {
        console.error('Lỗi khi lấy trạng thái sidecars ban đầu:', err);
      }
    }

    async function init() {
      await setupListeners();
      await checkInitialStatus();
    }

    init();

    // Cleanup khi component unmount
    return () => {
      if (unlistenReady) unlistenReady();
      if (unlistenStatus) unlistenStatus();
      if (unlistenAllReady) unlistenAllReady();
      
      // Hủy toàn bộ kết nối socket khi unmount
      setSidecars((prev) => {
        if (prev.nodejs) {
          prev.nodejs.destroy();
        }
        return {};
      });
    };
  }, []);

  return { sidecars, allReady, bootMessage };
}
