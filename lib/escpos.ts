function normalizeHexCommand(input: string): string {
  const cleaned = input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.toUpperCase());

  if (!cleaned.length) {
    throw new Error('El comando ESC/POS no puede quedar vacío.');
  }

  for (const chunk of cleaned) {
    if (!/^[0-9A-F]{2}$/.test(chunk)) {
      throw new Error(`El bloque hexadecimal "${chunk}" no es válido. Usa pares como 1B o FA.`);
    }
  }

  return cleaned.join(',');
}

export function parseEscPosCommand(input: string): number[] {
  return normalizeHexCommand(input)
    .split(',')
    .map((chunk) => parseInt(chunk, 16));
}

export function formatEscPosCommand(input: string): string {
  return normalizeHexCommand(input);
}
