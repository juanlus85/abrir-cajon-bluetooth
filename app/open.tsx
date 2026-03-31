import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { router } from 'expo-router';

import MyModule from '@/modules/my-module';
import {
  DEFAULT_DRAWER_COMMAND,
  DEFAULT_TIMEOUT,
  getStoredPrinter,
  getStoredSettings,
  openCashDrawer,
} from '@/lib/bluetooth';

const ANDROID_HIDE_DELAY_MS = 60;

export default function OpenDrawerScreen() {
  useEffect(() => {
    let cancelled = false;

    async function returnToMainFlowAndHideApp() {
      if (cancelled) return;

      router.replace('/(tabs)');

      if (Platform.OS !== 'android') {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, ANDROID_HIDE_DELAY_MS));

      if (cancelled) return;

      try {
        await MyModule.moveTaskToBackAsync();
      } catch (error) {
        console.warn('[open-screen] No se pudo enviar la app a segundo plano:', error);
      }
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
        void returnToMainFlowAndHideApp();
      }
    }

    void handleOpen();

    return () => {
      cancelled = true;
    };
  }, []);

  return <View style={{ flex: 1, backgroundColor: 'transparent' }} />;
}
