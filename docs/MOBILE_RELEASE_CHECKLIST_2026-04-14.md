# Checklist Mobile e Publicacao

Data: 2026-04-14

## Estado Implementado

- Capacitor configurado em `capacitor.config.json`.
- App id definido como `app.coofe.mobile`.
- Nome do app definido como `Coofe`.
- Versao Android preparada para proximo envio: `versionCode 2`, `versionName 1.1`.
- Plataforma Android gerada em `android/`.
- Plataforma iOS gerada em `ios/`.
- Plugin `@capacitor/local-notifications` instalado e sincronizado.
- Permissao Android `POST_NOTIFICATIONS` declarada.
- Icone monocromatico de notificacao Android criado em `android/app/src/main/res/drawable/ic_stat_icon_config_sample.xml`.
- Icones e splash Android/iOS gerados a partir de `assets/icon.png` e `assets/splash.png`.
- Scripts mobile adicionados em `package.json`.

## Comandos

```bash
npm run build
npm run mobile:android:sync
npm run mobile:android:open
npm run mobile:ios:sync
npm run mobile:ios:open
npm run mobile:assets
```

Para criar as plataformas do zero:

```bash
npm run mobile:android:add
npm run mobile:ios:add
```

## Android

### Requisitos Locais

- Node 20 funciona com Capacitor 7.
- JDK 21 para o Capacitor Android atual.
- Android Studio instalado.
- Android SDK configurado.
- `ANDROID_HOME` ou `ANDROID_SDK_ROOT` apontando para o SDK.

### Build de Teste

Depois de instalar Android Studio e Android SDK Platform 35:

```bash
cd android
gradlew.bat assembleDebug
```

O APK debug esperado fica em:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Para gerar pacote de release para Play Console:

```bash
cd android
gradlew.bat bundleRelease
```

O AAB esperado fica em:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

Para a Play Console, o AAB precisa estar assinado. A configuracao Gradle ja le
`android/key.properties` quando esse arquivo local existir. Use
`android/key.properties.example` como modelo e mantenha a chave/senhas fora do
Git.

Exemplo de geracao da chave de upload:

```bash
cd android
keytool -genkeypair -v -keystore coofe-upload-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias coofe
```

Depois crie `android/key.properties`:

```properties
storeFile=../coofe-upload-key.jks
storePassword=SUA_SENHA_DO_KEYSTORE
keyAlias=coofe
keyPassword=SUA_SENHA_DA_CHAVE
```

Verificacao rapida da assinatura:

```bash
"C:\Program Files\Android\Android Studio\jbr\bin\jarsigner.exe" -verify -verbose -certs android\app\build\outputs\bundle\release\app-release.aab
```

### Google Play

- Criar conta Google Play Console.
- Criar app com nome `Coofe`.
- Usar package id `app.coofe.mobile`.
- Configurar assinatura do app no Play Console.
- Definir politicas de privacidade e tratamento de dados.
- Informar que o app usa login e armazenamento Supabase.
- Validar notificacoes em Android 13+ aceitando a permissao do sistema.
- Publicar primeiro em teste interno.

## iOS

### Requisitos

- macOS.
- Xcode atualizado.
- CocoaPods instalado.
- Conta Apple Developer.
- Dispositivo iPhone para teste real de notificacoes.

### Bundle

- Bundle id: `app.coofe.mobile`.
- Versao inicial: `1.0`.

### Build

Em um Mac:

```bash
npm install
npm run build
npm run mobile:ios:sync
npm run mobile:ios:open
```

No Xcode:

- selecionar o Team da conta Apple Developer;
- validar Signing & Capabilities;
- testar em dispositivo real;
- gerar Archive;
- enviar para TestFlight.

## Estado de Ambiente Nesta Maquina

Em 2026-04-15, `gradlew.bat assembleDebug --no-daemon` foi executado com sucesso usando o JDK 21 embutido no Android Studio:

```text
C:\Program Files\Android\Android Studio\jbr
```

O APK debug foi gerado em:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Em 2026-04-15, `gradlew.bat bundleRelease --no-daemon` tambem foi executado com sucesso. O AAB foi gerado em:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

Sem `android/key.properties`, esse AAB e apenas um artefato de validacao local e fica sem assinatura. Antes do upload na Play Console, gere a chave de upload, crie `android/key.properties`, rode `bundleRelease` novamente e confirme a assinatura com `jarsigner`.

Em 2026-04-15, `android/app/build.gradle` passou a bloquear `bundleRelease` quando `android/key.properties` nao existe ou esta incompleto. Esse erro e esperado enquanto a chave de upload ainda nao tiver sido criada nesta maquina.

Em 2026-04-15, a chave de upload local foi criada em `android/coofe-upload-key.jks`, `android/key.properties` foi preenchido localmente e `gradlew.bat bundleRelease --no-daemon` gerou um AAB assinado em:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

`jarsigner -verify` retornou `jar verified`. Os avisos de certificado autoassinado sao esperados para uma chave de upload local.

Tambem em 2026-04-15, o APK debug foi instalado em Android real via ADB e o fluxo basico foi validado pelo usuario:

- app instala e abre;
- login funciona;
- tarefa pode ser criada;
- notificacao local de tarefa chega no dispositivo.

Notas locais:

- `android.overridePathCheck=true` foi adicionado porque o caminho local do projeto contem caractere nao ASCII.
- `android/local.properties` aponta para `C:\Users\HomePC\AppData\Local\Android\Sdk`.
- Android SDK Platform 35 e Build Tools 35 foram instalados.
- `android/app/build.gradle` foi preparado para assinar release quando `android/key.properties` existir.
- `android/app/build.gradle` foi atualizado para `versionCode 2` e `versionName 1.1`, evitando conflito com um envio anterior que tenha usado `versionCode 1`.
- Apos essa atualizacao, `npm run mobile:android:sync`, `gradlew.bat bundleRelease --no-daemon` e `gradlew.bat assembleDebug --no-daemon` passaram. O AAB assinado e o APK debug foram regerados com a versao Android 1.1. Nesta rodada, o APK atualizado nao foi instalado porque nenhum dispositivo apareceu em `adb devices -l`.

## Pendencias Antes de Loja

- Revisar visualmente icones e splash finais em Android Studio/Xcode.
- Testar notificacoes locais em Android real.
- Testar notificacoes locais em iPhone real.
- Revisar textos legais e politica de privacidade.
- Enviar AAB assinado para teste interno na Play Console.
- Configurar certificados e provisioning profiles iOS.
