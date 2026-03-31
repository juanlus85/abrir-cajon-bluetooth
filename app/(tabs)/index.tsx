import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { getApiBaseUrl } from '@/constants/oauth';
import { useDrawerPollingStatus } from '@/hooks/use-drawer-polling';
import { haptic } from '@/lib/haptics';
import {
  DEFAULT_DRAWER_COMMAND,
  DEFAULT_TIMEOUT,
  DrawerSettings,
  getBluetoothAvailabilitySummary,
  getStoredPrinter,
  getStoredSettings,
  openCashDrawer,
  PrinterDevice,
} from '@/lib/bluetooth';

interface ActionState {
  tone: 'neutral' | 'success' | 'error' | 'warning';
  title: string;
  detail: string;
}

const DEPLOY_VERSION = 'v1.2.0';
const DEPLOY_AT = '31/03/2026 22:52';

const initialWebState: ActionState = {
  tone: 'neutral',
  title: 'Listo para solicitar apertura',
  detail:
    'Este panel web envía la orden al servidor. La tablet Android puente recogerá la solicitud y abrirá el cajón por Bluetooth.',
};

const initialAndroidState: ActionState = {
  tone: 'neutral',
  title: 'Puente Android preparado',
  detail:
    'Mantén esta app configurada en la tablet para que pueda recibir solicitudes remotas y abrir el cajón automáticamente.',
};

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const bridgeStatus = useDrawerPollingStatus();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [opening, setOpening] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [printer, setPrinter] = useState<PrinterDevice | null>(null);
  const [settings, setSettings] = useState<DrawerSettings>({
    commandHex: DEFAULT_DRAWER_COMMAND,
    timeoutMs: DEFAULT_TIMEOUT,
  });
  const [bluetoothSummary, setBluetoothSummary] = useState('Comprobando Bluetooth...');
  const [status, setStatus] = useState<ActionState>(
    Platform.OS === 'web' ? initialWebState : initialAndroidState,
  );

  const apiBaseUrl = getApiBaseUrl();
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const isWide = width >= 900;

  const loadState = useCallback(async () => {
    try {
      let nextPrinter: PrinterDevice | null = null;
      let nextSettings: DrawerSettings = {
        commandHex: DEFAULT_DRAWER_COMMAND,
        timeoutMs: DEFAULT_TIMEOUT,
      };
      let nextBluetoothSummary = 'Bluetooth no disponible todavía.';

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

      setPrinter(nextPrinter);
      setSettings(nextSettings);
      setBluetoothSummary(nextBluetoothSummary);

      if (isWeb) {
        setStatus(initialWebState);
      } else if (bridgeStatus.active) {
        setStatus({
          tone: 'success',
          title: 'Puente Android escuchando',
          detail: bridgeStatus.lastEvent,
        });
      } else {
        setStatus(initialAndroidState);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bridgeStatus.active, bridgeStatus.lastEvent, isWeb]);

  useFocusEffect(
    useCallback(() => {
      void loadState();
    }, [loadState]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadState();
  }, [loadState]);

  const handleQueueDrawer = useCallback(async () => {
    if (!apiBaseUrl) {
      haptic.error();
      setStatus({
        tone: 'error',
        title: 'Servidor no disponible',
        detail:
          'No se pudo determinar la URL del servidor. Revisa la configuración del entorno antes de usar la apertura remota.',
      });
      return;
    }

    setQueueing(true);
    haptic.light();

    try {
      const response = await fetch(`${apiBaseUrl}/api/open-drawer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('El servidor rechazó la solicitud de apertura.');
      }

      const data = (await response.json()) as { ok: boolean; id: string };
      setStatus({
        tone: 'success',
        title: 'Solicitud enviada',
        detail: `La orden ${data.id} ya está en cola. La tablet Android puente debería recogerla en unos segundos.`,
      });
      haptic.success();
    } catch (error) {
      haptic.error();
      setStatus({
        tone: 'error',
        title: 'No se pudo solicitar la apertura',
        detail:
          error instanceof Error
            ? error.message
            : 'Se produjo un error desconocido al enviar la orden al servidor.',
      });
    } finally {
      setQueueing(false);
    }
  }, [apiBaseUrl]);

  const handleOpenLocalDrawer = useCallback(async () => {
    if (!printer) {
      haptic.error();
      Alert.alert(
        'Falta una impresora',
        'Antes de hacer una prueba local debes seleccionar una impresora Bluetooth en Ajustes.',
      );
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

      haptic.success();
      setStatus({
        tone: 'success',
        title: 'Prueba local completada',
        detail: `Se envió el comando ${result.commandHex} a ${printer.name}.`,
      });
    } catch (error) {
      haptic.error();
      setStatus({
        tone: 'error',
        title: 'No se pudo abrir localmente',
        detail:
          error instanceof Error
            ? error.message
            : 'Error desconocido al enviar el comando local a la impresora.',
      });
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
  }, [printer, settings.commandHex, settings.timeoutMs]);

  const toneStyles = useMemo(() => {
    switch (status.tone) {
      case 'success':
        return {
          card: styles.statusSuccess,
          badge: styles.badgeSuccess,
          badgeText: styles.badgeSuccessText,
        };
      case 'error':
        return {
          card: styles.statusError,
          badge: styles.badgeError,
          badgeText: styles.badgeErrorText,
        };
      case 'warning':
        return {
          card: styles.statusWarning,
          badge: styles.badgeWarning,
          badgeText: styles.badgeWarningText,
        };
      default:
        return {
          card: styles.statusNeutral,
          badge: styles.badgeNeutral,
          badgeText: styles.badgeNeutralText,
        };
    }
  }, [status.tone]);

  const bridgeLabel = isWeb
    ? 'Panel web listo'
    : bridgeStatus.active
      ? 'Puente activo'
      : 'Puente pendiente';

  if (loading) {
    return (
      <ScreenContainer className="px-6 py-8 justify-center items-center">
        <ActivityIndicator size="large" color="#0F9D58" />
        <Text className="mt-4 text-base text-muted text-center">
          Preparando el flujo híbrido de apertura del cajón...
        </Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-0 py-0" containerClassName="bg-background">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0F9D58" />
        }
      >
        <View style={[styles.pageShell, isWide && styles.pageShellWide]}>
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroEyebrow}>
                <Text style={styles.heroEyebrowText}>
                  {isWeb ? 'Apertura remota desde web' : 'Tablet puente Bluetooth'}
                </Text>
              </View>
              <View style={[styles.bridgeChip, bridgeStatus.active || isWeb ? styles.bridgeChipOn : styles.bridgeChipOff]}>
                <Text style={[styles.bridgeChipText, bridgeStatus.active || isWeb ? styles.bridgeChipTextOn : styles.bridgeChipTextOff]}>
                  {bridgeLabel}
                </Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>Abrir cajón</Text>
            <Text style={styles.heroDescription}>
              {isWeb
                ? 'Usa este panel para enviar la orden de apertura. La ejecución física del Bluetooth se realiza en la tablet Android vinculada a la impresora.'
                : 'Esta tablet recibe las solicitudes del servidor y envía el comando ESC/POS a la impresora para abrir el cajón automáticamente.'}
            </Text>
          </View>

          <View style={[styles.grid, isWide && styles.gridWide]}>
            <View style={[styles.column, isWide && styles.columnWide]}>
              <View style={styles.infoCard}>
                <Text style={styles.cardLabel}>Estado operativo</Text>
                <Text style={styles.cardTitle}>{isWeb ? 'Servidor de apertura remota' : 'Estado del puente Android'}</Text>
                <Text style={styles.cardBody}>
                  {isWeb
                    ? apiBaseUrl
                      ? `Conectado a ${apiBaseUrl}`
                      : 'No se ha podido detectar la URL del servidor.'
                    : bridgeStatus.lastEvent}
                </Text>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.cardLabel}>{isWeb ? 'Flujo remoto activo' : 'Configuración activa'}</Text>
                <Text style={styles.cardTitle}>
                  {isWeb ? 'Tablet puente requerida' : printer?.name ?? 'Sin impresora seleccionada'}
                </Text>
                <Text style={styles.cardBody}>
                  {isWeb
                    ? 'La impresora y el Bluetooth se gestionan en la tablet Android puente. Este panel web solo envía la orden de apertura al servidor.'
                    : printer
                      ? `${printer.address}`
                      : 'Selecciona una impresora Bluetooth emparejada en Ajustes para completar el puente.'}
                </Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillText}>ESC/POS {settings.commandHex}</Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillText}>{settings.timeoutMs} ms</Text>
                  </View>
                  {isWeb ? (
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillText}>Orden vía servidor</Text>
                    </View>
                  ) : null}
                </View>
                {!isWeb ? <Text style={styles.helperText}>{bluetoothSummary}</Text> : null}
              </View>
            </View>

            <View style={[styles.column, isWide && styles.columnWide]}>
              <View style={styles.actionPanel}>
                <Text style={styles.actionLabel}>{isWeb ? 'Acción principal' : 'Prueba y control local'}</Text>
                <Text style={styles.actionTitle}>
                  {isWeb ? 'Solicitar apertura remota' : 'Abrir cajón desde la tablet'}
                </Text>
                <Text style={styles.actionBody}>
                  {isWeb
                    ? 'La orden se enviará al servidor y la tablet puente la consumirá automáticamente.'
                    : 'Usa esta acción para validar que la impresora, el emparejamiento Bluetooth y el comando ESC/POS siguen funcionando.'}
                </Text>

                <Pressable
                  onPress={isWeb ? handleQueueDrawer : handleOpenLocalDrawer}
                  disabled={isWeb ? queueing : opening}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && !(isWeb ? queueing : opening) && styles.primaryButtonPressed,
                    (isWeb ? queueing : opening) && styles.primaryButtonDisabled,
                  ]}
                >
                  {isWeb ? (
                    queueing ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonTitle}>Solicitar apertura</Text>
                    )
                  ) : opening ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonTitle}>Prueba local</Text>
                  )}
                  <Text style={styles.primaryButtonText}>
                    {isWeb
                      ? queueing
                        ? 'Enviando la orden al servidor...'
                        : 'Pulsa para que la tablet Android puente abra el cajón por Bluetooth.'
                      : opening
                        ? 'Enviando el comando a la impresora...'
                        : 'Pulsa para validar manualmente la apertura desde la propia tablet.'}
                  </Text>
                </Pressable>

                {!isWeb ? (
                  <View style={styles.secondaryRow}>
                    <Pressable
                      onPress={() => router.push('/(tabs)/settings' as never)}
                      style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
                    >
                      <Text style={styles.secondaryButtonText}>Ajustes</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => router.push('/(tabs)/diagnostics' as never)}
                      style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
                    >
                      <Text style={styles.secondaryButtonText}>Diagnóstico</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View style={[styles.statusCard, toneStyles.card]}>
            <View style={[styles.statusBadge, toneStyles.badge]}>
              <Text style={[styles.statusBadgeText, toneStyles.badgeText]}>{status.title}</Text>
            </View>
            <Text style={styles.statusDetail}>{status.detail}</Text>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Versión {DEPLOY_VERSION}. {DEPLOY_AT}</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  pageShell: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    gap: 16,
  },
  pageShellWide: {
    maxWidth: 1100,
  },
  heroCard: {
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingVertical: 22,
    backgroundColor: '#F7FBF8',
    borderWidth: 1,
    borderColor: '#DCEBE1',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  heroEyebrow: {
    borderRadius: 999,
    backgroundColor: '#E7F6EC',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroEyebrowText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#0F7A46',
    letterSpacing: 0.2,
  },
  bridgeChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  bridgeChipOn: {
    backgroundColor: '#EEF8F1',
    borderColor: '#C9E7D3',
  },
  bridgeChipOff: {
    backgroundColor: '#FFF6E6',
    borderColor: '#F1D59C',
  },
  bridgeChipText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  bridgeChipTextOn: {
    color: '#18794E',
  },
  bridgeChipTextOff: {
    color: '#9A6700',
  },
  heroTitle: {
    marginTop: 16,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: '#122117',
  },
  heroDescription: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    color: '#4A5A50',
  },
  grid: {
    gap: 16,
  },
  gridWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  column: {
    gap: 16,
  },
  columnWide: {
    flex: 1,
  },
  infoCard: {
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EAE6',
    gap: 8,
  },
  cardLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#6A7A70',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardTitle: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '700',
    color: '#122117',
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4A5A50',
  },
  helperText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#718178',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  metaPill: {
    borderRadius: 999,
    backgroundColor: '#F3F6F4',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaPillText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#2F4336',
  },
  actionPanel: {
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#122117',
    borderWidth: 1,
    borderColor: '#203126',
    gap: 12,
    minHeight: 320,
  },
  actionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#A6C3B0',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  actionTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#D3E3D8',
  },
  primaryButton: {
    minHeight: 170,
    borderRadius: 26,
    backgroundColor: '#15A05A',
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#15A05A',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.96,
  },
  primaryButtonDisabled: {
    opacity: 0.75,
  },
  primaryButtonTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  primaryButtonText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    maxWidth: 420,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#395241',
    backgroundColor: '#1B2B21',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonPressed: {
    opacity: 0.78,
  },
  secondaryButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#F3F8F4',
  },
  statusCard: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  statusNeutral: {
    borderColor: '#E4EAE6',
  },
  statusSuccess: {
    borderColor: '#CBE8D3',
    backgroundColor: '#F3FBF5',
  },
  statusError: {
    borderColor: '#F3C9C9',
    backgroundColor: '#FFF6F6',
  },
  statusWarning: {
    borderColor: '#F1D9A2',
    backgroundColor: '#FFF9ED',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeNeutral: {
    backgroundColor: '#EFF3F0',
  },
  badgeSuccess: {
    backgroundColor: '#E5F6EA',
  },
  badgeError: {
    backgroundColor: '#FCE8E8',
  },
  badgeWarning: {
    backgroundColor: '#FFF1D6',
  },
  statusBadgeText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  badgeNeutralText: {
    color: '#33463A',
  },
  badgeSuccessText: {
    color: '#18794E',
  },
  badgeErrorText: {
    color: '#B42318',
  },
  badgeWarningText: {
    color: '#9A6700',
  },
  statusDetail: {
    fontSize: 15,
    lineHeight: 22,
    color: '#34463A',
  },
  footerRow: {
    alignItems: 'flex-end',
    paddingTop: 2,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#7A8A81',
  },
});
