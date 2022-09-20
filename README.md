# immer-tiny


immer 原理 参考这个[文章](https://juejin.cn/post/6926099651510665230)

immer [官网](https://immerjs.github.io/immer/zh-CN/)

immer 修改数据的方式通过 proxy 的形式，未更改的就会服用之前的数据结构 并且不用考虑数据如何复制，它最终都会返回新的数据 从而保存起来特殊的[数据变更](https://immerjs.github.io/immer/zh-CN/return)

immer 强耦合与 redux-toolkit 所以学习 immer 必不可少

简单的例子 
~~~js
const counterSlice =  createSlice({
  name: 'count',
   initialState: {
    count: 1
  },
  reducer: {
    increment: (state, action) =>{
        // 这里
        state.count++  
     }
  }
})
~~~
这里就相当于使用 Immer 库
~~~js
import produce from 'immer'

// produce(currentState, recipe: (draftState) => void): nextState

const nextState = produce(state, draft => {
  draft.count++
})
~~~

这里的东西显然就被 Immer 包裹起来 从而可以直接去修改数据 不考虑先拷贝数据再修改数据这样的操作， 修改后从而返回一个新的对象每一次都会产生新对象 
