// 如何测试呢？我会把这个方法置换源代码重的方法，一些工具函数如createKeyToOldIdx，我会把它声明在函数的的作用于内，既保证函数执行的逻辑，又不影响其他人引用
// 先写出来，再搞清楚为什么要采用这种方式
// 假设这是vnode 先不考虑空节点
// 暂不考虑transition
// 暂不考虑服务端渲染
// 以老节点为基准
function updateChildren(parentElm, oldList, newList) {
  // 先假设节点数组都有key且key不重复
  // 生成key的下标
  // { key1: 1, key2: 3, key3: 4}
  function createKeyToOldIdx(oldList, oldStart, oldEnd) {
    const map = {};
    for (let i = oldStart; i <= oldEnd; i++) {
      const { key } = oldList[i];
      map[key] = i;
    }
    return map;
  }

  const lastIndex = arr => (arr.length ? arr.length - 1 : 0);
  let [oldStartIdx, oldEndIdx] = [0, lastIndex(oldList)];
  let [newStartIdx, newEndIdx] = [0, lastIndex(newList)];
  // 两两交叉比较
  let [newStartVNode, newEndVNode] = [newList[newStartIdx], newList[newEndIdx]];
  let [oldStartVNode, oldEndVNode] = [oldList[oldStartIdx], oldList[oldEndIdx]];
  // 生成老节点 key和下标的映射
  let oldKeyToIdx;
  // 循环至其中一个数组遍历完成
  while (newStartIdx <= newEndIdx && oldStartIdx <= oldEndIdx) {
    // 处理一些异常 老首或老末不存在 则继续循环
    if (isUndef(oldStartVNode)) {
      oldStartVNode = oldList[++oldStartIdx];
    } else if (isUndef(oldEndVNode)) {
      oldEndVNode = oldList[--oldEndIdx];
    }
    // 老首 == 新首 不用移动直接更新
    else if (sameVnode(oldStartVNode, newStartVNode)) {
      patchVnode(oldStartVNode, newStartVNode);
      newStartVNode = newList[++newStartIdx];
      oldStartVNode = oldList[++oldStartIdx];
      // 老末 == 新末 不用移动直接更新
    } else if (sameVnode(oldEndVNode, newEndVNode)) {
      patchVnode(oldEndVNode, newEndVNode);
      newEndVNode = newList[--newEndIdx];
      oldEndVNode = oldList[--oldEndIdx];
      // 老首 == 新末
    } else if (sameVnode(oldStartVNode, newEndVNode)) {
      // 先执行节点属性更新
      patchVnode(oldEndVNode, newStartVNode);
      // 注意：insertBefore、appendChild都是节点移动操作
      // 把老首移动到oldEndIdx位置;
      // insert之后没有改变下标
      // 没有操作vdom
      parentElm.insertBefore(
        parentElm,
        oldStartVNode.elm,
        oldEndVNode.elm.nextSibling
      );
      // 这里要移动下标
      oldStartVNode = oldList[++oldStartIdx];
      newEndVNode = newList[--newEndVNode];
      // 老末 == 新首
    } else if (sameVnode(oldEndVNode, newStartVNode)) {
      patchVnode(oldEndVNode, newStartVNode);
      // 把老末移动到oldStartIndex
      parentElm.insertBefore(oldEndVNode.elm, oldStartVNode.elm);
      oldEndVNode = oldList[--oldEndIdx];
      newStartVNode = newList[++newStartIdx];

      // 以上所有情况其实都是对常规场景的优化，就是比如节点增删，时间复杂度都是O(n)
      // 对于节点交换位置，可能会触发以下算法，就是常规的队列比较移动算法，如果有key时间复杂度也是O(n)，但能做到差异最小化
      //54231 => 14532 到53 => 42会进入
      // 利用了队列的唯一key
    } else {
      // 映射只生成一次
      if (isUndef(oldKeyToIdx)) {
        oldKeyToIdx = createKeyToOldIdx(oldList, oldStartIdx, oldEndIdx);
      }
      // 这里假设子节点都有唯一key
      const idxInOld = oldKeyToIdx[newStartVNode.key];
      if (isUndef(idxInOld)) {
        // 如果新首在老节点中不存在 进行新增并插入操作
        // 这里我简化了 写一个框架真的很不容易 要考虑很多极限情况
        parentElm.insertBefore(oldStartVNode.elm, newStartVNode.elm);
      } else {
        // 否则就是更新操作
        // 找到需要更新的节点
        const vnodeToMove = oldList[idxInOld];
        // 保险起见这里还需要比较一次，防止出现key相同，但节点类型不同情况
        if (sameVnode(vnodeToMove, newStartVNode)) {
          // 老规矩先执行属性更新
          patchVnode(vnodeToMove, newStartVNode);
          // 这一步很关键 因为节点已经被移动了 置空可以在下次循环时过滤掉 在上面
          oldList[idxInOld] = undefined;
          // 再次强调：insertBefore是移动操作
          parentElm.insertBefore(vnodeToMove.elm, newStartVNode.elm);
        } else {
          // 如果节点key相同 但类型不同 那么相当于插入了新节点
          parentElm.insertBefore(oldStartVNode.elm, newStartVNode.elm);
        }
      }
      // while(i) {++i} 循环结束时i+=1
      newStartVNode = newList[++newStartIdx];
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
