import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('flujo remoto del cajón', () => {
  it('ya no monta el manejador de deep link en el layout raíz y registra la ruta transparente open', () => {
    const source = readFileSync(join(process.cwd(), 'app/_layout.tsx'), 'utf8');

    expect(source).not.toContain('useDeepLinkDrawer');
    expect(source).not.toContain('DeepLinkDrawerProvider');
    expect(source).toContain('DrawerPollingBridgeProvider');
    expect(source).toContain('name="open"');
    expect(source).toContain('presentation: "transparentModal"');
    expect(source).toContain('animation: "none"');
  });

  it('mantiene en la pantalla principal el envío remoto por API y el botón físico local', () => {
    const source = readFileSync(join(process.cwd(), 'app/(tabs)/index.tsx'), 'utf8');

    expect(source).toContain('fetch(`${apiBaseUrl}/api/open-drawer`');
    expect(source).toContain('onPress={isWeb ? handleQueueDrawer : handleOpenLocalDrawer}');
    expect(source).toContain('Solicitar apertura remota');
    expect(source).toContain('Abrir cajón desde la tablet');
  });

  it('incluye una pantalla open que ejecuta la apertura secundaria y vuelve al flujo principal sin matar la app', () => {
    const source = readFileSync(join(process.cwd(), 'app/open.tsx'), 'utf8');

    expect(source).toContain('openCashDrawer');
    expect(source).not.toContain('BackHandler.exitApp()');
    expect(source).toContain("router.replace('/(tabs)')");
    expect(source).toContain("Platform.OS === 'android'");
    expect(source).toContain("backgroundColor: 'transparent'");
  });

  it('usa polling más rápido y confirma al servidor cada solicitud procesada', () => {
    const source = readFileSync(join(process.cwd(), 'hooks/use-drawer-polling.ts'), 'utf8');

    expect(source).toContain('const POLLING_INTERVAL_MS = 500;');
    expect(source).toContain('acknowledgeDrawerRequest');
    expect(source).toContain("fetch(`${apiBase}/api/drawer-ack`");
    expect(source).toContain('const POLLING_INTERVAL_MS = 500;');
  });

  it('mantiene en el servidor una cola FIFO con lectura no destructiva y ACK explícito', () => {
    const source = readFileSync(join(process.cwd(), 'server/_core/index.ts'), 'utf8');

    expect(source).toContain('const drawerPendingQueue: DrawerPendingRequest[] = [];');
    expect(source).toContain('getPendingDrawerRequest');
    expect(source).toContain('acknowledgeDrawerRequest');
    expect(source).toContain('app.post("/api/drawer-ack"');
    expect(source).not.toContain('consumeDrawerRequest');
  });
});
