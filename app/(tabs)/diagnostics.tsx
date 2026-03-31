import { ScreenContainer } from '@/components/screen-container';
import { haptic } from '@/lib/haptics';
import {
  getBluetoothAvailabilitySummary,
  getBondedPrinters,
  getStoredPrinter,
  getStoredSettings,
  openBluetoothSettings,
  openCashDrawer,
} from '@/lib/bluetooth';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function DiagnosticsScreen() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState<string[]>([]);

  const runDiagnostics = useCallback(async () => {
    setRunning(true);
    try {
      const [availability, printers, storedPrinter, settings] = await Promise.all([
        getBluetoothAvailabilitySummary(),
        getBondedPrinters(),
        getStoredPrinter(),
        getStoredSettings(),
      ]);

      const nextDetails = [
        availability,
        printers.length
          ? `Impresoras emparejadas detectadas: ${printers.map((item) => item.name).join(', ')}.`
          : 'No se han encontrado impresoras Bluetooth emparejadas.',
        storedPrinter
          ? `Impresora guardada: ${storedPrinter.name} (${storedPrinter.address}).`
          : 'No hay una impresora guardada como destino principal.',
        `Comando configurado: ${settings.commandHex}.`,
        `Tiempo de espera configurado: ${settings.timeoutMs} ms.`,
      ];

      setSummary(storedPrinter ? 'El sistema está preparado para probar la apertura.' : 'Primero debes guardar una impresora en Ajustes.');
      setDetails(nextDetails);
    } catch (error) {
      setSummary('No se pudo completar el diagnóstico.');
      setDetails([error instanceof Error ? error.message : 'Se produjo un error inesperado.']);
    } finally {
      setRunning(false);
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      runDiagnostics();
    }, [runDiagnostics]),
  );

  const handleSendTest = useCallback(async () => {
    setRunning(true);
    try {
      const [printer, settings] = await Promise.all([getStoredPrinter(), getStoredSettings()]);
      if (!printer) {
        throw new Error('No hay una impresora seleccionada para la prueba de apertura.');
      }
      await openCashDrawer({
        printer,
        commandHex: settings.commandHex,
        timeoutMs: settings.timeoutMs,
      });
      haptic.success();
      Alert.alert('Prueba enviada', 'El comando de apertura se ha enviado correctamente a la impresora.');
      await runDiagnostics();
    } catch (error) {
      haptic.error();
      Alert.alert('Error de prueba', error instanceof Error ? error.message : 'No fue posible enviar el comando de prueba.');
    } finally {
      setRunning(false);
    }
  }, [runDiagnostics]);

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center px-6 py-8">
        <ActivityIndicator size="large" color="#0F9D58" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5 py-4">
      <ScrollView contentContainerStyle={styles.content}>
        <View className="rounded-[24px] bg-surface border border-border px-5 py-5 gap-2">
          <Text className="text-2xl font-bold text-foreground">Diagnóstico</Text>
          <Text className="text-sm leading-6 text-muted">Revisa el estado de Bluetooth y lanza una prueba sin entrar al sistema POS.</Text>
        </View>

        <View className="rounded-[24px] bg-surface border border-border px-5 py-5 gap-3">
          <Text className="text-lg font-semibold text-foreground">Resumen</Text>
          <Text className="text-sm leading-6 text-foreground">{summary}</Text>
        </View>

        <View className="rounded-[24px] bg-surface border border-border px-5 py-5 gap-3">
          <Text className="text-lg font-semibold text-foreground">Detalles</Text>
          {details.map((detail) => (
            <View key={detail} className="rounded-[18px] bg-white border border-border px-4 py-4">
              <Text className="text-sm leading-6 text-foreground">{detail}</Text>
            </View>
          ))}
        </View>

        <View className="flex-row gap-3">
          <Pressable
            onPress={() => {
              haptic.selection();
              openBluetoothSettings();
            }}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]}
          >
            <Text className="text-sm font-semibold text-foreground">Bluetooth Android</Text>
          </Pressable>
          <Pressable
            onPress={handleSendTest}
            disabled={running}
            style={({ pressed }) => [styles.primaryButton, pressed && !running && styles.primaryPressed, running && styles.primaryDisabled]}
          >
            <Text className="text-sm font-semibold text-white">{running ? 'Probando...' : 'Enviar prueba'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 28,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D7E2DA',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F9D58',
  },
  primaryPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  primaryDisabled: {
    opacity: 0.72,
  },
  secondaryPressed: {
    opacity: 0.72,
  },
});
