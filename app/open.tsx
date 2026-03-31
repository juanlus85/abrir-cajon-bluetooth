import { useEffect } from 'react';
import { BackHandler, Platform, View } from 'react-native';
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

    function leaveScreen() {
      if (cancelled) return;

      if (Platform.OS === 'android') {
        setTimeout(() => {
          BackHandler.exitApp();
        }, 0);
        return;
      }

      router.replace('/(tabs)');
    }

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
        leaveScreen();
      }
    }

    void handleOpen();

    return () => {
      cancelled = true;
    };
  }, []);

  return <View style={{ flex: 1, backgroundColor: 'transparent' }} />;
}
