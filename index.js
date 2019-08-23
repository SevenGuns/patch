// 首先搞清楚patch算法做了件什么事？？？
// 举个例子
const a = new Symbol(1);
const b = new Symbol(2);
const c = new Symbol(3);
const list = [a, b, c];
const netList = [b, c, a];
// 先写出来，再搞清楚为什么要采用这种方式
// 假设这是vnode 先不考虑空节点
// 暂不考虑transition
// 暂不考虑服务端渲染
// 以老节点为基准
function updateChildren(parentElm, oldList, newList) {
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
    else if (sameNode(oldStartVNode, newStartVNode)) {
      patchNode(oldStartVNode, newStartVNode);
      newStartVNode = newList[++newStartIdx];
      oldStartVNode = oldList[++oldStartIdx];
      // 老末 == 新末 不用移动直接更新
    } else if (sameNode(oldEndVNode, newEndVNode)) {
      patchNode(oldEndVNode, newEndVNode);
      newEndVNode = newList[--newEndIdx];
      oldEndVNode = oldList[--oldEndIdx];
      // 老首 == 新末
    } else if (sameNode(oldStartVNode, newEndVNode)) {
      // 先执行节点属性更新
      patchNode(oldEndVNode, newStartVNode);
      // 注意：insertBefore、appendChild都是节点移动操作
      // 把老首移动到oldEndIdx位置;
      parentElm.insertBefore(
        parentElm,
        oldStartVNode.elm,
        oldEndVNode.elm.nextSibling
      );
      // 老末 == 新首
    } else if (sameNode(oldEndVNode, newStartVNode)) {
      patchNode(oldEndVNode, newStartVNode);
      // 把老末移动到oldStartIndex
      parentElm.insertBefore(oldEndVNode.elm, oldStartVNode.elm);
      // 以上所有情况其实都是对常规场景的优化，就是比如节点增删，时间复杂度都是O(n)
      // 对于节点交换位置，可能会触发以下算法，就是常规的队列比较移动算法，时间复杂度也是O(n)，但能做到差异最小化
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
        if (sameNode(vnodeToMove, newStartVNode)) {
          // 老规矩先执行属性更新
          patchNode(vnodeToMove, newStartVNode);
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
    addVNodes(parentElm, newList, newStartIdx, newEndIdx);
  } else if (newStartIdx > newEndIdx) {
    // 如果新节点先遍历完 则把多的老节点全部删除掉
    // 最典型的就是批量节点删除情况
    // 还有一种全部都走else的情况
    removeVnodes(parentElm, oldList, oldStartIdx, oldEndIdx);
  }
}

// 比较属性更新、文本更新、触发子节点更新
function patchNode() {}
// 比较节点是否是同一个
function sameNode() {}
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

// 是否是undefined or null
function isUndef() {}
// 是否是非undefined or null
function isDef() {}

function addVNodes(prentElm, oldList) {}

function removeVnodes() {}
// 两个函数要覆盖，一个是createKeyToOldIdx
