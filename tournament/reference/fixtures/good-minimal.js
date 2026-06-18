export const meta = { name: 'x', description: 'y', phases: [{ title: 'A' }] }
phase('A')
const r = (await parallel([() => agent('hi')])).filter(Boolean)
return r
