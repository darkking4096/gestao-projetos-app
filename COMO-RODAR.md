# Como rodar o app no PC e no celular

## Pré-requisito único: instalar o Node.js

Você só precisa fazer isso **uma vez**.

1. Acesse: **https://nodejs.org**
2. Clique no botão verde grande escrito **"LTS"** (versão recomendada)
3. Baixe e instale normalmente (pode clicar em "Avançar" em tudo)
4. Pronto — Node.js instalado.

---

## Rodar o app no PC

### Primeira vez (instalar dependências)

1. Abra a pasta **"Gestão Projetos"** no Windows Explorer
2. Clique na barra de endereço do Explorer (onde aparece o caminho da pasta)
3. Digite **`cmd`** e pressione Enter → abre o Terminal dentro da pasta
4. No Terminal, digite e pressione Enter:
   ```
   npm install
   ```
   Aguarde baixar (aparece um monte de texto — é normal, leva 1 a 2 minutos)

### Toda vez que quiser usar o app

1. Abra o Terminal dentro da pasta (passo 3 acima)
2. Digite e pressione Enter:
   ```
   npm run dev
   ```
3. Vai aparecer algo assim no Terminal:
   ```
     ➜  Local:   http://localhost:3000/
     ➜  Network: http://192.168.1.XX:3000/
   ```
4. Abra o navegador e acesse: **http://localhost:3000**
5. O app abre! 🎉

> Para parar o app: volte ao Terminal e pressione **Ctrl + C**

---

## Abrir no celular (mesmo Wi-Fi)

Com o app rodando no PC (passo acima):

1. No Terminal, olhe a linha que começa com **"Network:"**
   - Exemplo: `http://192.168.1.42:3000`
2. No celular, abra o navegador (Chrome ou Safari)
3. Digite esse endereço exato na barra de endereço
4. O app abre no celular! 📱

> **Importante:** PC e celular precisam estar na **mesma rede Wi-Fi**

### Adicionar à tela inicial do celular (funciona como app)

**No Android (Chrome):**
- Toque nos 3 pontinhos (⋮) no canto superior direito
- Toque em "Adicionar à tela inicial"

**No iPhone (Safari):**
- Toque no ícone de compartilhar (□↑)
- Toque em "Adicionar à Tela de Início"

---

## Estrutura dos arquivos

```
Gestão Projetos/
├── COMO-RODAR.md          ← este guia
├── package.json           ← lista de dependências (não mexer)
├── vite.config.js         ← configurações do servidor (não mexer)
├── index.html             ← página principal (não mexer)
├── main.jsx               ← ponto de entrada (não mexer)
├── App.jsx                ← componente raiz do app
├── Projetos-v13.jsx       ← versão original de backup
└── src/
    ├── LEIA-ME.md         ← explicação técnica dos módulos
    ├── constantes.js      ← dados e configurações
    ├── utilidades.js      ← funções de cálculo
    ├── armazenamento.js   ← salvamento de dados
    ├── temas.js           ← cores e temas
    ├── icones.jsx         ← ícones do app
    ├── componentes-base.jsx  ← botões, cards, etc.
    ├── formularios.jsx    ← formulários de criar/editar
    └── abas/
        ├── dashboard.jsx      ← tela inicial
        ├── atividades.jsx     ← projetos, rotinas, tarefas
        ├── detalhes.jsx       ← tela de detalhe
        ├── historico.jsx      ← histórico e conquistas
        ├── loja.jsx           ← loja de temas e itens
        └── configuracoes.jsx  ← configurações
```

---

## Problemas comuns

### "npm não é reconhecido como comando"
→ O Node.js não foi instalado corretamente. Reinstale pelo site https://nodejs.org e reinicie o PC.

### "Porta 3000 em uso"
→ Outra cópia do app já está rodando. Feche o outro Terminal ou use `npm run dev -- --port 3001`

### Celular não consegue acessar
→ Verifique se PC e celular estão na mesma rede Wi-Fi.
→ O firewall do Windows pode estar bloqueando — permita o acesso quando o Windows perguntar.

### O app abriu mas está em branco
→ Pressione F12 no navegador, clique em "Console" e veja se há erros em vermelho.
→ Compartilhe os erros para diagnóstico.
