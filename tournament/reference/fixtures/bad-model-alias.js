export const meta = { name: 'x', description: 'y', phases: [{ title: 'A' }] }
phase('A')
const r = (await parallel([() => agent('hi', { model: 'opus' })])).filter(Boolean)
return r
