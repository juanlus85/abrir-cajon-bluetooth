import { describe, expect, it } from 'vitest';
import { parseEscPosCommand } from '../lib/escpos';

describe('parseEscPosCommand', () => {
  it('convierte el comando hexadecimal configurado en bytes', () => {
    expect(parseEscPosCommand('1B,70,00,19,FA')).toEqual([0x1b, 0x70, 0x00, 0x19, 0xfa]);
  });

  it('normaliza espacios y mayúsculas', () => {
    expect(parseEscPosCommand('1b, 70, 00, 19, fa')).toEqual([0x1b, 0x70, 0x00, 0x19, 0xfa]);
  });

  it('rechaza bloques hexadecimales inválidos', () => {
    expect(() => parseEscPosCommand('1B,7,00')).toThrow(/hexadecimal/);
  });
});
