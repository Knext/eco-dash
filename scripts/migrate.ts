import './load-env'
import { getDb } from '../src/lib/db/client'

const db = getDb()
const r = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all()
console.log('Tables:', r)
console.log('Migration applied (schema.sql is auto-applied on connect).')
