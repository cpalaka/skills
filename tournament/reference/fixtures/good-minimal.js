export const meta = { name: 'x', description: 'y', phases: [{ title: 'A' }] }
phase('A')
const r = (await parallel([() => agent('hi', { model: 'claude-opus-5' })])).filter(Boolean)
return r
