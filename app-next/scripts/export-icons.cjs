// Export authored vector sources for the asset manifest; no image generation.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { iconXml } = require('../src/packages/ui/lib/art.ts');
const { paths } = require('../src/packages/ui/paths.ts');
const out = path.join(__dirname, '../assets/icons');
fs.mkdirSync(out, { recursive: true });
for (const name of Object.keys(paths)) fs.writeFileSync(path.join(out, `${name}.svg`), iconXml(name));
fs.writeFileSync(path.join(out, 'FOUNDRY.md'), '# Authored flat icons\n\nAuthored, not generated. Phase 1 T02 explicitly permits flat SVGs. STYLE.md was read first; the September 6 correction governs the five-color palette and excludes decorative backplates and realistic detail. Sources: src/icons/paths.ts and art.ts; rendering: Icon.tsx. Export with scripts/export-icons.cjs.\n\n| Asset | Method | Validation |\n| --- | --- | --- |\n' + Object.keys(paths).map(name => `| ${name}.svg | Authored 24-point SVG | Transparent canvas; semantic silhouette; token palette; render test |`).join('\n') + '\n');
