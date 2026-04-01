#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();
const args = process.argv.slice(2);
const prepareOnly = args.includes("--prepare-only");
const cleanedArgs = args.filter((arg) => arg !== "--prepare-only");
const request = cleanedArgs.join(" ").trim();

if (!request) {
  console.error('Uso: npm run squad -- "seu pedido aqui"');
  console.error('Ou:  npm run squad:prepare -- "seu pedido aqui"');
  process.exit(1);
}

const projectContext = {
  name: "Gestao de Projetos Gamificado",
  stack: ["React 18", "Vite 5", "Supabase"],
  entrypoints: ["App.jsx", "main.jsx", "src/"],
  rules: [
    "Sem TypeScript",
    "Sem CSS externo ou Tailwind",
    "Estilos inline",
    "Cores via C.{token} de src/temas.js",
    "Sem emojis na interface",
    "Icones em SVG inline",
    "Manter retrocompatibilidade do campo totalXp"
  ],
  coreAreas: [
    "UI por abas em src/abas/",
    "Componentes compartilhados em src/componentes-base.jsx",
    "Gamificacao em src/utilidades.js e src/constantes.js",
    "Persistencia e auth em src/armazenamento.js",
    "Tema em src/temas.js"
  ]
};

const specialists = [
  {
    id: "product-owner",
    when: () => true,
    focus: "Traduz o pedido em objetivo concreto, escopo e criterio de aceite alinhados ao PRD."
  },
  {
    id: "frontend-react",
    when: (text) => /(\bui\b|\bux\b|layout|tela|aba|card|bot[aã]o|componente|form|dashboard|login|modal|lista|detalhe|relat[oó]rio|hist[oó]rico|loja|configura[cç][aã]o)/i.test(text),
    focus: "Implementa mudancas em App.jsx, componentes base, formularios e abas."
  },
  {
    id: "gamification-engineer",
    when: (text) => /(xp|energia|rank|poder|streak|miss[aã]o|recompensa|moeda|coins|loja|maestria|cultivo|atributo)/i.test(text),
    focus: "Protege logica de progressao, recompensa e economia do app."
  },
  {
    id: "supabase-data",
    when: (text) => /(supabase|banco|sql|auth|login|cadastro|sync|sincroniza|perfil|user|amizade|social|storage|persist)/i.test(text),
    focus: "Cuida de persistencia, autenticacao, integracao social e mudancas de dados."
  },
  {
    id: "ux-guardian",
    when: (text) => /(\bui\b|\bux\b|layout|visual|tema|\bcor\b|tipografia|experi[eê]ncia|design|acessibilidade|responsivo)/i.test(text),
    focus: "Mantem consistencia visual com o design system e as regras da interface."
  },
  {
    id: "qa-guard",
    when: () => true,
    focus: "Valida regressao, build e risco residual."
  }
];

const areaMap = [
  {
    label: "App shell e navegacao",
    match: /(navega[cç][aã]o|tab|aba|roteamento|estado global|app)/i,
    files: ["App.jsx", "src/abas/"]
  },
  {
    label: "Interface e componentes",
    match: /(\bui\b|\bux\b|layout|card|bot[aã]o|modal|componente|visual|tema|\bcor\b)/i,
    files: ["src/componentes-base.jsx", "src/formularios.jsx", "src/temas.js", "src/icones.jsx", "src/abas/"]
  },
  {
    label: "Gamificacao",
    match: /(xp|energia|rank|poder|streak|miss[aã]o|recompensa|coins|moeda|loja|maestria|cultivo|atributo)/i,
    files: ["src/utilidades.js", "src/constantes.js", "src/abas/dashboard.jsx", "src/abas/loja.jsx", "src/abas/atributos.jsx"]
  },
  {
    label: "Persistencia e backend",
    match: /(supabase|sql|auth|login|sync|sincroniza|storage|perfil|social|amizade|banco)/i,
    files: ["src/armazenamento.js", "src/Login.jsx", "social_tables.sql", "importar_dados_supabase.sql"]
  }
];

function unique(values) {
  return [...new Set(values)];
}

const activeSpecialists = specialists.filter((specialist) => specialist.when(request));
const probableAreas = areaMap.filter((area) => area.match.test(request));
const probableFiles = unique(probableAreas.flatMap((area) => area.files));

if (probableFiles.length === 0) {
  probableFiles.push("App.jsx", "src/");
}

const briefDir = path.join(root, ".ai-squad");
const briefPath = path.join(briefDir, "last-brief.md");
fs.mkdirSync(briefDir, { recursive: true });

const brief = `# Squad Brief

## Pedido

${request}

## Projeto

- Nome: ${projectContext.name}
- Stack: ${projectContext.stack.join(", ")}
- Entradas-chave: ${projectContext.entrypoints.join(", ")}

## Regras Fixas

${projectContext.rules.map((rule) => `- ${rule}`).join("\n")}

## Areas Nucleares

${projectContext.coreAreas.map((area) => `- ${area}`).join("\n")}

## Especialistas Selecionados

${activeSpecialists.map((item) => `- ${item.id}: ${item.focus}`).join("\n")}

## Areas Provaveis de Impacto

${probableAreas.length ? probableAreas.map((item) => `- ${item.label}`).join("\n") : "- Analise geral do app"}

## Arquivos Provaveis

${probableFiles.map((file) => `- ${file}`).join("\n")}

## Protocolo de Execucao

1. Interpretar o pedido e converter em escopo tecnico objetivo.
2. Confirmar quais regras de produto, UX, gamificacao e dados sao afetadas.
3. Ler apenas os arquivos necessarios para executar a mudanca.
4. Implementar as alteracoes no codigo.
5. Rodar validacao proporcional ao impacto; no minimo, usar \`npm run build\` quando houver mudanca funcional.
6. Entregar resumo final com o que mudou, como validar e riscos residuais.
`;

fs.writeFileSync(briefPath, brief, "utf8");

console.log(`Brief gerado em: ${path.relative(root, briefPath)}`);
console.log("");
console.log("Especialistas:");
activeSpecialists.forEach((item) => console.log(`- ${item.id}`));
console.log("");
console.log("Arquivos provaveis:");
probableFiles.forEach((file) => console.log(`- ${file}`));

if (prepareOnly) {
  console.log("");
  console.log("Modo prepare-only: nenhuma execucao do Codex foi iniciada.");
  process.exit(0);
}

const codexPrompt = `
Voce esta operando como um squad especializado neste projeto.

Pedido do usuario:
${request}

Use o briefing local em .ai-squad/last-brief.md e siga estas regras:

- analise o pedido antes de editar
- respeite AGENTS.md e as restricoes visuais e tecnicas do projeto
- trate os especialistas selecionados como perspectivas obrigatorias
- implemente as mudancas, nao apenas proponha
- valide a mudanca com build quando aplicavel
- responda com resumo curto, arquivos alterados, validacao e riscos
`.trim();

console.log("");
console.log("Executando Codex...");

const result = spawnSync(
  "cmd",
  ["/c", "codex", "exec", "--full-auto", "-C", root, "-"],
  {
    input: codexPrompt,
    stdio: ["pipe", "inherit", "inherit"],
    encoding: "utf8"
  }
);

process.exit(result.status || 0);
