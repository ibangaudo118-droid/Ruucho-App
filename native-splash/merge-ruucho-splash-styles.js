#!/usr/bin/env node
/**
 * merge-ruucho-splash-styles.js
 *
 * Run after `npx cap add android` (which regenerates a fresh, default
 * android/ project every time) and after copying resources/splash/ into
 * android/app/src/main/res/. This patches the two files Capacitor's
 * default template doesn't know about the RUUCHO splash theme:
 *
 *   1. android/app/src/main/res/values/styles.xml
 *        - ensures AppTheme.NoActionBarLaunch (the launch theme) is
 *          present/overridden with the RUUCHO version instead of the
 *          Capacitor default (white bg + generic icon).
 *   2. android/app/src/main/AndroidManifest.xml
 *        - ensures the <activity> for MainActivity has
 *          android:theme="@style/AppTheme.NoActionBarLaunch"
 *          (Capacitor's template sometimes points at a bare "AppTheme").
 *
 * Idempotent: safe to run every CI build. If the target block/attribute
 * already matches, it's a no-op.
 *
 * Usage:
 *   node merge-ruucho-splash-styles.js [projectRoot]
 *   (defaults to process.cwd())
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.argv[2] || process.cwd();
const androidRoot = path.join(projectRoot, 'android', 'app', 'src', 'main');
const manifestPath = path.join(androidRoot, 'AndroidManifest.xml');
const stylesPath = path.join(androidRoot, 'res', 'values', 'styles.xml');
const ruuchoStylesPath = path.join(androidRoot, 'res', 'values', 'ruucho_splash_styles.xml');

function fail(msg) {
  console.error(`[merge-ruucho-splash-styles] ERROR: ${msg}`);
  process.exit(1);
}

function readFile(p, label) {
  if (!fs.existsSync(p)) fail(`${label} not found at ${p}`);
  return fs.readFileSync(p, 'utf8');
}

// 1. Confirm the RUUCHO splash resources have actually been copied in first.
if (!fs.existsSync(ruuchoStylesPath)) {
  fail(
    `${ruuchoStylesPath} not found. Copy resources/splash/ into ` +
      `android/app/src/main/res/ BEFORE running this script.`
  );
}

// 2. Patch AndroidManifest.xml: point MainActivity's theme at
//    AppTheme.NoActionBarLaunch so Android actually uses the RUUCHO
//    splash theme instead of the plain default before Capacitor boots.
let manifest = readFile(manifestPath, 'AndroidManifest.xml');

const activityBlockRegex =
  /(<activity[^>]*android:name="\.MainActivity"[^>]*>)/;

if (!activityBlockRegex.test(manifest)) {
  fail('Could not find <activity android:name=".MainActivity" ...> in AndroidManifest.xml');
}

const activityTag = manifest.match(activityBlockRegex)[1];

if (activityTag.includes('AppTheme.NoActionBarLaunch')) {
  console.log('[merge-ruucho-splash-styles] AndroidManifest.xml already wired to AppTheme.NoActionBarLaunch — skipping.');
} else if (/android:theme="@style\/[^"]*"/.test(activityTag)) {
  // Replace whatever theme is currently set
  const patchedTag = activityTag.replace(
    /android:theme="@style\/[^"]*"/,
    'android:theme="@style/AppTheme.NoActionBarLaunch"'
  );
  manifest = manifest.replace(activityTag, patchedTag);
  fs.writeFileSync(manifestPath, manifest, 'utf8');
  console.log('[merge-ruucho-splash-styles] Patched existing android:theme on MainActivity.');
} else {
  // No theme attribute yet — insert one
  const patchedTag = activityTag.replace(
    '<activity',
    '<activity android:theme="@style/AppTheme.NoActionBarLaunch"'
  );
  manifest = manifest.replace(activityTag, patchedTag);
  fs.writeFileSync(manifestPath, manifest, 'utf8');
  console.log('[merge-ruucho-splash-styles] Added android:theme to MainActivity.');
}

// 3. Sanity-check values/styles.xml defines (or inherits) AppTheme.NoActionBar,
//    which ruucho_splash_styles.xml's postSplashScreenTheme points to.
const styles = readFile(stylesPath, 'values/styles.xml');
if (!styles.includes('AppTheme.NoActionBar')) {
  console.warn(
    '[merge-ruucho-splash-styles] WARNING: values/styles.xml has no ' +
      '"AppTheme.NoActionBar" style. ruucho_splash_styles.xml references ' +
      'it as postSplashScreenTheme — add it (Capacitor\'s default template ' +
      'usually already includes this; only custom templates might not).'
  );
} else {
  console.log('[merge-ruucho-splash-styles] AppTheme.NoActionBar found — OK.');
}

console.log('[merge-ruucho-splash-styles] Done.');
