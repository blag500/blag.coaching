/* Библиотеката с пози — за свободната програма, не за сцената на четвъртинки.
   Списъкът следва шаблона на Pete Hartwig (Bodybuilding Artistry, 10.10.2026):
   задължителните осем и незадължителните — прави, на коляно и в страничен
   напад. Имената и снимките са от шаблона (снимките — изрязани от него в
   public/posing-lib/<id>.webp, без надписите), с източника под всяка;
   описанията са наши. Решението да се ползват снимките — DECISIONS.md, Р13.

   Всяка поза е една ръка (base) в една посока (dir) на едно ниво (level).
   Текстът се сглобява от трите в locales/{bg,en}.js под lib.* — така сто
   пози са двайсет описания, а не сто. Задължителните сочат към позата в
   poses.js (ref) и показват нейното описание и cue-тата.

   Тези id-та не са в posing_shots (миграция 122): библиотеката не се снима. */

export const LEVELS = ['stand', 'kneel', 'lunge']
export const DIRS = ['front', 'side', 'back', 'twist']

// [ниво, посока, ръка, оригинално име, ref към poses.js]
// Посоката 'twistBack' е усукване с гръб към съдиите; във филтъра е „усукване“.
const ROWS = [
  // Задължителните
  ['stand', 'front', 'fdb',      'Front Double Biceps', 'fdb'],
  ['stand', 'front', 'fls',      'Front Lat Spread',    'fls'],
  ['stand', 'side',  'sc',       'Side Chest',          'sc'],
  ['stand', 'side',  'st',       'Side Triceps',        'st'],
  ['stand', 'back',  'fdb',      'Back Double Biceps',  'bdb'],
  ['stand', 'back',  'fls',      'Back Lat Spread',     'bls'],
  ['stand', 'front', 'abs',      'Abs & Thighs',        'at'],
  ['stand', 'front', 'mm',       'Most Muscular',       'mm'],

  // Прави
  ['stand', 'front',     'classic',  'Classic Front Biceps'],
  ['stand', 'front',     'latbi',    'Lat & Bicep'],
  ['stand', 'front',     'abbi',     'Abs & Bicep'],
  ['stand', 'front',     'archer',   'Archer'],
  ['stand', 'front',     'crucifix', 'Crucifix'],
  ['stand', 'front',     'victory',  'Victory'],
  ['stand', 'front',     'scorpion', 'Scorpion'],
  ['stand', 'front',     'shield',   'Shielded Warrior'],
  ['stand', 'front',     'staff',    'Front Staff'],
  ['stand', 'front',     'spear',    'Angled Spear'],
  ['stand', 'front',     'mantis',   'Mantis'],
  ['stand', 'back',      'classic',  'Classic Back Biceps'],
  ['stand', 'back',      'latbi',    'Rear Lat & Bicep'],
  ['stand', 'back',      'archer',   'Rear Archer'],
  ['stand', 'back',      'crucifix', 'Rear Crucifix'],
  ['stand', 'back',      'victory',  'Rear Victory'],
  ['stand', 'back',      'scorpion', 'Rear Scorpion'],
  ['stand', 'back',      'staff',    'Rear Staff'],
  ['stand', 'back',      'hbh',      'Rear Hands Behind Head'],
  ['stand', 'twist',     'fdb',      'Twisting Front Biceps'],
  ['stand', 'twist',     'fls',      'Twisting Front Lat-Spread'],
  ['stand', 'twist',     'latbi',    'Twisting Front Lat & Bicep'],
  ['stand', 'twist',     'abs',      'Twisting Abs Pose'],
  ['stand', 'twist',     'abbi',     'Twisting Ab & Bicep'],
  ['stand', 'twist',     'mm',       'Twisting Most Muscular'],
  ['stand', 'twist',     'archer',   'Twisting Archer'],
  ['stand', 'twist',     'crucifix', 'Twisting Crucifix'],
  ['stand', 'twist',     'victory',  'Twisting Victory'],
  ['stand', 'twist',     'scorpion', 'Twisting Scorpion'],
  ['stand', 'twist',     'shield',   'Twisting Shielded Warrior'],
  ['stand', 'twist',     'staff',    'Twisting Front Staff'],
  ['stand', 'twistBack', 'hbh',      'Twisting Hands Behind Head'],
  ['stand', 'twistBack', 'fdb',      'Twisting Back Biceps'],
  ['stand', 'twistBack', 'fls',      'Twisting Back Lat-Spread'],
  ['stand', 'twistBack', 'latbi',    'Twisting Rear Lat & Bicep'],
  ['stand', 'twistBack', 'archer',   'Twisting Rear Archer'],
  ['stand', 'twistBack', 'crucifix', 'Twisting Rear Crucifix'],
  ['stand', 'twistBack', 'victory',  'Twisting Rear Victory'],
  ['stand', 'twistBack', 'scorpion', 'Twisting Rear Scorpion'],
  ['stand', 'twistBack', 'staff',    'Twisting Rear Staff'],

  // На коляно
  ['kneel', 'front', 'fdb',      'Kneeling Front Biceps'],
  ['kneel', 'front', 'statue',   'Statue Pose'],
  ['kneel', 'front', 'fls',      'Front Lat-Spread'],
  ['kneel', 'front', 'latbi',    'Front Lat & Bicep'],
  ['kneel', 'front', 'abs',      'Abs Pose'],
  ['kneel', 'front', 'abbi',     'Ab & Bicep'],
  ['kneel', 'front', 'mm',       'Most Muscular'],
  ['kneel', 'front', 'archer',   'Archer'],
  ['kneel', 'front', 'crucifix', 'Crucifix'],
  ['kneel', 'front', 'victory',  'Victory'],
  ['kneel', 'front', 'scorpion', 'Scorpion'],
  ['kneel', 'front', 'shield',   'Shielded Warrior'],
  ['kneel', 'front', 'mantis',   'Mantis'],
  ['kneel', 'side',  'sc',       'Side Chest'],
  ['kneel', 'side',  'st',       'Triceps Pose'],
  ['kneel', 'back',  'statue',   'Rear Statue'],
  ['kneel', 'back',  'fdb',      'Back Biceps'],
  ['kneel', 'back',  'fls',      'Back Lat-Spread'],
  ['kneel', 'back',  'latbi',    'Rear Lat & Bicep'],
  ['kneel', 'back',  'archer',   'Rear Archer'],
  ['kneel', 'back',  'crucifix', 'Rear Crucifix'],
  ['kneel', 'back',  'victory',  'Rear Victory'],
  ['kneel', 'back',  'scorpion', 'Rear Scorpion'],
  ['kneel', 'back',  'staff',    'Rear Staff'],
  ['kneel', 'back',  'hbh',      'Hands Behind Head'],

  // В страничен напад
  ['lunge', 'front', 'fdb',      'Side Lunge Front Biceps'],
  ['lunge', 'front', 'fls',      'Side Lunge Front Lat-Spread'],
  ['lunge', 'front', 'latbi',    'Side Lunge Front Lat & Bicep'],
  ['lunge', 'front', 'abs',      'Side Lunge Abs'],
  ['lunge', 'front', 'abbi',     'Side Lunge Ab & Bicep'],
  ['lunge', 'front', 'mm',       'Side Lunge Most Muscular'],
  ['lunge', 'front', 'archer',   'Side Lunge Archer'],
  ['lunge', 'front', 'crucifix', 'Side Lunge Crucifix'],
  ['lunge', 'front', 'victory',  'Side Lunge Victory'],
  ['lunge', 'front', 'scorpion', 'Side Lunge Scorpion'],
  ['lunge', 'front', 'shield',   'Side Lunge Shielded Warrior'],
  ['lunge', 'front', 'staff',    'Side Lunge Staff'],
  ['lunge', 'front', 'atlas',    'Side Lunge Atlas'],
  ['lunge', 'back',  'fdb',      'Side Lunge Back Biceps'],
  ['lunge', 'back',  'fls',      'Side Lunge Back Lat-Spread'],
  ['lunge', 'back',  'latbi',    'Side Lunge Rear Lat & Bicep'],
  ['lunge', 'back',  'archer',   'Side Lunge Rear Archer'],
  ['lunge', 'back',  'crucifix', 'Side Lunge Rear Crucifix'],
  ['lunge', 'back',  'victory',  'Side Lunge Rear Victory'],
  ['lunge', 'back',  'scorpion', 'Side Lunge Rear Scorpion'],
  ['lunge', 'back',  'staff',    'Side Lunge Rear Staff'],
  ['lunge', 'back',  'hbh',      'Side Lunge Hands Behind Head'],
]

export const LIBRARY = ROWS.map(([level, dir, base, en, ref]) => ({
  id: `${level}-${dir}-${base}`,
  level,
  dir,
  filterDir: dir === 'twistBack' ? 'twist' : dir,
  base,
  en,
  ref: ref ?? null,
  img: `/posing-lib/${level}-${dir}-${base}.webp`,
}))
