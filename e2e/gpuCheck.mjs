/* Shared GPU classification. Deterministic, case-insensitive. No dependency. */

export const SOFTWARE_PATTERNS = [
  'swiftshader',
  'llvmpipe',
  'microsoft basic render driver',
  'software rasterizer',
  'software renderer',
  'basicdisplay',
];

export const isSoftwareRenderer = (diag) => {
  const hay = `${diag.renderer ?? ''} ${diag.unmaskedRenderer ?? ''}`.toLowerCase();
  return SOFTWARE_PATTERNS.some((p) => hay.includes(p));
};

export const isNvidia = (diag) => {
  const hay = `${diag.unmaskedVendor ?? ''} ${diag.unmaskedRenderer ?? ''} ${diag.renderer ?? ''}`.toLowerCase();
  return hay.includes('nvidia');
};

/** Returns null when GPU validation passes, else a human-readable reason. */
export const classifyGpu = (diag) => {
  if (!diag.available) return 'WebGL not available in browser.';
  if (diag.webglVersion !== 'WebGL2') return `NOVA requires WebGL2, got ${diag.webglVersion ?? 'unknown'}.`;
  if (!diag.renderer && !diag.unmaskedRenderer) return 'No WebGL renderer string recoverable.';
  if (isSoftwareRenderer(diag)) {
    return `Software renderer detected. Renderer: ${diag.unmaskedRenderer ?? diag.renderer ?? 'unknown'}`;
  }
  if (!isNvidia(diag)) {
    return `NVIDIA GPU not identified. Unmasked renderer: ${diag.unmaskedRenderer ?? 'unknown'}`;
  }
  return null;
};
