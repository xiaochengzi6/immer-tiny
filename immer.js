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
        }
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
    // 收集 创建的 proxy 对象
    const proxies = new Map()

    // 用来处理被修改的属性 将其属性设置位 proxy 对象并存储在copies
    const copies = new Map()

    const objectTraps = {
        get(target, prop) {
            return createProxy(getCurrentSource(target)[prop])
        },
        has(target, prop) {
            return prop in getCurrentSource(target)
        },
        ownKeys(target) {
            return Reflect.ownKeys(getCurrentSource(target))
        },
        set(target, prop, value) {
            const current = createProxy(getCurrentSource(target)[prop])
            const newValue = createProxy(value)

            // 这里要判断前后修改的内容是否相同 如果不是就会重新创建
            // 确保 copy 是 proxy 对象 从而修改数据的时候会触发 proxy 代理从而能记录上
            // 方便从记录中去修改
            // 当然记录的地方不仅仅只有 set 操作 proxy 对象的都会记录在 copies
            if (current !== newValue) {
                const copy = getOrCreateCopy(target)
                copy[prop] = newValue
            }

            // 修改后的操作返回 true 从而不抛出任何值
            return true
        },
        deleteProperty(target, property) {
            const copy = getOrCreateCopy(target)
            delete copy[property]
            return true
        }
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

    // 创建 proxy
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
        return false
    }

    // 递归去修改 proxy 对象中的属性且每一个属性若是对象或者是数组就会被存储位 proxy 对象、对象的属性、对象属性的属性
    // 从而不停的递归处理
    function finalize(base) {
        if (isPlainObject(base)) return finalizeObject(base)
        if (Array.isArray(base)) return finalizeArray(base)

        return base
    }

    function finalizeObject(thing) {
        if (!hasChanges(thing)) return thing
        const copy = getOrCreateCopy(thing)
        // 递归处理 对象的属性
        Object.keys(copy).forEach((prop) => {
            copy[prop] = finalize(copy[prop])
        })
        return copy
    }

    function finalizeArray(thing) {
        if (!hasChanges(thing)) return thing
        const copy = getOrCreateCopy(thing)
        // 递归处理数组中的属性
        copy.forEach((value, index) => {
            copy[index] = finalize(copy[index])
        })
        return copy
    }

    // 首先创建根对象 proxy 对象
    const rootClone = createProxy(baseState)

    // 这里就去修改
    thunk(rootClone)

    // 递归的去修改 对象中的属性 且属性若是没有被修改会服用之前的确保引用正确
    return finalize(baseState)
}

// 判断是否是 object
function isPlainObject(value) {
    if (value === null || typeof value !== 'object') return false
    const proto = Object.getPrototypeOf(value)

    return proto === Object.prototype || proto == null
}
