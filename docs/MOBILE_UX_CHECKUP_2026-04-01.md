# Checkup Mobile UX/UI - 2026-04-01

## Objetivo

Saneamento de navegação por toque, consistência visual do dashboard mobile e redução de frustração causada por gestos acidentais.

## Problemas encontrados

1. Navegação horizontal global no app inteiro.
Impacto: um arrasto leve já podia trocar de aba, mesmo quando a intenção era apenas rolar a tela.

2. Shell mobile pouco robusto para iPhone.
Impacto: transições de gesto podiam expor fundo inconsistente e dar sensação de "flash" preto na borda/retorno.

3. Dashboard mobile comprimido e desalinhado.
Impacto: header, moedas, atalhos, cards de estatística e bloco de missão ficavam com leitura e hierarquia piores no celular.

4. Drag em relatórios com threshold baixo.
Impacto: scroll vertical podia ser confundido com arraste.

5. Alvos de toque menores do que o ideal em controles recorrentes.
Impacto: aumenta erro de toque e sensação de app "nervoso".

## Mudanças aplicadas

### Navegação e shell

- Removido o swipe horizontal global entre abas em `App.jsx`.
- Container principal mobile agora prioriza `pan-y pinch-zoom`.
- Shell mobile passou a usar `100dvh`, fundo explícito e `WebkitOverflowScrolling: touch`.
- Barra inferior passou a respeitar `safe-area-inset-bottom`.
- `viewport-fit=cover` adicionado em `index.html`.
- `html`, `body` e `#root` agora têm fundo consistente e `overflow-x: hidden`.

### Dashboard mobile

- Header refeito em grid para alinhar avatar, rank/título e moedas.
- Cards de estatística ficaram maiores e com melhor legibilidade.
- Subtabs ganharam área de toque mais confortável.
- CTA da missão RPG ficou em largura total no mobile.
- Filtros do gráfico passaram a quebrar linha e respirar melhor.
- Resumo do gráfico também passou a quebrar linha quando necessário.

### Gestos e interação

- Threshold de drag em `src/abas/relatorios.jsx` aumentado para reduzir acionamentos acidentais.
- Barra de navegação inferior passou a ter altura mínima maior.

## Referências usadas

- web.dev - Accessible tap targets  
  https://web.dev/articles/accessible-tap-targets

- MDN - `touch-action`  
  https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action

- MDN - `overscroll-behavior`  
  https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior

## Critérios de UX adotados

- Priorizar scroll vertical em telas de conteúdo.
- Evitar navegação baseada em gesto global não explícito.
- Garantir alvos de toque próximos do padrão recomendado para mobile.
- Respeitar safe areas em iPhone.
- Evitar compressão de blocos principais no dashboard.

## Pendências recomendadas

1. Revisar mais alvos de toque pequenos em componentes compartilhados.
2. Fazer uma passada específica de microcopy e estados vazios no dashboard.
3. Testar comportamento real em Safari iPhone e Chrome Android.
4. Decidir se algum gesto horizontal continuará existindo, mas restrito a componentes específicos e com affordance clara.
