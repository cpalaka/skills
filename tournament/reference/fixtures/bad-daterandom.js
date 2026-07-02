export const meta = { name: 'x', description: 'y', phases: [{ title: 'A' }] }
phase('A')
const t = Date.now()
const r = await parallel([() => agent('hi', { model: 'opus' })])
return r
