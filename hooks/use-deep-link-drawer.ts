import { useEffect, useRef } from 'react';
import { Linking, Platform } from 'react-native';
import {
  getStoredPrinter,
  getStoredSettings,
  openCashDrawer,
  DEFAULT_DRAWER_COMMAND,
  DEFAULT_TIMEOUT,
} from '@/lib/bluetooth';

/**
 * Hook que escucha el deep link abrircajon://open
 * Cuando la app recibe ese intent (desde TakeAway u otra app),
 * ejecuta openCashDrawer por Bluetooth sin mostrar ninguna pantalla.
 *
 * Solo activo en Android (donde está el Bluetooth Classic).
 */
export function useDeepLinkDrawer() {
  const openingRef = useRef(false);

  const handleUrl = async (url: string) => {
    if (!url.startsWith('abrircajon://')) return;
    if (openingRef.current) return;

    console.log('[deep-link-drawer] Intent recibido:', url);
    openingRef.current = true;

    try {
      const printer = await getStoredPrinter();
      if (!printer) {
        console.warn('[deep-link-drawer] No hay impresora configurada');
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

      console.log('[deep-link-drawer] Cajón abierto correctamente');
    } catch (err) {
      console.error('[deep-link-drawer] Error al abrir el cajón:', err);
    } finally {
      openingRef.current = false;
    }
  };

  useEffect(() => {
    // Solo en Android
    if (Platform.OS !== 'android') return;

    // Escuchar deep links mientras la app está en primer o segundo plano
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    // Comprobar si la app fue abierta directamente por el deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
