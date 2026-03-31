import { ScreenContainer } from '@/components/screen-container';
import { haptic } from '@/lib/haptics';
import {
  DEFAULT_DRAWER_COMMAND,
  DEFAULT_TIMEOUT,
  DrawerSettings,
  getBondedPrinters,
  getStoredPrinter,
  getStoredSettings,
  PrinterDevice,
  saveStoredPrinter,
  saveStoredSettings,
} from '@/lib/bluetooth';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [commandHex, setCommandHex] = useState(DEFAULT_DRAWER_COMMAND);
  const [timeoutText, setTimeoutText] = useState(String(DEFAULT_TIMEOUT));

  const loadData = useCallback(async () => {
    try {
      const [bondedPrinters, storedPrinter, storedSettings] = await Promise.all([
        getBondedPrinters(),
        getStoredPrinter(),
        getStoredSettings(),
      ]);
      setPrinters(bondedPrinters);
      setSelectedAddress(storedPrinter?.address ?? '');
      setCommandHex(storedSettings.commandHex);
      setTimeoutText(String(storedSettings.timeoutMs));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const timeoutMs = Number(timeoutText);
      const printer = printers.find((item) => item.address === selectedAddress) ?? null;
      const nextSettings: DrawerSettings = {
        commandHex,
        timeoutMs,
      };

      await saveStoredSettings(nextSettings);
      if (printer) {
        await saveStoredPrinter(printer);
      }
      haptic.success();
      Alert.alert('Configuración guardada', 'La impresora y los ajustes se han guardado correctamente.');
    } catch (error) {
      haptic.error();
      Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Revisa la configuración e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }, [commandHex, printers, selectedAddress, timeoutText]);

  const handleReset = useCallback(async () => {
    const defaults = { commandHex: DEFAULT_DRAWER_COMMAND, timeoutMs: DEFAULT_TIMEOUT };
    setCommandHex(defaults.commandHex);
    setTimeoutText(String(defaults.timeoutMs));
    await saveStoredSettings(defaults);
    haptic.selection();
  }, []);

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
          <Text className="text-2xl font-bold text-foreground">Ajustes</Text>
          <Text className="text-sm leading-6 text-muted">
            Selecciona la impresora emparejada y revisa el comando ESC/POS que abrirá el cajón.
          </Text>
        </View>

        <View className="rounded-[24px] bg-surface border border-border px-5 py-5 gap-4">
          <Text className="text-lg font-semibold text-foreground">Impresoras emparejadas</Text>
          {printers.length ? (
            printers.map((printer) => {
              const selected = selectedAddress === printer.address;
              return (
                <Pressable
                  key={printer.address}
                  onPress={() => {
                    haptic.selection();
                    setSelectedAddress(printer.address);
                  }}
                  style={({ pressed }) => [styles.deviceRow, selected && styles.deviceRowSelected, pressed && styles.deviceRowPressed]}
                >
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">{printer.name}</Text>
                    <Text className="mt-1 text-sm text-muted">{printer.address}</Text>
                  </View>
                  <View style={[styles.selectionBadge, selected && styles.selectionBadgeActive]}>
                    <Text style={[styles.selectionBadgeText, selected && styles.selectionBadgeTextActive]}>
                      {selected ? 'Activa' : 'Elegir'}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <Text className="text-sm leading-6 text-muted">
              No se detectan impresoras emparejadas. Primero empareja la impresora desde los ajustes Bluetooth de Android.
            </Text>
          )}
        </View>

        <View className="rounded-[24px] bg-surface border border-border px-5 py-5 gap-4">
          <View>
            <Text className="text-sm font-medium text-muted">Comando ESC/POS del cajón</Text>
            <TextInput
              value={commandHex}
              onChangeText={setCommandHex}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="1B,70,00,19,FA"
              placeholderTextColor="#92A198"
              returnKeyType="done"
              style={styles.input}
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-muted">Tiempo de espera de conexión</Text>
            <TextInput
              value={timeoutText}
              onChangeText={setTimeoutText}
              keyboardType="number-pad"
              placeholder="4000"
              placeholderTextColor="#92A198"
              returnKeyType="done"
              style={styles.input}
            />
          </View>
        </View>

        <View className="rounded-[24px] bg-surface border border-border px-5 py-5 gap-4">
          <Text className="text-lg font-semibold text-foreground">Versión</Text>
          <Text className="text-sm text-muted">Versión v1.0.0. 31/03/2026 19:55</Text>
        </View>

        <View className="flex-row gap-3">
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]}
          >
            <Text className="text-sm font-semibold text-foreground">Restaurar valores</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [styles.primaryButton, pressed && !saving && styles.primaryPressed, saving && styles.primaryDisabled]}
          >
            <Text className="text-sm font-semibold text-white">{saving ? 'Guardando...' : 'Guardar ajustes'}</Text>
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
  deviceRow: {
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D7E2DA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deviceRowSelected: {
    borderColor: '#0F9D58',
    backgroundColor: '#EEF9F2',
  },
  deviceRowPressed: {
    opacity: 0.72,
  },
  selectionBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7E2DA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  selectionBadgeActive: {
    backgroundColor: '#0F9D58',
    borderColor: '#0F9D58',
  },
  selectionBadgeText: {
    color: '#142018',
    fontWeight: '600',
    fontSize: 13,
  },
  selectionBadgeTextActive: {
    color: '#FFFFFF',
  },
  input: {
    marginTop: 10,
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D7E2DA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#142018',
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
