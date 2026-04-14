# Checklist Mobile e Publicacao

Data: 2026-04-14

## Estado Implementado

- Capacitor configurado em `capacitor.config.json`.
- App id definido como `app.coofe.mobile`.
- Nome do app definido como `Coofe`.
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
- JDK 11 ou superior. Recomendado: JDK 17.
- Android Studio instalado.
- Android SDK configurado.
- `ANDROID_HOME` ou `ANDROID_SDK_ROOT` apontando para o SDK.

### Build de Teste

Depois de instalar JDK 17 e Android Studio:

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

## Pendencias de Ambiente Nesta Maquina

A tentativa de `gradlew.bat assembleDebug` falhou porque o Java ativo e:

```text
java version "1.8.0_401"
```

O Android Gradle Plugin gerado pelo Capacitor exige Java 11 ou superior. Tambem nao foram encontrados `JAVA_HOME`, `ANDROID_HOME` ou `ANDROID_SDK_ROOT` configurados.

## Pendencias Antes de Loja

- Revisar visualmente icones e splash finais em Android Studio/Xcode.
- Testar notificacoes locais em Android real.
- Testar notificacoes locais em iPhone real.
- Revisar textos legais e politica de privacidade.
- Configurar assinatura release Android.
- Configurar certificados e provisioning profiles iOS.
