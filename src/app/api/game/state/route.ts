import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const fishSchema = z.object({
  species: z.string().min(1).max(40),
  growth: z.number().min(0).max(1),
  name: z.string().max(16).optional(),
})

const saveSchema = z.object({
  coins: z.number().int().min(0).max(99_999_999),
  level: z.number().int().min(1).max(9_999),
  fedTotal: z.number().int().min(0).max(9_999_999),
  coinsTotal: z.number().int().min(0).max(99_999_999),
  purchases: z.number().int().min(0).max(99_999),
  fish: z.array(fishSchema).max(20),
  decor: z.array(z.string().max(24)).max(12),
  soundOn: z.boolean(),
})

export async function GET() {
  try {
    const save = await db.gameSave.findUnique({ where: { id: 'default' } })
    if (!save) return NextResponse.json({ save: null })
    return NextResponse.json({
      save: {
        coins: save.coins,
        level: save.level,
        fedTotal: save.fedTotal,
        coinsTotal: save.coinsTotal,
        purchases: save.purchases,
        fish: JSON.parse(save.fishJson) as unknown[],
        decor: JSON.parse(save.decorJson) as unknown[],
        soundOn: save.soundOn,
      },
    })
  } catch (err) {
    console.error('GET /api/game/state failed:', err)
    return NextResponse.json({ save: null, error: 'Kayıt yüklenemedi' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = saveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Geçersiz kayıt verisi' }, { status: 400 })
    }
    const d = parsed.data
    await db.gameSave.upsert({
      where: { id: 'default' },
      update: {
        coins: d.coins,
        level: d.level,
        fedTotal: d.fedTotal,
        coinsTotal: d.coinsTotal,
        purchases: d.purchases,
        fishJson: JSON.stringify(d.fish),
        decorJson: JSON.stringify(d.decor),
        soundOn: d.soundOn,
      },
      create: {
        id: 'default',
        coins: d.coins,
        level: d.level,
        fedTotal: d.fedTotal,
        coinsTotal: d.coinsTotal,
        purchases: d.purchases,
        fishJson: JSON.stringify(d.fish),
        decorJson: JSON.stringify(d.decor),
        soundOn: d.soundOn,
      },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/game/state failed:', err)
    return NextResponse.json({ error: 'Kayıt edilemedi' }, { status: 500 })
  }
}
