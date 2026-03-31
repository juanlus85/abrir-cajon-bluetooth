import { Buffer } from 'buffer';
import { Platform } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { formatEscPosCommand, parseEscPosCommand } from './escpos';
import { safeStorage } from './storage';

const PRINTER_KEY = 'drawer:selected-printer';
const SETTINGS_KEY = 'drawer:settings';

export const DEFAULT_DRAWER_COMMAND = '1B,70,00,19,FA';
export const DEFAULT_TIMEOUT = 4000;

export interface PrinterDevice {
  name: string;
  address: string;
  id: string;
  bonded?: boolean;
  type?: 'CLASSIC' | 'LOW_ENERGY' | 'DUAL' | 'UNKNOWN';
}

export interface DrawerSettings {
  commandHex: string;
  timeoutMs: number;
}

export interface OpenCashDrawerParams {
  printer: PrinterDevice;
  commandHex: string;
  timeoutMs: number;
}

type BluetoothClassicModule = {
  getBondedDevices?: () => Promise<any[]>;
  isBluetoothAvailable?: () => Promise<boolean>;
  isBluetoothEnabled?: () => Promise<boolean>;
  requestBluetoothEnabled?: () => Promise<boolean>;
  cancelDiscovery?: () => Promise<boolean>;
  connectToDevice?: (address: string, options?: Record<string, unknown>) => Promise<any>;
  openBluetoothSettings?: () => void;
};

function getBluetoothModule(): BluetoothClassicModule | null {
  if (Platform.OS !== 'android') {
    return null;
  }

  const candidate = RNBluetoothClassic as BluetoothClassicModule | undefined;
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }
  return candidate;
}

function getUnsupportedEnvironmentMessage(): string {
  if (Platform.OS === 'web') {
    return 'La vista previa web no tiene acceso a Bluetooth Classic. Debes probar esta función en la tablet Android instalada.';
  }
  return 'El módulo Bluetooth no está disponible en esta compilación. Instala la app Android generada para usar la apertura del cajón.';
}

function requireBluetoothModule(): BluetoothClassicModule {
  const bluetoothModule = getBluetoothModule();
  if (!bluetoothModule) {
    throw new Error(getUnsupportedEnvironmentMessage());
  }
  return bluetoothModule;
}

function sanitizeTimeout(timeout: number): number {
  if (!Number.isFinite(timeout) || timeout < 1000 || timeout > 15000) {
    throw new Error('El tiempo de espera debe estar entre 1000 y 15000 milisegundos.');
  }
  return Math.round(timeout);
}

export async function getStoredPrinter(): Promise<PrinterDevice | null> {
  const raw = await safeStorage.getItem(PRINTER_KEY);
  return raw ? (JSON.parse(raw) as PrinterDevice) : null;
}

export async function saveStoredPrinter(printer: PrinterDevice): Promise<void> {
  await safeStorage.setItem(PRINTER_KEY, JSON.stringify(printer));
}

export async function getStoredSettings(): Promise<DrawerSettings> {
  const raw = await safeStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return { commandHex: DEFAULT_DRAWER_COMMAND, timeoutMs: DEFAULT_TIMEOUT };
  }

  const parsed = JSON.parse(raw) as Partial<DrawerSettings>;
  return {
    commandHex: formatEscPosCommand(parsed.commandHex ?? DEFAULT_DRAWER_COMMAND),
    timeoutMs: sanitizeTimeout(parsed.timeoutMs ?? DEFAULT_TIMEOUT),
  };
}

export async function saveStoredSettings(settings: DrawerSettings): Promise<void> {
  const normalized = {
    commandHex: formatEscPosCommand(settings.commandHex),
    timeoutMs: sanitizeTimeout(settings.timeoutMs),
  };
  await safeStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
}

export async function getBondedPrinters(): Promise<PrinterDevice[]> {
  const bluetoothModule = getBluetoothModule();
  if (!bluetoothModule?.getBondedDevices) {
    return [];
  }

  const devices = await bluetoothModule.getBondedDevices();
  return devices
    .filter((device) => device?.name && device?.address)
    .map((device) => ({
      name: device.name,
      address: device.address,
      id: device.id ?? device.address,
      bonded: Boolean(device.bonded),
      type: device.type,
    }));
}

export async function getBluetoothAvailabilitySummary(): Promise<string> {
  const bluetoothModule = getBluetoothModule();
  if (!bluetoothModule?.isBluetoothAvailable || !bluetoothModule?.isBluetoothEnabled) {
    return getUnsupportedEnvironmentMessage();
  }

  const available = await bluetoothModule.isBluetoothAvailable();
  if (!available) {
    return 'Este dispositivo no expone Bluetooth disponible para la aplicación.';
  }

  const enabled = await bluetoothModule.isBluetoothEnabled();
  if (!enabled) {
    return 'Bluetooth está apagado. Actívalo antes de intentar abrir el cajón.';
  }

  const printers = await getBondedPrinters();
  return printers.length
    ? `Bluetooth activo. ${printers.length} dispositivo(s) emparejado(s) listo(s) para selección.`
    : 'Bluetooth activo, pero no hay impresoras emparejadas todavía.';
}

export function openBluetoothSettings(): void {
  const bluetoothModule = getBluetoothModule();
  if (bluetoothModule?.openBluetoothSettings) {
    bluetoothModule.openBluetoothSettings();
  }
}

async function ensureBluetoothEnabled(): Promise<void> {
  const bluetoothModule = requireBluetoothModule();
  if (!bluetoothModule.isBluetoothAvailable || !bluetoothModule.isBluetoothEnabled) {
    throw new Error(getUnsupportedEnvironmentMessage());
  }

  const available = await bluetoothModule.isBluetoothAvailable();
  if (!available) {
    throw new Error('Bluetooth no está disponible en esta tablet.');
  }

  const enabled = await bluetoothModule.isBluetoothEnabled();
  if (enabled) {
    return;
  }

  if (!bluetoothModule.requestBluetoothEnabled) {
    throw new Error('Bluetooth está apagado y esta compilación no puede solicitar su activación automáticamente.');
  }

  const granted = await bluetoothModule.requestBluetoothEnabled();
  if (!granted) {
    throw new Error('Bluetooth debe estar activado para enviar el comando de apertura.');
  }
}

export async function openCashDrawer({
  printer,
  commandHex,
  timeoutMs,
}: OpenCashDrawerParams): Promise<{ commandHex: string }> {
  const bluetoothModule = requireBluetoothModule();
  if (!bluetoothModule.connectToDevice) {
    throw new Error(getUnsupportedEnvironmentMessage());
  }

  await ensureBluetoothEnabled();

  const normalizedCommand = formatEscPosCommand(commandHex);
  const bytes = parseEscPosCommand(normalizedCommand);
  const buffer = Buffer.from(bytes);

  if (bluetoothModule.cancelDiscovery) {
    await bluetoothModule.cancelDiscovery().catch(() => false);
  }

  const connected = await bluetoothModule.connectToDevice(printer.address, {
    connectorType: 'rfcomm',
    delimiter: '',
    charset: 'utf-8',
    secureSocket: false,
  });

  if (!connected || typeof connected.write !== 'function') {
    throw new Error(`No se pudo establecer una conexión válida con ${printer.name}.`);
  }

  const timeout = sanitizeTimeout(timeoutMs);

  try {
    const writePromise = connected.write(buffer);
    await Promise.race([
      writePromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('La impresora no respondió dentro del tiempo esperado.')), timeout),
      ),
    ]);
    return { commandHex: normalizedCommand };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al enviar el comando.';
    throw new Error(`No se pudo abrir el cajón en ${printer.name}: ${message}`);
  } finally {
    if (typeof connected.disconnect === 'function') {
      await connected.disconnect().catch(() => false);
    }
  }
}
