import { Differ, Tree, TreeNode } from '@/tree-diff'
import LinearDiff from '@/LinearDiff.js'

class DomTreeNode extends TreeNode {
  isEqual (otherNode) {
    if (this.node.inline) {
      return otherNode.node.inline && otherNode.node.tag === this.node.tag && this.node.content === otherNode.node.content
    }

    return otherNode.node.tag === this.node.tag
  }

  getOriginalNodeChildren () {
    if (this.node.inline) {
      return []
    }

    return [...this.node.children]
  }
}

export default {
  name: 'TreeDiff',
  components: { LinearDiff },
  props: {
    tag: {
      type: String,
      default: () => 'div'
    },
    old: {
      type: String,
      required: true
    },
    new: {
      type: String,
      required: true
    },
    blockTags: {
      type: Array,
      default: () => ['div', 'table', 'ul', 'ol']
    }
  },
  data () {
    return {
      diff: null
    }
  },
  watch: {
    tag () {
      this.updateDiff()
    },
    old () {
      this.updateDiff()
    },
    new () {
      this.updateDiff()
    },
    blockTags () {
      this.updateDiff()
    }
  },
  mounted () {
    this.updateDiff()
  },
  render (h) {
    if (this.diff === null) {
      return h(
        this.tag,
        { class: ['vuesual-diff', 'vuesual-diff--tree', 'vuesual-diff--placeholder'] },
        [this.$slots.placeholder || 'Computing diff...']
      )
    }

    function renderNode (node, classList) {
      if (node.inline) {
        const tag = node.tag === '#text' ? 'span' : node.tag

        if (node.changed && node.oldContent) {
          return [
            h(
              LinearDiff,
              { class: [...classList, 'vuesual-diff__sub-diff'], props: { tag: tag, old: node.oldContent, new: node.content } },
              [
                this.$slots.linearPlaceholder
                  ? h('template', { slot: 'placeholder' }, [this.$slots.linearPlaceholder])
                  : undefined
              ].filter(child => child !== undefined)
            )
          ]
        } else if (node.changed && node.replaces) {
          return [
            ...renderNode(node.replaces, [...classList, 'vuesual-diff__deleted']),
            h(
              tag,
              {
                class: [...classList, 'vuesual-diff__inserted'],
                domProps: { innerHTML: node.content }
              }
            )
          ]
        }

        return [
          h(
            tag,
            {
              class: [
                ...classList,
                ...(node.inserted ? ['vuesual-diff__inserted'] : []),
                ...(node.deleted ? ['vuesual-diff__deleted'] : [])
              ],
              domProps: { innerHTML: node.content }
            }
          )
        ]
      }

      const renderedChilds = node.children.flatMap(child => renderNode(child, []))

      if (node.changed && node.replaces) {
        return [
          ...renderNode(node.replaces, [...classList, 'vuesual-diff__deleted']),
          h(node.tag, { class: [...classList, 'vuesual-diff__inserted'] }, renderedChilds)
        ]
      }

      return [
        h(
          node.tag,
          {
            class: [
              ...classList,
              ...(node.inserted ? ['vuesual-diff__inserted'] : []),
              ...(node.deleted ? ['vuesual-diff__deleted'] : [])
            ]
          },
          renderedChilds
        )
      ]
    }

    return h(this.tag, { class: ['vuesual-diff', 'vuesual-diff--tree'] }, this.diff.children.flatMap(child => renderNode(child, [])))
  },
  methods: {
    async updateDiff () {
      const oldElement = document.createElement(this.tag)
      oldElement.innerHTML = this.old
      const newElement = document.createElement(this.tag)
      newElement.innerHTML = this.new

      const oldTree = new Tree(this.buildTree(oldElement), DomTreeNode)
      const newTree = new Tree(this.buildTree(newElement), DomTreeNode)

      const differ = new Differ(oldTree, newTree)
      const transactions = differ.transactions[oldTree.orderedNodes.length - 1][newTree.orderedNodes.length - 1]
      const correspondingNodes = Differ.prototype.getCorrespondingNodes(
        transactions,
        oldTree.orderedNodes.length,
        newTree.orderedNodes.length
      )

      transactions.reverse().forEach(([lhsIndex, rhsIndex]) => {
        if (lhsIndex === null && rhsIndex !== null) {
          newTree.orderedNodes[rhsIndex].node.inserted = true
        } else if (lhsIndex !== null && rhsIndex === null) {
          const { node: lhs, parent: lastCommonAncestor } = oldTree.orderedNodes[lhsIndex]
          lhs.deleted = true
          const correspondingAncestorIndex = correspondingNodes.oldToNew[lastCommonAncestor.index]
          if (correspondingAncestorIndex === undefined) {
            return
          }

          let previousNodeIndex
          const siblingNodes = lastCommonAncestor.children
          for (const sibling of siblingNodes) {
            if (sibling.index === lhsIndex) {
              break
            } else {
              const correspondingIndex = correspondingNodes.oldToNew[sibling.index]
              if (correspondingIndex !== undefined) {
                previousNodeIndex = correspondingIndex
              }
            }
          }

          const correspondingAncestor = newTree.orderedNodes[correspondingAncestorIndex]
          if (previousNodeIndex !== undefined) {
            const previousNode = newTree.orderedNodes[previousNodeIndex]
            const insertIndex = correspondingAncestor.children.filter(child => child.index <= previousNode.index).length
            correspondingAncestor.node.children.splice(insertIndex, 0, lhs)
          } else {
            correspondingAncestor.node.children.unshift(lhs)
          }
        } else if (lhsIndex !== null && rhsIndex !== null) {
          const lhs = oldTree.orderedNodes[lhsIndex].node
          const rhs = newTree.orderedNodes[rhsIndex].node
          rhs.changed = true

          if (lhs.tag === rhs.tag && lhs.inline && rhs.inline) {
            rhs.oldContent = lhs.content
          } else {
            rhs.replaces = lhs
          }
        }
      })

      this.diff = newTree.root.node
    },
    buildTree (root) {
      const self = this

      function transformNode (node, parent) {
        if (node.nodeType === Node.COMMENT_NODE) {
          return []
        }

        if (node.nodeType === Node.TEXT_NODE && node.textContent.match(/^\s+$/)) {
          return []
        }

        if (node.nodeName === 'LI') {
          const childLists = node.querySelectorAll('ul, ol')

          if (childLists.length === 0) {
            return [{ parent, tag: node.nodeName, inline: true, content: node.innerHTML }]
          }

          const children = []
          const transformedNode = { parent, tag: 'LI', children }
          let lastList = null
          childLists.forEach((list) => {
            if (list.parentNode !== node) {
              return
            }

            const span = document.createElement('span')

            let element = list.previousSibling
            while (element !== lastList) {
              const nextElement = element.previousSibling
              span.appendChild(element)
              element = nextElement
            }

            if (span.childNodes.length > 0) {
              children.push(...transformNode(span, transformedNode))
            }

            children.push(...transformNode(list, transformedNode))
            lastList = list
          })

          const span = document.createElement('span')
          let element = lastList.nextSibling
          while (element !== null) {
            const nextElement = element.nextSibling
            span.appendChild(element)
            element = nextElement
          }
          if (span.childNodes.length > 0) {
            children.push(...transformNode(span, transformedNode))
          }

          return [transformedNode]
        }

        if (!self.blockTags.includes(node.nodeName.toLowerCase())) {
          return [{ parent, tag: node.nodeName, inline: true, content: node.innerHTML || node.textContent }]
        }

        const children = []
        const transformedNode = { parent, tag: node.nodeName, children }

        node.childNodes.forEach((child) => {
          children.push(...transformNode(child, parent))
        })

        return [transformedNode]
      }

      return transformNode(root)[0]
    }
  }
}
