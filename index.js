// 比较属性更新、文本更新、触发子节点更新
function patchVnode() {}
// 比较节点是否是同一个
function sameVnode() {}
// 是否是undefined or null
function isUndef() {}
// 是否是非undefined or null
function isDef() {}
// 在end和start之间批量插入新节点
function addVNodes() {}
// 批量删除节点
function removeVnodes() {}
// 新增并插入单个节点
function createElm() {}
// 跨平台、封装简化API
const nodeOps = {
  // 节点的移动并插入操作
  insertBefore() {}
};

// 如何测试呢？我会把这个方法置换源代码重的方法，一些工具函数如createKeyToOldIdx，我会把它声明在函数的的作用于内，既保证函数执行的逻辑，又不影响其他人引用
// 先写出来，再搞清楚为什么要采用这种方式
// 假设这是vnode 先不考虑空节点
// 暂不考虑transition
// 暂不考虑服务端渲染
// 以老节点为基准
// eslint-disable-next-line no-unused-vars
function updateChildren(parentElm, oldList, newList) {
  function log(list) {
    console.log(list.map(({ key }) => key));
  }
  log(oldList);
  log(newList);
  // 先假设节点数组都有key且key不重复
  // 生成key的下标
  // { key1: 1, key2: 3, key3: 4}
  function createKeyToOldIdx(oldList, oldStart, oldEnd) {
    const map = {};
    for (let i = oldStart; i <= oldEnd; i++) {
      const { key } = oldList[i];
      if (isDef(key)) map[key] = i;
    }
    return map;
  }
  // 处理节点没有key的情况 没有key直接遍历比较 返回下标 此时时间复杂度变为O(n^2)
  function findIdxInOld(vnode, list, beginIdx, endIdx) {
    for (let i = beginIdx; i < endIdx; i++) {
      const c = list[i];
      if (isDef(c) && sameVnode(vnode, c)) return i;
    }
  }

  const lastIndex = arr => arr.length - 1;
  let [oldStartIdx, oldEndIdx] = [0, lastIndex(oldList)];
  let [newStartIdx, newEndIdx] = [0, lastIndex(newList)];
  // 两两交叉比较
  let [newStartVnode, newEndVnode] = [newList[newStartIdx], newList[newEndIdx]];
  let [oldStartVnode, oldEndVnode] = [oldList[oldStartIdx], oldList[oldEndIdx]];
  // 生成老节点 key和下标的映射
  let oldKeyToIdx;
  // 循环至其中一个数组遍历完成
  while (newStartIdx <= newEndIdx && oldStartIdx <= oldEndIdx) {
    // 处理一些异常 老首或老末不存在 则继续循环
    if (isUndef(oldStartVnode)) {
      oldStartVnode = oldList[++oldStartIdx];
    } else if (isUndef(oldEndVnode)) {
      oldEndVnode = oldList[--oldEndIdx];
      // 老首 == 新首 不用移动直接更新
    } else if (sameVnode(oldStartVnode, newStartVnode)) {
      patchVnode(oldStartVnode, newStartVnode);
      newStartVnode = newList[++newStartIdx];
      oldStartVnode = oldList[++oldStartIdx];
      // 老末 == 新末 不用移动直接更新
    } else if (sameVnode(oldEndVnode, newEndVnode)) {
      patchVnode(oldEndVnode, newEndVnode);
      newEndVnode = newList[--newEndIdx];
      oldEndVnode = oldList[--oldEndIdx];
      // 老首 == 新末
    } else if (sameVnode(oldStartVnode, newEndVnode)) {
      // 先执行节点属性更新
      patchVnode(oldStartVnode, newEndVnode);
      // 注意：insertBefore、appendChild都是节点移动操作
      // 把老首移动到oldEndIdx位置;
      // insert之后没有改变下标
      // 没有操作vdom
      // 这里对节点插入操作做了一些封装，1. 同构，要保证两端运行。 2. 简化API，末尾插入使用的其实是appendChild
      nodeOps.insertBefore(
        parentElm,
        oldStartVnode.elm,
        nodeOps.nextSibling(oldEndVnode.elm)
      );
      // 这里要移动下标
      oldStartVnode = oldList[++oldStartIdx];
      newEndVnode = newList[--newEndIdx];
      // 老末 == 新首
    } else if (sameVnode(oldEndVnode, newStartVnode)) {
      patchVnode(oldEndVnode, newStartVnode);
      // 把老末移动到oldStartIndex
      nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
      oldEndVnode = oldList[--oldEndIdx];
      newStartVnode = newList[++newStartIdx];

      // 以上所有情况其实都是对常规场景的优化，就是比如节点增删，时间复杂度都是O(n)
      // 对于节点交换位置，可能会触发以下算法，就是常规的队列比较移动算法，如果有key时间复杂度也是O(n)，但能做到差异最小化
      // 54231 => 14532 到53 => 42会进入
      // 利用了队列的唯一key
    } else {
      // 映射只生成一次
      if (isUndef(oldKeyToIdx))
        oldKeyToIdx = createKeyToOldIdx(oldList, oldStartIdx, oldEndIdx);
      // 这里假设子节点都有唯一key
      const idxInOld = isDef(newStartVnode.key)
        ? oldKeyToIdx[newStartVnode.key]
        : findIdxInOld(newStartVnode, oldList, oldStartIdx, oldEndIdx);
      if (isUndef(idxInOld)) {
        // 如果新首在老节点中不存在 进行新增并插入操作
        // 插入并新增节点
        createElm(newStartVnode, [], parentElm, oldStartVnode.elm);
      } else {
        // 否则就是更新操作
        // 找到需要更新的节点
        const vnodeToMove = oldList[idxInOld];
        // 保险起见这里还需要比较一次，防止出现key相同，但节点类型不同情况
        if (sameVnode(vnodeToMove, newStartVnode)) {
          // 老规矩先执行属性更新
          patchVnode(vnodeToMove, newStartVnode);
          // 这一步很关键 因为节点已经被移动了 置空可以在下次循环时过滤掉 在上面
          oldList[idxInOld] = undefined;
          // 再次强调：insertBefore是移动操作
          nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm);
        } else {
          // 如果节点key相同 但类型不同 那么相当于插入了新节点
          // 插入并新增节点
          createElm(newStartVnode, [], parentElm, oldStartVnode.elm);
        }
      }
      // while(i) {++i} 循环结束时i+=1
      newStartVnode = newList[++newStartIdx];
    }
  }
  // 循环结束时可能出现三种情况: 1. 老节点未遍历完 2. 新节点未遍历完. 3. 全部节点都遍历完成
  // 为什么不用oldEndIdx > oldStartIdx ? 来判断老节点未遍历完 我觉得都行
  if (oldStartIdx > oldEndIdx) {
    // 老节点遍历完成 新节点可能还未遍历完成 未完成的直接批量插入到oldStartIdx和oldEndIdx交错的位置
    // 最典型的场景就是中间连续节点新增的情况
    const refElm = isUndef(newList[newEndIdx + 1])
      ? null
      : newList[newEndIdx + 1].elm;
    // 这个函数细细一想里面应该涉及到一个VDom的操作 与differ本身无关 所以就直接复用了
    addVnodes(parentElm, refElm, newList, newStartIdx, newEndIdx, []);
  } else if (newStartIdx > newEndIdx) {
    // 如果新节点先遍历完 则把多的老节点全部删除掉
    // 最典型的就是批量节点删除情况
    // 还有一种全部都走else的情况
    removeVnodes(parentElm, oldList, oldStartIdx, oldEndIdx);
  }
}
