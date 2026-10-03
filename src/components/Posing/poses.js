/* Позите носят само id + abbr — имена, описание и cue-та се държат в
   locales/{bg,en}.js под pose.{id}.* и се резолвват при render. Така всяка
   поза е един ред тук, а езиковото съдържание живее на едно място.
   Същите id-та са в проверката на posing_shots.pose_id (миграция 122) —
   нова поза тук е нов ред и там.

   Редът е редът на сцената: първо четвъртинките, после задължителните. */
export const POSES = [
  // Четвъртинките — задължителни и в бодибилдинга, и в класическата физика.
  // Q1–Q4 по реда на сцената: фронт, първо завъртане надясно (лявата страна
  // към съдиите), гръб, второ завъртане (дясната страна към съдиите).
  { id: 'qf',  abbr: 'Q1',  turn: true },
  { id: 'qr',  abbr: 'Q2',  turn: true },
  { id: 'qb',  abbr: 'Q3',  turn: true },
  { id: 'ql',  abbr: 'Q4',  turn: true },
  { id: 'fdb', abbr: 'FDB' },
  { id: 'fls', abbr: 'FLS' },
  { id: 'sc',  abbr: 'SC'  },
  { id: 'bdb', abbr: 'BDB' },
  { id: 'bls', abbr: 'BLS' },
  { id: 'st',  abbr: 'ST'  },
  { id: 'at',  abbr: 'A&T' },
  { id: 'vac', abbr: 'VAC' },
  { id: 'fcp', abbr: 'FCP' },
  { id: 'mm',  abbr: 'MM'  },
]

const TURNS = ['qf', 'qr', 'qb', 'ql']

/* Блоковете са заготовки, не затвор: изборът се пипа поза по поза.
   Класическата физика няма най-мускулеста; вместо нея — любима класическа
   поза, и вакуумът се показва. */
export const BLOCKS = [
  { id: 'bb', labelKey: 'pose.block.bb', poses: [...TURNS, 'fdb', 'fls', 'sc', 'bdb', 'bls', 'st', 'at', 'mm'] },
  { id: 'cp', labelKey: 'pose.block.cp', poses: [...TURNS, 'fdb', 'sc', 'bdb', 'at', 'vac', 'fcp'] },
]

export const POSE_BY_ID = Object.fromEntries(POSES.map(p => [p.id, p]))

/** Избраните id-та, подредени като на сцената. */
export function orderPoses(ids) {
  const on = new Set(ids)
  return POSES.filter(p => on.has(p.id))
}
