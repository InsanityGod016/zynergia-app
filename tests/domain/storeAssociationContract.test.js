import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

const root = new URL('../../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

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
