import { createElement, PropsWithChildren, createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

import { getApiBaseUrl } from "@/constants/oauth";
import {
  DEFAULT_DRAWER_COMMAND,
  DEFAULT_TIMEOUT,
  getStoredPrinter,
  getStoredSettings,
  openCashDrawer,
} from "@/lib/bluetooth";

type DrawerBridgeStatus = {
  supported: boolean;
  active: boolean;
  lastEvent: string;
};

const POLLING_INTERVAL_MS = 2000;
const MAX_PENDING_AGE_MS = 10000;

const DrawerPollingContext = createContext<DrawerBridgeStatus>({
  supported: false,
  active: false,
  lastEvent: "El puente todavía no está inicializado.",
});

export function DrawerPollingProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<DrawerBridgeStatus>({
    supported: Platform.OS === "android",
    active: false,
    lastEvent:
      Platform.OS === "android"
        ? "Esperando la configuración de la impresora y las solicitudes del servidor."
        : "El puente Bluetooth solo está disponible en Android.",
  });

  useEffect(() => {
    if (Platform.OS !== "android") {
      setStatus({
        supported: false,
        active: false,
        lastEvent: "El puente Bluetooth solo está disponible en Android.",
      });
      return;
    }

    const apiBase = getApiBaseUrl();
    if (!apiBase) {
      setStatus({
        supported: true,
        active: false,
        lastEvent: "No se pudo determinar la URL del servidor para escuchar solicitudes remotas.",
      });
      return;
    }

    let isMounted = true;
    let opening = false;

    const safeSetStatus = (nextStatus: DrawerBridgeStatus) => {
      if (isMounted) {
        setStatus(nextStatus);
      }
    };

    safeSetStatus({
      supported: true,
      active: true,
      lastEvent: "Puente Android activo. Escuchando solicitudes remotas del cajón.",
    });

    const poll = async () => {
      if (opening) {
        return;
      }

      try {
        const response = await fetch(`${apiBase}/api/drawer-pending`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          pending: { id: string; timestamp: number } | null;
        };

        if (!data.pending) {
          return;
        }

        if (Date.now() - data.pending.timestamp > MAX_PENDING_AGE_MS) {
          safeSetStatus({
            supported: true,
            active: true,
            lastEvent: "Se ignoró una solicitud antigua de apertura del cajón.",
          });
          return;
        }

        opening = true;
        safeSetStatus({
          supported: true,
          active: true,
          lastEvent: `Solicitud recibida. Intentando abrir el cajón (${data.pending.id}).`,
        });

        try {
          const printer = await getStoredPrinter();
          if (!printer) {
            safeSetStatus({
              supported: true,
              active: true,
              lastEvent: "Se recibió una solicitud, pero no hay impresora configurada en la tablet.",
            });
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

          safeSetStatus({
            supported: true,
            active: true,
            lastEvent: `Cajón abierto correctamente en ${printer.name}.`,
          });
        } catch (error) {
          safeSetStatus({
            supported: true,
            active: true,
            lastEvent:
              error instanceof Error
                ? `Error al abrir el cajón: ${error.message}`
                : "Error desconocido al abrir el cajón desde la solicitud remota.",
          });
        } finally {
          opening = false;
        }
      } catch {
        safeSetStatus({
          supported: true,
          active: true,
          lastEvent: "No se pudo consultar el servidor en este momento. Reintentando automáticamente.",
        });
      }
    };

    const intervalId = setInterval(() => {
      void poll();
    }, POLLING_INTERVAL_MS);

    void poll();

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return createElement(DrawerPollingContext.Provider, { value: status }, children);
}

export function useDrawerPollingStatus() {
  return useContext(DrawerPollingContext);
}
