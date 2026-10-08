import { defineConfig, devices } from '@playwright/test'

/* В облачните сесии на Claude Chromium е предварително сложен в /opt и е по-стара
   ревизия от тази, която тази версия на Playwright си тегли — а тегленето там е
   спряно. Стартовата кука (.claude/hooks/session-start.sh) казва пътя в
   PW_CHROMIUM_PATH; локално променливата я няма и Playwright ползва своя. */
const chromiumLaunch = process.env.PW_CHROMIUM_PATH
  ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
  : {}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...chromiumLaunch },
    },
    /* Телефон на Chromium. Приложението е PWA и почти целият трафик е от
       телефон, така че мобилният размер не е допълнителен пробег, а основният.
       На Chromium, защото WebKit иска отделно теглене (npx playwright install
       webkit) и без него целият набор пада, преди да е тръгнал. */
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], ...chromiumLaunch },
    },
    /* Истинският iOS. Половината клиенти са на iPhone, а WebKit се държи
       различно достатъчно често, че да не се приема на доверие — там няма
       вибрация, стъклото се рисува другояче и position:fixed има свои навици.
       Иска еднократно `npx playwright install webkit`. */
    {
      name: 'ios',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
})
