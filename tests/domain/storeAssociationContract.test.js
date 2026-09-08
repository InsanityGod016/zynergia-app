import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

const root = new URL('../../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const readBytes = path => readFile(new URL(path, root));

test('iOS and Android associate zynergia.pro/app with the production app', async () => {
  const [assetLinksSource, associationSource, entitlements, manifest, vercelSource] = await Promise.all([
    read('public/.well-known/assetlinks.json'),
    read('public/.well-known/apple-app-site-association'),
    read('ios/App/App/App.entitlements'),
    read('android/app/src/main/AndroidManifest.xml'),
    read('vercel.json'),
  ]);
  const assetLinks = JSON.parse(assetLinksSource);
  const association = JSON.parse(associationSource);
  const vercel = JSON.parse(vercelSource);
  const androidFilter = manifest.match(/<intent-filter android:autoVerify="true">[\s\S]*?<\/intent-filter>/)?.[0];

  expect(assetLinks).toContainEqual(expect.objectContaining({
    relation: ['delegate_permission/common.handle_all_urls'],
    target: expect.objectContaining({
      namespace: 'android_app',
      package_name: 'com.zynergia.app',
      sha256_cert_fingerprints: [
        '48:E3:32:2F:76:49:4B:3A:86:2D:F0:E4:9D:23:7C:0E:25:C0:03:F7:4A:7A:C4:11:51:5F:09:68:78:DA:D0:61',
      ],
    }),
  }));
  expect(androidFilter).toContain('android:scheme="https"');
  expect(androidFilter).toContain('android:host="zynergia.pro"');
  expect(androidFilter).toContain('android:path="/app"');
  expect(androidFilter).toContain('android:pathPrefix="/app/"');

  expect(association.applinks.details[0].appIDs).toContain('NR7VZQ9R89.com.zynergia.app');
  expect(association.applinks.details[0].components).toContainEqual(expect.objectContaining({ '/': '/app' }));
  expect(association.webcredentials.apps).toContain('NR7VZQ9R89.com.zynergia.app');
  expect(entitlements).toContain('<string>applinks:zynergia.pro</string>');
  expect(entitlements).toContain('<string>webcredentials:zynergia.pro</string>');

  expect(vercel.headers).toContainEqual({
    source: '/.well-known/apple-app-site-association',
    headers: [{ key: 'Content-Type', value: 'application/json; charset=utf-8' }],
  });
});

test('native release configuration keeps push, permissions, stores and update manifest fail-closed', async () => {
  const [
    appInfo,
    appEntitlements,
    extensionInfo,
    extensionEntitlements,
    androidManifest,
    androidRootBuild,
    androidAppBuild,
    gitignore,
    releaseManifestSource,
    codemagic,
    gate,
    vercelSource,
  ] = await Promise.all([
    read('ios/App/App/Info.plist'),
    read('ios/App/App/App.entitlements'),
    read('ios/App/OneSignalNotificationServiceExtension/Info.plist'),
    read('ios/App/OneSignalNotificationServiceExtension/OneSignalNotificationServiceExtension.entitlements'),
    read('android/app/src/main/AndroidManifest.xml'),
    read('android/build.gradle'),
    read('android/app/build.gradle'),
    read('.gitignore'),
    read('public/.well-known/mobile-releases.json'),
    read('codemagic.yaml'),
    read('supabase/scripts/predeploy-gate.mjs'),
    read('vercel.json'),
  ]);
  const releaseManifest = JSON.parse(releaseManifestSource);
  const vercel = JSON.parse(vercelSource);
  const appGroup = '<string>group.com.zynergia.app.onesignal</string>';

  expect(appInfo).toContain('<key>OneSignal_app_groups_key</key>');
  expect(extensionInfo).toContain('<key>OneSignal_app_groups_key</key>');
  expect(appInfo).toContain(appGroup);
  expect(extensionInfo).toContain(appGroup);
  expect(appEntitlements).toContain(appGroup);
  expect(extensionEntitlements).toContain(appGroup);
  expect(appEntitlements).toContain('<key>aps-environment</key>');
  expect(appInfo).toContain('<string>remote-notification</string>');

  expect(androidManifest).toContain('android.permission.READ_CONTACTS');
  expect(androidManifest).toMatch(/android\.permission\.WRITE_CONTACTS" tools:node="remove"/);
  expect(androidManifest).toContain('android.permission.POST_NOTIFICATIONS');
  expect(androidManifest).not.toMatch(/(?:SCHEDULE|USE)_EXACT_ALARM/);
  expect(androidRootBuild).not.toContain('com.google.gms:google-services');
  expect(androidAppBuild).not.toContain('google-services.json');
  for (const secretPattern of ['*.p8', '*.p12', '*.pem', '*.mobileprovision', '*service-account*.json']) {
    expect(gitignore).toContain(secretPattern);
  }

  expect(releaseManifest.schemaVersion).toBe(1);
  for (const platform of ['ios', 'android']) {
    expect(releaseManifest[platform].latestBuild).toBeGreaterThan(0);
    expect(releaseManifest[platform].minimumBuild).toBeGreaterThan(0);
    expect(releaseManifest[platform].minimumBuild).toBeLessThanOrEqual(releaseManifest[platform].latestBuild);
    expect(typeof releaseManifest[platform].published).toBe('boolean');
  }
  expect(releaseManifestSource).not.toMatch(/(?:jwt|session_id|access_token|https?:\/\/)/i);

  expect(codemagic.match(/VITE_PLAY_STORE_URL: https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.zynergia\.app/g)).toHaveLength(2);
  expect(codemagic).toContain("expected_sha1='16:54:71:1F:4B:E5:93:99:AD:95:A7:4A:20:88:CF:BF:1C:65:CB:B7'");
  expect(codemagic).toContain("Print :Entitlements:get-task-allow");
  expect(codemagic).toContain("Print :Entitlements:com.apple.developer.associated-domains");
  expect(codemagic).toContain("grep -Fq 'applinks:zynergia.pro'");
  expect(codemagic).toContain("grep -Fq 'webcredentials:zynergia.pro'");
  expect(codemagic).toContain("Expected exactly one IPA, found $ipa_count.");
  expect(codemagic).toContain('--path "$ipa_path"');
  expect(codemagic).toContain("trap 'rm -f /tmp/api_key.p8' EXIT");
  expect(gate).toMatch(/PLAY_STORE_URL_INVALID/);
  expect(gate).toMatch(/id6761772857/);

  expect(vercel.headers).toContainEqual({
    source: '/.well-known/mobile-releases.json',
    headers: [
      { key: 'Content-Type', value: 'application/json; charset=utf-8' },
      { key: 'Cache-Control', value: 'no-store, max-age=0' },
      { key: 'Access-Control-Allow-Origin', value: '*' },
    ],
  });
});

test('Android provides the official monochrome OneSignal small icon at every density', async () => {
  const densitySizes = {
    mdpi: 24,
    hdpi: 36,
    xhdpi: 48,
    xxhdpi: 72,
    xxxhdpi: 96,
  };

  for (const [density, expectedSize] of Object.entries(densitySizes)) {
    const png = await readBytes(`android/app/src/main/res/drawable-${density}/ic_stat_onesignal_default.png`);
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(png.readUInt32BE(16)).toBe(expectedSize);
    expect(png.readUInt32BE(20)).toBe(expectedSize);
    expect(png[24]).toBe(8);
    expect(png[25]).toBe(6);
  }
});

test('store metadata is prepared for the 1.2.0 release', async () => {
  const metadata = await read('assets/appstore-metadata.md');

  expect(metadata).toContain('# Zynergia 1.2.0');
  expect(metadata).toContain('## Notas de versión — 1.2.0');
  expect(metadata).not.toContain('## Notas de versión — 1.1.0');
});

test('package and native targets keep one marketing version and one iOS build number', async () => {
  const [packageSource, gradle, project] = await Promise.all([
    read('package.json'),
    read('android/app/build.gradle'),
    read('ios/App/App.xcodeproj/project.pbxproj'),
  ]);
  const packageVersion = JSON.parse(packageSource).version;
  const androidVersion = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
  const androidCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1]);
  const iosVersions = [...project.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map(match => match[1]);
  const iosBuilds = [...project.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)].map(match => Number(match[1]));

  expect(androidVersion).toBe(packageVersion);
  expect(androidCode).toBeGreaterThan(0);
  expect(iosVersions).toHaveLength(4);
  expect(new Set(iosVersions)).toEqual(new Set([packageVersion]));
  expect(iosBuilds).toHaveLength(4);
  expect(new Set(iosBuilds).size).toBe(1);
  expect(iosBuilds[0]).toBeGreaterThan(0);
});
