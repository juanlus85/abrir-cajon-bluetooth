import { ScreenContainer } from '@/components/screen-container';
import { haptic } from '@/lib/haptics';
import { safeStorage } from '@/lib/storage';
import {
  DEFAULT_DRAWER_COMMAND,
  DEFAULT_TIMEOUT,
  DrawerSettings,
  getBluetoothAvailabilitySummary,
  getBondedPrinters,
  getStoredPrinter,
  getStoredSettings,
  openCashDrawer,
  PrinterDevice,
  saveStoredPrinter,
  saveStoredSettings,
} from '@/lib/bluetooth';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface ActionState {
  tone: 'neutral' | 'success' | 'error' | 'warning';
  title: string;
  detail: string;
}

const LAST_STATUS_KEY = 'drawer:last-status';

const initialState: ActionState = {
  tone: 'neutral',
  title: 'Listo para abrir',
  detail:
    'Selecciona la impresora Bluetooth y pulsa el botón principal cuando quieras abrir el cajón.',
};

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [printer, setPrinter] = useState<PrinterDevice | null>(null);
  const [settings, setSettings] = useState<DrawerSettings>({
    commandHex: DEFAULT_DRAWER_COMMAND,
    timeoutMs: DEFAULT_TIMEOUT,
  });
  const [status, setStatus] = useState<ActionState>(initialState);
  const [bluetoothSummary, setBluetoothSummary] = useState('Comprobando Bluetooth...');

  const statusClasses = useMemo(() => {
    switch (status.tone) {
      case 'success':
        return {
          border: 'border-success/30',
          background: 'bg-success/10',
          title: 'text-success',
        };
      case 'error':
        return {
          border: 'border-error/30',
          background: 'bg-error/10',
          title: 'text-error',
        };
      case 'warning':
        return {
          border: 'border-warning/30',
          background: 'bg-warning/10',
          title: 'text-warning',
        };
      default:
        return {
          border: 'border-border',
          background: 'bg-surface',
          title: 'text-foreground',
        };
    }
  }, [status.tone]);

  const loadState = useCallback(async () => {
    let nextPrinter: PrinterDevice | null = null;
    let nextSettings: DrawerSettings = {
      commandHex: DEFAULT_DRAWER_COMMAND,
      timeoutMs: DEFAULT_TIMEOUT,
    };
    let nextBluetoothSummary = 'Bluetooth no disponible todavía.';
    let nextStatus = initialState;

    try {
      try {
        nextPrinter = await getStoredPrinter();
      } catch {
        nextPrinter = null;
      }

      try {
        nextSettings = await getStoredSettings();
      } catch {
        nextSettings = {
          commandHex: DEFAULT_DRAWER_COMMAND,
          timeoutMs: DEFAULT_TIMEOUT,
        };
      }

      try {
        nextBluetoothSummary = await getBluetoothAvailabilitySummary();
      } catch (error) {
        nextBluetoothSummary =
          error instanceof Error
            ? error.message
            : 'No se pudo comprobar el estado de Bluetooth en este entorno.';
      }

      try {
        const lastStatusRaw = await safeStorage.getItem(LAST_STATUS_KEY);
        if (lastStatusRaw) {
          const parsedStatus = JSON.parse(lastStatusRaw) as Partial<ActionState>;
          if (
            parsedStatus &&
            typeof parsedStatus.title === 'string' &&
            typeof parsedStatus.detail === 'string' &&
            ['neutral', 'success', 'error', 'warning'].includes(parsedStatus.tone ?? '')
          ) {
            nextStatus = parsedStatus as ActionState;
          }
        }
      } catch {
        nextStatus = initialState;
      }
    } finally {
      setPrinter(nextPrinter);
      setSettings(nextSettings);
      setBluetoothSummary(nextBluetoothSummary);
      setStatus(nextStatus);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadState();
    }, [loadState]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadState();
  }, [loadState]);

  const persistStatus = useCallback(async (nextStatus: ActionState) => {
    setStatus(nextStatus);
    await safeStorage.setItem(LAST_STATUS_KEY, JSON.stringify(nextStatus));
  }, []);

  const handleOpenDrawer = useCallback(async () => {
    if (!printer) {
      haptic.error();
      await persistStatus({
        tone: 'warning',
        title: 'Falta una impresora',
        detail:
          'Antes de abrir el cajón debes seleccionar una impresora Bluetooth emparejada.',
      });
      return;
    }

    setOpening(true);
    haptic.light();

    try {
      const result = await openCashDrawer({
        printer,
        commandHex: settings.commandHex,
        timeoutMs: settings.timeoutMs,
      });

      const nextStatus: ActionState = {
        tone: 'success',
        title: 'Cajón abierto',
        detail: `Se envió el comando ${result.commandHex} a ${printer.name}.`,
      };
      haptic.success();
      await persistStatus(nextStatus);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo enviar el comando de apertura.';
      const nextStatus: ActionState = {
        tone: 'error',
        title: 'No se pudo abrir',
        detail: message,
      };
      haptic.error();
      await persistStatus(nextStatus);
    } finally {
      setOpening(false);
      try {
        setBluetoothSummary(await getBluetoothAvailabilitySummary());
      } catch (error) {
        setBluetoothSummary(
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar el estado de Bluetooth en este entorno.',
        );
      }
    }
  }, [persistStatus, printer, settings.commandHex, settings.timeoutMs]);

  const handleChoosePrinter = useCallback(() => {
    haptic.selection();
    router.push('/(tabs)/settings' as never);
  }, [router]);

  const handleUseFirstPaired = useCallback(async () => {
    haptic.selection();
    setOpening(true);
    try {
      const printers = await getBondedPrinters();
      if (!printers.length) {
        throw new Error(
          'No hay impresoras Bluetooth emparejadas en esta tablet. Empareja la impresora primero desde Android.',
        );
      }
      await saveStoredPrinter(printers[0]);
      setPrinter(printers[0]);
      await persistStatus({
        tone: 'success',
        title: 'Impresora guardada',
        detail: `Se ha guardado ${printers[0].name} como impresora principal.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar la impresora.';
      await persistStatus({ tone: 'warning', title: 'No fue posible configurar', detail: message });
    } finally {
      setOpening(false);
      try {
        setBluetoothSummary(await getBluetoothAvailabilitySummary());
      } catch (error) {
        setBluetoothSummary(
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar el estado de Bluetooth en este entorno.',
        );
      }
    }
  }, [persistStatus]);

  const handleRestoreDefaults = useCallback(async () => {
    const defaultSettings = {
      commandHex: DEFAULT_DRAWER_COMMAND,
      timeoutMs: DEFAULT_TIMEOUT,
    };
    await saveStoredSettings(defaultSettings);
    setSettings(defaultSettings);
    await persistStatus({
      tone: 'neutral',
      title: 'Configuración restaurada',
      detail: 'Se han restaurado el comando y el tiempo de espera recomendados.',
    });
  }, [persistStatus]);

  if (loading) {
    return (
      <ScreenContainer className="px-6 py-8 justify-center items-center">
        <ActivityIndicator size="large" color="#0F9D58" />
        <Text className="mt-4 text-base text-muted text-center">
          Preparando la utilidad de apertura del cajón...
        </Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5 py-4">
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0F9D58" />
        }
      >
        <View className="gap-4">
          <View className="rounded-[28px] bg-surface border border-border px-5 py-5">
            <Text className="text-sm font-medium text-muted">Apertura rápida</Text>
            <Text className="mt-2 text-[32px] leading-[38px] font-bold text-foreground">
              Abrir cajón
            </Text>
            <Text className="mt-2 text-base leading-6 text-muted">
              Utilidad directa para enviar el comando ESC/POS a la impresora Bluetooth guardada.
            </Text>
          </View>

          <View className="rounded-[24px] bg-surface border border-border px-5 py-5 gap-3">
            <Text className="text-sm font-medium text-muted">Impresora activa</Text>
            <Text className="text-xl font-semibold text-foreground">
              {printer?.name ?? 'Sin impresora seleccionada'}
            </Text>
            <Text className="text-sm text-muted">
              {printer
                ? printer.address
                : 'Selecciona una impresora Bluetooth emparejada para usar la apertura rápida.'}
            </Text>
            <Text className="text-sm text-muted">{bluetoothSummary}</Text>
            <View className="flex-row gap-3 pt-1">
              <Pressable
                onPress={handleChoosePrinter}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
              >
                <Text className="text-sm font-semibold text-foreground">Elegir impresora</Text>
              </Pressable>
              <Pressable
                onPress={handleUseFirstPaired}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
                disabled={opening}
              >
                <Text className="text-sm font-semibold text-foreground">
                  Usar primera emparejada
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleOpenDrawer}
            disabled={opening}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !opening && styles.primaryButtonPressed,
              opening && styles.primaryButtonDisabled,
            ]}
          >
            {opening ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text className="text-[26px] font-bold text-white">Abrir cajón</Text>
            )}
            <Text className="mt-2 text-sm text-white/85">
              {opening
                ? 'Enviando comando a la impresora...'
                : 'Pulsa para abrir el cajón sin entrar en el POS'}
            </Text>
          </Pressable>

          <View
            className={`rounded-[24px] border px-5 py-5 gap-2 ${statusClasses.border} ${statusClasses.background}`}
          >
            <Text className={`text-lg font-semibold ${statusClasses.title}`}>{status.title}</Text>
            <Text className="text-sm leading-6 text-foreground">{status.detail}</Text>
          </View>

          <View className="rounded-[24px] bg-surface border border-border px-5 py-5 gap-3">
            <Text className="text-lg font-semibold text-foreground">Comando actual</Text>
            <Text className="text-sm text-muted">{settings.commandHex}</Text>
            <Text className="text-sm text-muted">
              Tiempo de espera: {settings.timeoutMs} ms
            </Text>
            <View className="flex-row gap-3 pt-1">
              <Pressable
                onPress={() => router.push('/(tabs)/settings' as never)}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
              >
                <Text className="text-sm font-semibold text-foreground">Ajustes</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(tabs)/diagnostics' as never)}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
              >
                <Text className="text-sm font-semibold text-foreground">Diagnóstico</Text>
              </Pressable>
              <Pressable
                onPress={handleRestoreDefaults}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
              >
                <Text className="text-sm font-semibold text-foreground">Restaurar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: 24,
    gap: 16,
  },
  primaryButton: {
    minHeight: 196,
    borderRadius: 28,
    backgroundColor: '#0F9D58',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#0F9D58',
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.96,
  },
  primaryButtonDisabled: {
    opacity: 0.75,
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D7E2DA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  secondaryButtonPressed: {
    opacity: 0.7,
  },
});
