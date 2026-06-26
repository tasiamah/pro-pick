import fs from 'fs';
import path from 'path';

import appConfig from './app.json';

describe('app config assets', () => {
  const mobileRoot = path.join(__dirname);

  it('references existing icon, splash, and adaptive icon files', () => {
    const expo = appConfig.expo;

    expect(fs.existsSync(path.join(mobileRoot, expo.icon))).toBe(true);
    expect(fs.existsSync(path.join(mobileRoot, expo.splash.image))).toBe(true);
    expect(fs.existsSync(path.join(mobileRoot, expo.android.adaptiveIcon.foregroundImage))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(mobileRoot, expo.web.favicon))).toBe(true);
    expect(expo.splash.backgroundColor).toBe('#0a0e14');
  });
});
