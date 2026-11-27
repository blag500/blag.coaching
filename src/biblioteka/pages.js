// Всички страници на blag-coaching.com — един списък. Нова страница (нов вход
// на Vite или папка в public/) се дописва тук, иначе я няма в библиотеката.
//
// tag: live — клиенти я виждат · test — проба, нищо истинско · own — само собственикът
// tries: готови адреси за проба (параметри, котви), всеки с бележка.
// Тук няма нищо тайно: repo-то е публично. Линкове към лични профили
// (банка, СИС) не се слагат.

export const GROUPS = [
  {
    name: 'Blag',
    pages: [
      { path: '/', name: 'Приложението', tag: 'live', note: 'Лендинг за гости, приложението след вход.' },
      {
        path: '/svyat/', name: 'Светът „Благ“', tag: 'live', note: '3D витрина: залата, улицата, картата.',
        tries: [
          { path: '/svyat/?lite=1', note: 'лекият изглед без WebGL' },
          { path: '/svyat/#zala', note: 'направо в залата' },
        ],
      },
      { path: '/recipes/blago-kremche/01.jpg', name: 'Благо кремче', tag: 'live', note: 'Рецептата, първа страница.' },
    ],
  },
  {
    name: 'Чийт Код',
    pages: [
      { path: '/cheatcode/', name: 'Чийт Код', tag: 'test', note: 'Ястията за такеауей, отделно PWA.',
        tries: [{ path: '/cheatcode/?ot=vhod', note: 'както след картата в блока' }] },
      { path: '/vhod/', name: 'Входът от картата', tag: 'test', note: 'QR-ът от картата A6 води тук.' },
      { path: '/cokitchen/', name: 'За CoKitchen', tag: 'test', note: 'Страницата за срещата (следата е затворена).' },
    ],
  },
  {
    name: 'Здраве и Сила',
    pages: [
      { path: '/shop/', name: 'Магазинът', tag: 'live', note: 'Каталог и каса (Stripe).',
        tries: [{ path: '/shop/#/c/all', note: 'целият асортимент' }] },
      { path: '/vrata/', name: 'Вратата', tag: 'test', note: 'Телефон → SMS код веднъж → личният QR.', check: 'zs' },
      { path: '/chetec/', name: 'Четецът', tag: 'test', note: 'На мястото на QR четеца при вратата: камера, бравата, записът.', check: 'zs' },
    ],
  },
  {
    name: 'Лично',
    pages: [
      { path: '/tablo/', name: 'Таблото', tag: 'own', note: 'Сега · План · Одит · Работа · Пари.',
        tries: [{ path: '/tablo/#money', note: 'направо парите' }] },
      { path: '/belezhki/', name: 'Бележки', tag: 'own', note: 'Личният план и напомнянията.' },
      { path: '/invest/', name: 'Инвестиции', tag: 'own', note: 'Trading 212: табло, прогноза, план.',
        tries: [{ path: '/invest/#forecast', note: 'прогнозата' }, { path: '/invest/#plan', note: 'планът' }] },
    ],
  },
]

export const TOOLS = [
  { url: 'https://supabase.com/dashboard/project/eiltoadzaqbuqdilsfpi', name: 'Supabase', note: 'базата, функциите, логовете' },
  { url: 'https://supabase.com/dashboard/project/eiltoadzaqbuqdilsfpi/functions', name: 'Supabase · функции', note: 'zs-access, shop-checkout …' },
  { url: 'https://vercel.com/dashboard', name: 'Vercel', note: 'качванията на сайта' },
  { url: 'https://github.com/blag500/blag.coaching', name: 'GitHub', note: 'кодът' },
]
