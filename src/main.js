import LinearDiff from '@/LinearDiff.js'
import TreeDiff from '@/TreeDiff.js'
import { Differ as TreeDiffer, Tree, TreeNode } from '@/tree-diff'
import LinearDiffer, { DIFF_DELETE, DIFF_EQUAL, DIFF_INSERT } from '@/linear-diff'

const Edits = { EQUAL: DIFF_EQUAL, INSERT: DIFF_INSERT, DELETE: DIFF_DELETE }

export {
  LinearDiff,
  TreeDiff,
  TreeDiffer,
  TreeNode,
  Tree,
  LinearDiffer,
  Edits
}
