import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('flujo remoto del cajón', () => {
  it('ya no monta el manejador de deep link en el layout raíz', () => {
    const source = readFileSync(join(process.cwd(), 'app/_layout.tsx'), 'utf8');

    expect(source).not.toContain('useDeepLinkDrawer');
    expect(source).not.toContain('DeepLinkDrawerProvider');
    expect(source).toContain('DrawerPollingBridgeProvider');
  });

  it('mantiene en la pantalla principal el envío remoto por API y el botón físico local', () => {
    const source = readFileSync(join(process.cwd(), 'app/(tabs)/index.tsx'), 'utf8');

    expect(source).toContain("fetch(`${apiBaseUrl}/api/open-drawer`");
    expect(source).toContain("onPress={isWeb ? handleQueueDrawer : handleOpenLocalDrawer}");
    expect(source).toContain("Solicitar apertura remota");
    expect(source).toContain("Abrir cajón desde la tablet");
  });
});
