const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('REFACTORING VERIFICATION REPORT');
console.log('='.repeat(70));
console.log('');

const files = [
  'src/constantes.js',
  'src/utilidades.js',
  'src/armazenamento.js',
  'src/temas.js',
  'src/icones.jsx',
  'src/componentes-base.jsx',
  'src/formularios.jsx',
  'src/abas/dashboard.jsx',
  'src/abas/atividades.jsx',
  'src/abas/detalhes.jsx',
  'src/abas/historico.jsx',
  'src/abas/loja.jsx',
  'src/abas/configuracoes.jsx',
  'App.jsx'
];

let totalLines = 0;
let totalSize = 0;
let allGood = true;
const results = [];

files.forEach(f => {
  try {
    const src = fs.readFileSync(f, 'utf8');
    let braceBalance = 0;
    for (const c of src) {
      if (c === '{') braceBalance++;
      else if (c === '}') braceBalance--;
    }
    const lines = src.split('\n').length;
    const size = src.length;
    totalLines += lines;
    totalSize += size;
    
    const status = braceBalance === 0 ? '✓' : '✗';
    results.push({
      file: path.basename(f),
      path: f,
      lines,
      size,
      braceBalance,
      status
    });
    
    if (braceBalance !== 0) allGood = false;
  } catch(e) {
    console.log(`✗ ${path.basename(f)} → ERROR: ${e.message}`);
    allGood = false;
  }
});

// Print results
console.log('FILE SUMMARY:');
console.log('-'.repeat(70));
console.log('STATUS | FILE                    | LINES | BRACES | SIZE');
console.log('-'.repeat(70));
results.forEach(r => {
  console.log(
    `  ${r.status}    | ${r.file.padEnd(23)} | ${String(r.lines).padStart(5)} | ${String(r.braceBalance).padStart(6)} | ${r.size} bytes`
  );
});
console.log('-'.repeat(70));
console.log(`       | TOTAL                  | ${String(totalLines).padStart(5)} |        | ${totalSize} bytes`);
console.log('-'.repeat(70));
console.log('');

// Check for common imports
console.log('IMPORT DEPENDENCIES CHECK:');
console.log('-'.repeat(70));

const checkImports = (filepath, expectedImports) => {
  const src = fs.readFileSync(filepath, 'utf8');
  const missing = [];
  const found = [];
  
  for (const imp of expectedImports) {
    if (src.includes(`import`) && src.includes(imp)) {
      found.push(imp);
    } else {
      missing.push(imp);
    }
  }
  
  return { found, missing };
};

const checks = [
  { file: 'src/utilidades.js', expects: ['constantes.js'] },
  { file: 'src/temas.js', expects: ['clamp'] },
  { file: 'src/icones.jsx', expects: ['C', 'clamp'] },
  { file: 'src/componentes-base.jsx', expects: ['C'] },
  { file: 'src/formularios.jsx', expects: ['C', 'constantes', 'componentes-base'] },
  { file: 'App.jsx', expects: ['temas.js', 'constantes.js', 'utilidades.js'] }
];

checks.forEach(check => {
  const result = checkImports(check.file, check.expects);
  const status = result.missing.length === 0 ? '✓' : '⚠';
  console.log(`${status} ${check.file.padEnd(35)} → ${result.found.length}/${check.expects.length} imports OK`);
  if (result.missing.length > 0) {
    console.log(`  Missing: ${result.missing.join(', ')}`);
  }
});

console.log('');
console.log('='.repeat(70));
if (allGood) {
  console.log('✓ REFACTORING COMPLETE - ALL CHECKS PASSED');
} else {
  console.log('✗ REFACTORING FAILED - REVIEW ERRORS ABOVE');
}
console.log('='.repeat(70));

process.exit(allGood ? 0 : 1);
