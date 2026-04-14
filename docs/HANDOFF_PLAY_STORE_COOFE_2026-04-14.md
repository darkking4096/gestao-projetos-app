# Handoff - Publicacao Android Coofe

Data: 2026-04-14

## Pedido do Usuario

O usuario quer publicar o app na Google Play Store. Ele informou:

- Nome oficial do app: `Coofe`
- Publicacao como pessoa fisica / CPF
- App gratuito
- Nao possui Mac, entao foco atual e Android
- Criou conta Google Play Console e provavelmente pagou a taxa
- Enviou validacao de identidade, aguardando aprovacao
- Baixou JDK 17 e Android Studio, mas ainda esta confuso sobre instalacao/configuracao
- Possui Android real para usar no teste
- Nao possui URL publica de politica de privacidade

O usuario pediu uma explicacao mais estruturada sobre exatamente o que fazer, e pediu para deixar o repo atualizado com push.

## Prints Recebidos

Arquivos locais enviados pelo usuario:

- `image copy.png`: pagina da Adoptium mostrando "Obrigado por baixar Eclipse Temurin". Indica que o instalador/download do JDK 17 foi iniciado.
- `image.png`: Google Play Console na tela da conta `Darkking`, com aviso "Termine de configurar sua conta de desenvolvedor". Pendencias visiveis:
  - Google verificando identidade
  - Verificar acesso a um dispositivo movel Android
  - Verificar numero de telefone de contato

Essas imagens sao contexto local e nao devem ser commitadas no repo.

## Estado do Codigo

O app foi renomeado para `Coofe`.

Configuracoes aplicadas:

- `capacitor.config.json`
  - `appId`: `app.coofe.mobile`
  - `appName`: `Coofe`
- Android:
  - namespace/applicationId: `app.coofe.mobile`
  - app label: `Coofe`
  - `POST_NOTIFICATIONS` declarado
  - plugin local notifications sincronizado
- iOS:
  - bundle id: `app.coofe.mobile`
  - display name: `Coofe`
- Web/PWA:
  - `index.html` title/meta atualizados para `Coofe`
  - `public/manifest.json` name/short_name atualizados
- UI:
  - Login, header e onboarding atualizados para `Coofe`
- Politica de privacidade:
  - `docs/PRIVACY_POLICY_COOFE.md`
  - `public/privacy.html`
  - contato placeholder: `coofe.app@gmail.com`

## Arquivos Relevantes

- `capacitor.config.json`
- `package.json`
- `package-lock.json`
- `android/`
- `ios/`
- `assets/`
- `src/notificacoes.js`
- `public/privacy.html`
- `docs/PRIVACY_POLICY_COOFE.md`
- `docs/MOBILE_RELEASE_CHECKLIST_2026-04-14.md`
- `docs/stories/2026-04-14-mobile-notificacoes.md`

## Validacoes Ja Rodadas

Passaram:

```bash
npm run build
npx cap sync android
npx cap sync ios
npm run mobile:assets
```

Falhou anteriormente:

```bash
cd android
gradlew.bat assembleDebug --no-daemon
```

Motivo: Java ativo era 1.8.0_401. O Android Gradle Plugin exige Java 11+, recomendado JDK 17.

## Proximos Passos Para Explicar ao Usuario

### 1. Terminar a conta Google Play Console

Na tela do print, ele precisa clicar em `Mais detalhes` e concluir:

1. Aguardar aprovacao da identidade.
2. Verificar acesso a um dispositivo movel Android.
3. Verificar telefone de contato.

Sem isso, a conta nao fica pronta para publicar.

### 2. Instalar JDK 17 de verdade

Ele baixou pelo print, mas precisa instalar o arquivo baixado.

Depois, pedir para abrir PowerShell novo e rodar:

```bash
java -version
```

Resultado esperado deve mostrar Java 17, nao Java 8.

Se ainda aparecer Java 8, orientar configurar `JAVA_HOME` e `Path`.

### 3. Instalar Android Studio e SDK

Ele deve abrir Android Studio e concluir o setup inicial. Depois abrir:

`More Actions` -> `SDK Manager`

Instalar:

- Android SDK Platform
- Android SDK Build-Tools
- Android SDK Platform-Tools
- Android SDK Command-line Tools

Depois confirmar no PowerShell:

```bash
adb version
```

### 4. Publicar URL da politica de privacidade

Arquivo criado:

```text
public/privacy.html
```

Mas a Play Store exige URL publica. Opcoes simples:

- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages

O caminho mais simples para orientar:

1. Rodar `npm run build`
2. Subir a pasta `dist/` no Netlify
3. Usar a URL:

```text
https://SEU-SITE.netlify.app/privacy.html
```

Antes disso, confirmar se `coofe.app@gmail.com` existe. Se nao existir, trocar o e-mail no documento e no HTML.

### 5. Gerar APK debug

Depois de JDK 17 e Android SDK funcionando:

```bash
npm install
npm run build
npm run mobile:android:sync
cd android
gradlew.bat assembleDebug
```

APK esperado:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### 6. Testar no Android real

Testar:

- app abre
- login Supabase funciona
- dados persistem
- criar tarefa com lembrete
- aceitar permissao de notificacao
- notificacao chega
- toque na notificacao abre item correto
- rotina com lembrete
- fechamento do dia

### 7. Configurar assinatura release

Gerar keystore:

```bash
keytool -genkeypair -v -keystore coofe-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias coofe
```

Nunca commitar:

- `.jks`
- `.keystore`
- `android/key.properties`

Ja foram adicionados ao `.gitignore`.

Depois configurar `android/key.properties` e `android/app/build.gradle` para assinar release.

### 8. Gerar AAB para Play Store

```bash
cd android
gradlew.bat bundleRelease
```

Arquivo esperado:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## Observacoes Importantes

- O package id escolhido foi `app.coofe.mobile`. Depois de publicar, isso nao deve ser alterado no mesmo app.
- Google Play Console para conta pessoal nova pode exigir teste fechado com pelo menos 12 testers por 14 dias antes de producao.
- App Store/iOS fica fora do escopo imediato porque o usuario nao tem Mac/Xcode nem Apple Developer.
- Notificacoes estao implementadas no codigo, mas precisam ser validadas em Android real antes de dizer que estao prontas para producao.

