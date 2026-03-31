import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import {
  DEFAULT_DRAWER_COMMAND,
  DEFAULT_TIMEOUT,
  getStoredPrinter,
  getStoredSettings,
  openCashDrawer,
} from '@/lib/bluetooth';

export default function OpenDrawerScreen() {
  useEffect(() => {
    let cancelled = false;

    async function handleOpen() {
      try {
        const printer = await getStoredPrinter();
        if (!printer) {
          console.warn('[open-screen] No hay impresora configurada');
          return;
        }

        const settings = await getStoredSettings().catch(() => ({
          commandHex: DEFAULT_DRAWER_COMMAND,
          timeoutMs: DEFAULT_TIMEOUT,
        }));

        await openCashDrawer({
          printer,
          commandHex: settings.commandHex,
          timeoutMs: settings.timeoutMs,
        });

        console.log('[open-screen] Cajón abierto correctamente');
      } catch (error) {
        console.error('[open-screen] Error al abrir el cajón:', error);
      } finally {
        if (!cancelled) {
          router.replace('/(tabs)');
        }
      }
    }

    void handleOpen();

    return () => {
      cancelled = true;
    };
  }, []);

  return <View style={{ flex: 1, backgroundColor: 'transparent' }} />;
}
