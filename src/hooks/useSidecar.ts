import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { NodeSidecarBridge } from '../lib/bridge/NodeSidecarBridge';

export interface SidecarMap {
  nodejs?: NodeSidecarBridge;
}

export function useSidecar() {
  const [sidecars, setSidecars] = useState<SidecarMap>({});
  const [bootMessage, setBootMessage] = useState('Initializing application...');
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
          console.log(`[useSidecar Hook] Received 'sidecar:ready' event from ${name} at port ${port}`);
          
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
          console.log('[useSidecar Hook] Received boot status:', event.payload);
          setBootMessage(event.payload);
        });

        // 3. Lắng nghe khi tất cả sidecars đã sẵn sàng
        unlistenAllReady = await listen<void>('sidecar:all-ready', () => {
          console.log('[useSidecar Hook] All sidecars are ready to run!');
          setAllReady(true);
        });
      } catch (err) {
        console.error('Error registering Tauri event listener:', err);
      }
    }

    async function checkInitialStatus() {
      try {
        const statuses = await invoke<Record<string, { name: string; port: number | null; status: any }>>('get_sidecars_status');
        console.log('[useSidecar Hook] Initial sidecars status from Rust:', statuses);
        
        if (statuses.nodejs && statuses.nodejs.status === 'Ready' && statuses.nodejs.port) {
          const port = statuses.nodejs.port;
          console.log(`[useSidecar Hook] Sidecar nodejs is already ready at port ${port}. Initializing bridge...`);
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
        console.error('Error getting initial sidecar status:', err);
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
