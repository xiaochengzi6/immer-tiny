// 参考文章 https://juejin.cn/post/6926099651510665230#heading-5

module.exports = immer

/**
 * immer 原理
 * @param {*} state 这里可以被理解为初始的 state
 * @param {*} thunk 用于修改 state 的处理函数
 * @returns
 */
function immer_tiny(state, thunk) {
  let copies = new Map()

  const handler = {
    get(target, prop) {
      // 获取对象的属性时 同时会将其包裹一层 proxy 用于修改深层次对象中的属性值
      return new Proxy(target[prop], handler)
    },
    set(target, prop, value) {
      // 准备修改的对象 [对象、对象的属性、对象属性的属性]
      const copy = { ...target }
      copy[prop] = value
      // 对象的属性发生变化就会存储在 map 中 能够确保对象及其属性的引用完整
      copies.set(target, copy)
    },
  }

  function finalize(state) {
    const result = { ...state }

    // 这里还有点局限性 这里最深只能对对象的属性(对象) 进行处理
    Object.keys(state).map((key) => {
      const copy = copies.get(state[key])
      if (copy) {
        result[key] = copy
      } else {
        result[key] = state[key]
      }
    })

    return result
  }

  const proxy = new Proxy(state, handler)
  thunk(proxy)

  return finalize(state)
}

function immer(baseState, thunk) {
  //
  const proxies = new Map()
  // 用来保存差异
  const copies = new Map()

  const objectTraps = {
    get(target, prop) {
      return createProxy()
    },
    has(target, prop) {},
    ownKeys(target) {
      return Reflect.ownKeys()
    },
    set(target, prop, value) {},
    deleteProperty(target, property) {},
  }

  // 用于处理 baseState 上所有的对象和数组将其保存在 map 中
  function getOrCreateCopy(base) {
    let copy = copies.get(base)
    if (!copy) {
      copy = Array.isArray(base) ? base.slice() : Object.assign({}, base)
      copies.set(base, copy)
    }
    return copy
  }

  // 获取 copies 上存储的东西
  function getCurrentSource(base) {
    const copy = copies.get(base)
    return copy || base
  }

  // 创建 propxy
  function createProxy(base) {
    if (isPlainObject(base) || Array.isArray(base)) {
      if (proxies.has(base)) return proxies.get(base)

      const proxy = new Proxy(base, objectTraps)
      proxies.set(base, proxy)

      return proxy
    }
    return base
  }

  // 判断是否修改
  function hasChanges(base) {
    const proxy = proxies.get(base)
    // 没有放在 proxies 中的都是基本类型 所以返回 false
    if (!proxy) return false
    if (copies.has(base)) return true

    const keys = Object.keys(base)

    for (let i = 0; i < keys.length; i++) {
      if (hasChanges(base[keys[i]])) return true
    }
  }
}

const obj = {
  a: 1,
  b: 2,
  c: 3,
}

console.log(obj[0], obj[1], obj[2])
