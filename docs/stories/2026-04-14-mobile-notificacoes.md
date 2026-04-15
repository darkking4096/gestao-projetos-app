# Story: Mobile e Notificacoes

## Status

Android Ready for Play Internal Test

## Contexto

O aplicativo atual e uma SPA React + Vite com Supabase. Ele ja possui manifesto e icones de PWA, mas ainda nao possui estrutura mobile publicavel nem notificacoes reais.

O objetivo desta frente e preparar o produto para funcionar como aplicativo normal de celular, com publicacao futura na Google Play e App Store, e com notificacoes configuraveis para tarefas, rotinas, missoes e fechamento do dia.

Plano detalhado: `docs/MOBILE_NOTIFICATIONS_PLAN_2026-04-14.md`.

## Objetivo

Entregar uma base mobile sustentavel e um sistema de notificacoes confiavel, opcional e configuravel.

## Acceptance Criteria Gerais

- [x] Tarefas dentro de projetos podem ser editadas com detalhes completos.
- [x] Prazo e lembrete sao tratados como campos separados.
- [x] Tarefas isoladas aceitam lembrete manual opcional.
- [x] Tarefas de projeto aceitam lembrete manual opcional.
- [x] Rotinas aceitam horario de notificacao opcional.
- [x] Avisos de vencimento sao configuraveis por tipo.
- [x] Fechamento do dia e configuravel por horario.
- [x] Nova missao disponivel pode gerar notificacao opcional.
- [x] Notificacoes respeitam permissao do usuario.
- [x] App pode ser empacotado para Android.
- [x] Caminho de publicacao iOS esta documentado.
- [x] `npm run build` passa ao final de cada etapa implementada.

## Story 1: Tarefas de Projeto Completas

### Objetivo

Permitir que tarefas dentro de projetos tenham edicao completa, similar as tarefas isoladas.

### Escopo

- adicionar botao de edicao em cada tarefa de fase
- abrir tela de edicao da tarefa de projeto
- permitir editar nome, dificuldade, prioridade, categoria, cor, descricao, notas e prazo
- preservar vinculo com projeto e fase
- manter consistencia visual com os formularios atuais

### Acceptance Criteria

- [x] Tarefa de projeto possui acao visivel de editar.
- [x] Edicao nao quebra a estrutura de fases do projeto.
- [x] Tarefa de projeto pode ter prazo.
- [x] Dados antigos de projetos continuam carregando.
- [x] Build passa.

### Arquivos Provaveis

- `App.jsx`
- `src/formularios.jsx`
- `src/abas/detalhes.jsx`
- `src/abas/atividades.jsx`
- `src/utilidades.js`

## Story 2: Prazo e Lembrete em Tarefas

### Objetivo

Separar prazo de lembrete e permitir que cada tarefa tenha uma notificacao manual opcional.

### Escopo

- manter prazo como data/hora limite
- adicionar lembrete opcional com dia e hora
- aplicar em tarefas isoladas
- aplicar em tarefas de projeto depois da Story 1
- preparar dados para agendamento futuro

### Acceptance Criteria

- [x] Tarefa pode ter prazo sem lembrete.
- [x] Tarefa pode ter lembrete sem depender do prazo.
- [x] Tarefa pode ter prazo e lembrete ao mesmo tempo.
- [x] Lembrete pode ser desligado.
- [x] Dados antigos sem campos de notificacao continuam funcionando.
- [x] Build passa.

### Arquivos Provaveis

- `src/formularios.jsx`
- `App.jsx`
- `src/utilidades.js`

## Story 3: Notificacoes de Rotina

### Objetivo

Permitir que rotinas tenham horario de notificacao opcional seguindo sua frequencia.

### Escopo

- adicionar opcao de notificacao no formulario de rotina
- usuario escolhe horario
- rotina diaria avisa diariamente
- rotina semanal avisa no dia configurado
- rotina personalizada avisa nos dias configurados
- rotina livre nao agenda notificacao automatica por padrao

### Acceptance Criteria

- [x] Rotina pode ter notificacao ligada/desligada.
- [x] Rotina salva horario de notificacao.
- [x] Frequencia existente e reutilizada para calcular os dias.
- [x] Rotina livre nao gera notificacao automatica sem escolha clara.
- [x] Build passa.

### Arquivos Provaveis

- `src/formularios.jsx`
- `src/utilidades.js`
- `App.jsx`

## Story 4: Configuracoes Globais de Notificacao

### Objetivo

Adicionar uma area de notificacoes na tela de configuracoes.

### Escopo

- ativar/desativar notificacoes do app
- configurar horario silencioso
- configurar avisos de vencimento por tipo
- configurar nova missao disponivel
- configurar fechamento do dia

### Acceptance Criteria

- [x] Existe secao "Notificacoes" em configuracoes.
- [x] Usuario pode ativar/desativar notificacoes.
- [x] Usuario pode configurar antecedencia de vencimento para tarefas.
- [x] Usuario pode configurar antecedencia de vencimento para rotinas.
- [x] Usuario pode configurar antecedencia de vencimento para missoes.
- [x] Usuario pode ativar/desativar nova missao disponivel.
- [x] Usuario pode ativar/desativar fechamento do dia.
- [x] Usuario pode escolher horario do fechamento do dia.
- [x] Build passa.

### Arquivos Provaveis

- `src/abas/configuracoes.jsx`
- `App.jsx`
- `src/utilidades.js`

## Story 5: Fechamento do Dia

### Objetivo

Enviar uma notificacao diaria opcional lembrando o usuario de atividades pendentes em um horario escolhido.

### Escopo

- calcular pendencias relevantes do dia
- respeitar horario escolhido pelo usuario
- nao enviar se nao houver pendencias
- enviar no maximo uma vez por dia
- respeitar horario silencioso

### Texto Inicial

> Voce ainda tem X atividades pendentes hoje

### Pendencias Consideradas

- tarefas isoladas pendentes com prazo hoje
- tarefas de projeto pendentes com prazo hoje
- rotinas devidas no dia
- missoes pendentes ou disponiveis, quando esse fluxo estiver pronto

### Acceptance Criteria

- [x] Fechamento do dia pode ser ligado/desligado.
- [x] Usuario escolhe o horario do fechamento do dia.
- [x] Notificacao so e preparada quando existem pendencias.
- [x] Contagem de pendencias e coerente com o estado do app.
- [x] Nao duplica notificacao no mesmo dia.
- [x] Build passa.

### Arquivos Provaveis

- `src/abas/configuracoes.jsx`
- `src/utilidades.js`
- `App.jsx`

## Story 6: Notificacoes Reais no App Mobile

### Objetivo

Fazer os lembretes configurados chegarem como notificacoes reais no celular.

### Escopo

- pedir permissao de notificacao no momento correto
- agendar notificacoes locais
- cancelar notificacoes antigas quando tarefa/rotina for editada
- reagendar notificacoes apos carregar dados
- abrir o item correto quando o usuario tocar na notificacao

### Acceptance Criteria

- [x] App pede permissao de notificacao.
- [x] Lembrete de tarefa e agendado pela camada local disponivel no navegador/PWA e no app Capacitor.
- [x] Lembrete de rotina e agendado pela camada local disponivel no navegador/PWA e no app Capacitor.
- [x] Fechamento do dia e agendado no horario configurado quando ha pendencias.
- [x] Edicao de item atualiza notificacoes futuras.
- [x] Exclusao ou conclusao cancela notificacoes pendentes quando aplicavel.
- [x] Fluxo funciona em dispositivo Android real.

### Arquivos Provaveis

- `main.jsx`
- `App.jsx`
- `src/notificacoes.js`
- `capacitor.config.json`
- `android/`
- `ios/`

## Story 7: Empacotamento Android

### Objetivo

Preparar o app para instalacao e publicacao na Google Play.

### Escopo

- configurar empacotamento mobile
- definir nome, id do app, icones e splash screen
- gerar build Android
- testar em dispositivo real
- preparar checklist de publicacao

### Acceptance Criteria

- [x] Empacotamento Android configurado com Capacitor.
- [x] Nome e app id definidos.
- [x] Icones e splash screen gerados.
- [x] Plugin de notificacoes locais sincronizado.
- [x] Permissao Android 13+ declarada.
- [x] App instala em Android como aplicativo.
- [x] App abre corretamente.
- [x] Login e persistencia funcionam.
- [x] Notificacoes funcionam no dispositivo.
- [x] Build Android de teste e gerado.
- [x] Configuracao Gradle para assinatura release via arquivo local preparada.
- [x] AAB release assinado com chave de upload.
- [x] Checklist Google Play criado.

### Arquivos Provaveis

- `package.json`
- `vite.config.js`
- `public/`
- `assets/`
- `capacitor.config.json`
- `android/`
- `docs/MOBILE_RELEASE_CHECKLIST_2026-04-14.md`

### Observacao de Ambiente

`gradlew.bat assembleDebug --no-daemon` foi executado com sucesso nesta maquina em 2026-04-15 usando o JDK 21 embutido no Android Studio. O APK debug foi gerado em `android/app/build/outputs/apk/debug/app-debug.apk`.

`gradlew.bat bundleRelease --no-daemon` tambem foi executado com sucesso e gerou `android/app/build/outputs/bundle/release/app-release.aab`. A verificacao com `jarsigner` mostrou que o AAB ainda esta sem assinatura enquanto `android/key.properties` nao existir.

Em 2026-04-15, a configuracao Gradle foi ajustada para bloquear builds release sem `android/key.properties` completo. Assim, a proxima tentativa de `bundleRelease` sem chave falha explicitamente em vez de produzir um AAB que parece pronto mas nao pode ser enviado para a Play Store.

Em 2026-04-15, a chave local `android/coofe-upload-key.jks` foi criada fora do Git, `android/key.properties` foi preenchido localmente e `gradlew.bat bundleRelease --no-daemon` gerou o AAB assinado em `android/app/build/outputs/bundle/release/app-release.aab`. A verificacao com `jarsigner -verify` retornou `jar verified`.

Em 2026-04-15, o APK debug foi instalado em Android real via ADB. O app abriu, o usuario validou login, criacao de tarefa e recebimento de notificacao local.

Correcoes de ambiente aplicadas:

- `android.overridePathCheck=true` em `android/gradle.properties`, porque o caminho local contem caractere nao ASCII em `Gestao`.
- `android/local.properties` local aponta para `C:\Users\HomePC\AppData\Local\Android\Sdk`.
- Android SDK Platform 35 e Build Tools 35 foram instalados no SDK local.
- `android/app/build.gradle` agora le `android/key.properties` para assinar release quando a chave local existir.
- `android/app/build.gradle` usa `versionCode 2` e `versionName 1.1` para o proximo envio Android.
- Depois do versionamento 1.1, `npm run mobile:android:sync`, `gradlew.bat bundleRelease --no-daemon` e `gradlew.bat assembleDebug --no-daemon` passaram. O APK atualizado nao foi instalado nesta rodada porque nenhum dispositivo apareceu em `adb devices -l`.
- Testes Android de exemplo gerados pelo template Capacitor foram removidos porque usavam pacotes placeholders e nao cobriam comportamento real do Coofe.

## Story 8: Preparacao iOS e App Store

### Objetivo

Documentar e preparar o caminho para publicacao futura na App Store.

### Escopo

- mapear requisitos de conta Apple Developer
- mapear necessidade de macOS e Xcode
- definir bundle id
- preparar assets exigidos
- validar notificacoes em iPhone

### Acceptance Criteria

- [x] Projeto iOS gerado com Capacitor.
- [x] Requisitos iOS documentados.
- [x] Bundle id definido.
- [x] Checklist App Store criado.
- [x] Dependencias externas registradas.
- [x] Plano de teste em iPhone registrado.

### Observacao

Esta etapa depende de ambiente Apple para build e publicacao.

Nesta maquina Windows, `npx cap sync ios` foi executado, mas CocoaPods e Xcode nao estao disponiveis. O build final precisa acontecer em macOS.

## File List

- `docs/MOBILE_NOTIFICATIONS_PLAN_2026-04-14.md`
- `docs/MOBILE_RELEASE_CHECKLIST_2026-04-14.md`
- `docs/PRIVACY_POLICY_COOFE.md`
- `docs/stories/2026-04-14-mobile-notificacoes.md`
- `README.md`
- `package.json`
- `package-lock.json`
- `capacitor.config.json`
- `assets/`
- `public/privacy.html`
- `android/`
- `android/app/build.gradle`
- `android/app/src/test/java/`
- `android/app/src/androidTest/java/`
- `android/key.properties.example`
- `android/gradle.properties`
- `ios/`
- `App.jsx`
- `src/constantes.js`
- `src/utilidades.js`
- `src/formularios.jsx`
- `src/abas/atividades.jsx`
- `src/abas/configuracoes.jsx`
- `src/abas/detalhes.jsx`
- `src/notificacoes.js`
