import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const previewSource = readFileSync(new URL('../../src/demo/DemoPurchaseFlow.jsx', import.meta.url), 'utf8');
const demoRootSource = readFileSync(new URL('../../src/demo/DemoExperience.jsx', import.meta.url), 'utf8');
const productionRootSource = readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8');
const viteConfigSource = readFileSync(new URL('../../vite.config.js', import.meta.url), 'utf8');

describe('safe purchase preview isolation', () => {
  it('stays local and is reachable only from the demo root', () => {
    expect(previewSource).not.toMatch(/fetch\s*\(|supabase|stripe|\/api\//i);
    expect(demoRootSource).toContain("@/demo/DemoPurchaseFlow");
    expect(productionRootSource).not.toContain('DemoPurchaseFlow');
    expect(viteConfigSource).toContain('publicDir: demoBuild || nativeBuild ? false : undefined');
  });

  it('mirrors the four production steps without counting payment confirmation twice', () => {
    expect(previewSource).toMatch(/'\/pago\/exito':\s*3/);
    expect(previewSource).toMatch(/'\/app':\s*4/);
    expect(previewSource).toContain('Paso ${step} de 4');
    expect(previewSource).not.toContain('Paso ${step} de 5');
  });
});
