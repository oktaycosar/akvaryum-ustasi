// Fish species definitions, visual params and level progression

export type BodyShape = 'round' | 'slim' | 'tall' | 'long'
export type TailType = 'forked' | 'fan' | 'round' | 'long' | 'double'
export type FinStyle = 'normal' | 'veil' | 'betta'

export interface Species {
  id: string
  name: string
  latin: string
  desc: string
  price: number
  coinPerEat: number
  /** body length as a fraction of the tank unit (min dimension basis) */
  baseSize: number
  /** base swim speed px/s (scaled by tank unit) */
  speed: number
  /** hunger points lost per second (100 = full) */
  hungerRate: number
  /** tank level at which this species becomes purchasable */
  unlockLevel: number
  bodyRatio: number // height / length
  shape: BodyShape
  tail: TailType
  finStyle: FinStyle
  cBack: string
  cMid: string
  cBelly: string
  cFin: string
  cTail: string
  eyeScale?: number
}

export const SPECIES: Record<string, Species> = {
  goldfish: {
    id: 'goldfish',
    name: 'Japon Balığı',
    latin: 'Carassius auratus',
    desc: 'Dayanıklı ve ucuz bir başlangıç balığı. Yavaş yüzer ama akşamüstü çok yer.',
    price: 40,
    coinPerEat: 2,
    baseSize: 0.14,
    speed: 26,
    hungerRate: 1.15,
    unlockLevel: 1,
    bodyRatio: 0.5,
    shape: 'round',
    tail: 'double',
    finStyle: 'veil',
    cBack: '#d97a1f',
    cMid: '#ef8f2c',
    cBelly: '#f7c66b',
    cFin: '#e8762a',
    cTail: '#ef7d26',
  },
  guppy: {
    id: 'guppy',
    name: 'Lepistes',
    latin: 'Poecilia reticulata',
    desc: 'Renkli kuyruğuyla canlı ve hızlı. Küçük ama doyurması kolaydır.',
    price: 60,
    coinPerEat: 2,
    baseSize: 0.09,
    speed: 34,
    hungerRate: 1.3,
    unlockLevel: 1,
    bodyRatio: 0.36,
    shape: 'slim',
    tail: 'fan',
    finStyle: 'veil',
    cBack: '#7a8f86',
    cMid: '#9aa9a0',
    cBelly: '#c9d1c4',
    cFin: '#8fa39a',
    cTail: '#e08b2f',
  },
  neonTetra: {
    id: 'neonTetra',
    name: 'Neon Tetra',
    latin: 'Paracheirodon innesi',
    desc: 'Gövdesindeki neon şeritle ışıl ışıl. Sürü halinde gezmeyi sever.',
    price: 90,
    coinPerEat: 3,
    baseSize: 0.075,
    speed: 40,
    hungerRate: 1.35,
    unlockLevel: 2,
    bodyRatio: 0.34,
    shape: 'slim',
    tail: 'forked',
    finStyle: 'normal',
    cBack: '#9fb5b2',
    cMid: '#c3d1cd',
    cBelly: '#e2e8e0',
    cFin: '#b9c6c2',
    cTail: '#c0ccc8',
  },
  clownfish: {
    id: 'clownfish',
    name: 'Palyaço Balığı',
    latin: 'Amphiprion ocellaris',
    desc: 'Beyaz şeritleriyle tankın yıldızı. Her yemleme ekstra altın kazandırır.',
    price: 140,
    coinPerEat: 4,
    baseSize: 0.105,
    speed: 30,
    hungerRate: 1.2,
    unlockLevel: 3,
    bodyRatio: 0.46,
    shape: 'round',
    tail: 'round',
    finStyle: 'normal',
    cBack: '#e8731f',
    cMid: '#f28a28',
    cBelly: '#f8a94e',
    cFin: '#e8761f',
    cTail: '#ef7d22',
  },
  angelfish: {
    id: 'angelfish',
    name: 'Melek Balığı',
    latin: 'Pterophyllum scalare',
    desc: 'Uzun yüzgeçleriyle zarif bir görünüm. Sakin suların asil balığı.',
    price: 200,
    coinPerEat: 4,
    baseSize: 0.15,
    speed: 24,
    hungerRate: 1.1,
    unlockLevel: 4,
    bodyRatio: 0.72,
    shape: 'tall',
    tail: 'forked',
    finStyle: 'veil',
    cBack: '#b9c1bf',
    cMid: '#d3dad6',
    cBelly: '#eef0ea',
    cFin: '#c4ccc8',
    cTail: '#bcc4c0',
  },
  betta: {
    id: 'betta',
    name: 'Beta',
    latin: 'Betta splendens',
    desc: 'Akan yüzgeçleriyle gizemli bir güzellik. Yemledikçe bolca altın verir.',
    price: 260,
    coinPerEat: 5,
    baseSize: 0.115,
    speed: 22,
    hungerRate: 1.05,
    unlockLevel: 5,
    bodyRatio: 0.4,
    shape: 'slim',
    tail: 'long',
    finStyle: 'betta',
    cBack: '#a8232b',
    cMid: '#c22f36',
    cBelly: '#d3483f',
    cFin: '#b32c33',
    cTail: '#c23340',
  },
  koi: {
    id: 'koi',
    name: 'Koi',
    latin: 'Cyprinus rubrofuscus',
    desc: 'Büyük ve gösterişli. İyi bakılırsa akvaryumun en değerli varlığı olur.',
    price: 380,
    coinPerEat: 6,
    baseSize: 0.185,
    speed: 20,
    hungerRate: 1.0,
    unlockLevel: 6,
    bodyRatio: 0.4,
    shape: 'long',
    tail: 'forked',
    finStyle: 'normal',
    cBack: '#e9e4dc',
    cMid: '#f2efe8',
    cBelly: '#faf7f0',
    cFin: '#e3ddd2',
    cTail: '#e6dfD4',
  },
  discus: {
    id: 'discus',
    name: 'Diskus',
    latin: 'Symphysodon aequifasciatus',
    desc: 'Yusyuvarlak gövdesi ve desenleriyle bir canlı tablo. Usta akvaristlerin gözdesi.',
    price: 520,
    coinPerEat: 8,
    baseSize: 0.165,
    speed: 18,
    hungerRate: 0.95,
    unlockLevel: 7,
    bodyRatio: 0.78,
    shape: 'round',
    tail: 'round',
    finStyle: 'veil',
    cBack: '#a5743f',
    cMid: '#b98a4a',
    cBelly: '#d1a866',
    cFin: '#9d7a45',
    cTail: '#a67a41',
  },
}

export const SPECIES_LIST = Object.values(SPECIES)

// --------------------------------------------------------------------- decor

export type DecorId =
  | 'moss'
  | 'driftwood'
  | 'anchor'
  | 'coral'
  | 'airpump'
  | 'lantern'
  | 'chest'

export interface DecorItem {
  id: DecorId
  name: string
  desc: string
  effect: string
  price: number
  unlockLevel: number
}

export const DECOR_ITEMS: DecorItem[] = [
  {
    id: 'moss',
    name: 'Yosun Topu',
    desc: 'Yumuşacık bir Marimo. Tankına sakin bir yeşillik katar.',
    effect: 'Balıklar %2 daha yavaş acıkır',
    price: 80,
    unlockLevel: 1,
  },
  {
    id: 'driftwood',
    name: 'Ağaç Kökü',
    desc: 'Doğal görünümlü bir kök. Balıkların en sevdiği sığınak.',
    effect: 'Balıklar %2 daha yavaş acıkır',
    price: 120,
    unlockLevel: 2,
  },
  {
    id: 'anchor',
    name: 'Çapa Süsü',
    desc: 'Klasik akvaryum klasiği. Halatı ile birlikte zarif bir süs.',
    effect: 'Balıklar %2 daha yavaş acıkır',
    price: 140,
    unlockLevel: 3,
  },
  {
    id: 'coral',
    name: 'Mercan',
    desc: 'Canlı renkli yapay mercan. Tankın renk paletini tamamlar.',
    effect: 'Balıklar %2 daha yavaş acıkır',
    price: 200,
    unlockLevel: 4,
  },
  {
    id: 'airpump',
    name: 'Hava Motoru',
    desc: 'Sürekli kabarcık akışı ile suyu canlandırır.',
    effect: 'Altın kabarcıklar %25 daha sık çıkar',
    price: 180,
    unlockLevel: 4,
  },
  {
    id: 'lantern',
    name: 'Gece Feneri',
    desc: 'Işıklar söndüğünde tankını sıcacık aydınlatır.',
    effect: 'Geceleri akvaryumu aydınlatır',
    price: 220,
    unlockLevel: 5,
  },
  {
    id: 'chest',
    name: 'Hazine Sandığı',
    desc: 'Kapakları aralanmış eski bir sandık... içinde ne var acaba?',
    effect: 'Periyodik olarak +25 altınlık inci çıkarır',
    price: 320,
    unlockLevel: 6,
  },
]

export const DECOR_MAP: Record<string, DecorItem> = Object.fromEntries(
  DECOR_ITEMS.map((d) => [d.id, d]),
)

export type ObjectiveType = 'feed' | 'coins' | 'fishCount' | 'species' | 'buy'

export interface LevelDef {
  id: number
  title: string
  desc: string
  target: { type: ObjectiveType; count: number }
  reward: number
}

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    title: 'İlk Yemler',
    desc: '10 yem tanesi yedir',
    target: { type: 'feed', count: 10 },
    reward: 60,
  },
  {
    id: 2,
    title: 'Aile Büyüyor',
    desc: 'Mağazadan 1 yeni balık satın al',
    target: { type: 'buy', count: 1 },
    reward: 80,
  },
  {
    id: 3,
    title: 'Kalabalık Tank',
    desc: 'Akvaryumda 4 balığa ulaş',
    target: { type: 'fishCount', count: 4 },
    reward: 120,
  },
  {
    id: 4,
    title: 'Altın Birikimi',
    desc: 'Bu seviyede 300 altın kazan',
    target: { type: 'coins', count: 300 },
    reward: 150,
  },
  {
    id: 5,
    title: 'Şefin Eli',
    desc: '50 yem tanesi yedir',
    target: { type: 'feed', count: 50 },
    reward: 200,
  },
  {
    id: 6,
    title: 'Renk Cümbüşü',
    desc: '4 farklı balık türüne sahip ol',
    target: { type: 'species', count: 4 },
    reward: 250,
  },
  {
    id: 7,
    title: 'Büyük Göl',
    desc: 'Bu seviyede 1.000 altın kazan',
    target: { type: 'coins', count: 1000 },
    reward: 350,
  },
  {
    id: 8,
    title: 'Koleksiyoncu',
    desc: 'Akvaryumda 7 balığa ulaş',
    target: { type: 'fishCount', count: 7 },
    reward: 400,
  },
  {
    id: 9,
    title: 'Tür Zenginliği',
    desc: '6 farklı balık türüne sahip ol',
    target: { type: 'species', count: 6 },
    reward: 500,
  },
  {
    id: 10,
    title: 'Akvaryum Ustası',
    desc: '150 yem tanesi yedir',
    target: { type: 'feed', count: 150 },
    reward: 750,
  },
]

const LAST_LEVEL = LEVELS.length

/** Level definition, with endless generated levels beyond the last one. */
export function getLevelDef(level: number): LevelDef {
  if (level <= LAST_LEVEL) return LEVELS[level - 1]
  const over = level - LAST_LEVEL
  const count = 150 + over * 40
  return {
    id: level,
    title: `Ustalık ${over}`,
    desc: `${count} yem tanesi daha yedir`,
    target: { type: 'feed', count },
    reward: 400 + over * 50,
  }
}

export function speciesUnlockedAt(level: number): Species[] {
  return SPECIES_LIST.filter((s) => s.unlockLevel === level)
}

export const TANK_CAP = 10
export const START_COINS = 100
