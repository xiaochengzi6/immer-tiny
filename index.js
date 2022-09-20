const { state } = require('./target')
const immer = require('./immer')

// 使用
const copy = immer(state, (draft) => {
  draft.obj.A.B.C.D.E.value = 'vvavavavvav'
})

console.log(copy.obj.A.B.C.D.E.value)
