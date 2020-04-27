import { Differ, Tree, TreeNode } from './tree-diff'
import LinearDiff from './LinearDiff'

class DomTreeNode extends TreeNode {
  isEqual (otherNode) {
    if (this.node.inline) {
      return otherNode.node.inline &&
        otherNode.node.tag === this.node.tag &&
        otherNode.node.content === this.node.content &&
        JSON.stringify(otherNode.node.attrs) === JSON.stringify(this.node.attrs)
    }

    return otherNode.node.tag === this.node.tag &&
      JSON.stringify(otherNode.node.attrs) === JSON.stringify(this.node.attrs)
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

    const renderNode = (node, classList) => {
      if (node.hide) {
        return []
      }

      if (node.inline) {
        const tag = node.tag === '#text' ? 'span' : node.tag

        if (node.changed && node.oldContent) {
          return [
            h(
              LinearDiff,
              {
                class: [...classList, 'vuesual-diff__sub-diff'],
                attrs: node.attrs,
                props: { tag: tag, old: node.oldContent, new: node.content }
              },
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
                attrs: node.attrs,
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
              attrs: node.attrs,
              domProps: { innerHTML: node.content }
            }
          )
        ]
      }

      const renderedChilds = node.children.flatMap(child => renderNode(child, []))

      if (node.changed && node.replaces) {
        return [
          ...renderNode(node.replaces, [...classList, 'vuesual-diff__deleted']),
          h(node.tag, { class: [...classList, 'vuesual-diff__inserted'], attrs: node.attrs }, renderedChilds)
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
            ],
            attrs: node.attrs
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
          const newNode = newTree.orderedNodes[rhsIndex]

          if (newNode.parent !== undefined && correspondingNodes.newToOld[newNode.parent.index] !== undefined) {
            newNode.node.inserted = true
          }
        } else if (lhsIndex !== null && rhsIndex === null) {
          const oldNode = oldTree.orderedNodes[lhsIndex]
          const { node: lhs, parent: lastCommonAncestor } = oldNode
          lhs.deleted = true
          const correspondingAncestorIndex = correspondingNodes.oldToNew[lastCommonAncestor.index]
          if (correspondingAncestorIndex === undefined) {
            return
          }

          // Hide nested nodes that were moved out of this one rather than removed
          const hideChanged = (node) => {
            if (correspondingNodes.oldToNew[node.index] !== undefined) {
              node.node.hide = true
            }

            node.children.forEach(hideChanged)
          }

          hideChanged(oldNode)

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
            this.prependNode(correspondingAncestor.node, lhs)
          }
        } else if (lhsIndex !== null && rhsIndex !== null) {
          const lhs = oldTree.orderedNodes[lhsIndex].node
          const rhs = newTree.orderedNodes[rhsIndex].node
          rhs.changed = true

          if (lhs.tag === rhs.tag && lhs.inline && rhs.inline && JSON.stringify(lhs.attrs) === JSON.stringify(rhs.attrs)) {
            rhs.oldContent = lhs.content
          } else {
            rhs.replaces = lhs
          }
        }
      })

      this.diff = newTree.root.node
    },
    prependNode (parent, node) {
      if (!parent.inline) {
        parent.children.unshift(node)
      } else {
        const contentNode = { ...parent }
        contentNode.tag = 'SPAN'
        parent.inline = false
        parent.children = [node, contentNode]
        delete parent.content
      }
    },
    buildTree (root) {
      const self = this

      function transformNode (node) {
        if (node.nodeType === Node.COMMENT_NODE) {
          return []
        }

        if (node.nodeType === Node.TEXT_NODE && node.textContent.match(/^\s+$/)) {
          return []
        }

        if (node.nodeType === Node.TEXT_NODE) {
          return [{ tag: node.nodeName, inline: true, content: node.textContent.trim(), attrs: {} }]
        }

        const attrs = {}
        const attributes = node.attributes
        if (attributes !== undefined) {
          for (let i = 0; i < attributes.length; i++) {
            attrs[attributes[i].name] = attributes[i].value
          }
        }

        if (node.nodeName === 'LI') {
          const childLists = node.querySelectorAll('ul, ol')

          if (childLists.length === 0) {
            return [{ tag: node.nodeName, children: [{ tag: 'SPAN', inline: true, content: node.innerHTML.trim() }], attrs }]
          }

          const children = []
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
              children.push(...transformNode(span))
            }

            children.push(...transformNode(list))
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
            children.push(...transformNode(span))
          }

          return [{ tag: 'LI', children, attrs }]
        }

        if (!self.blockTags.includes(node.nodeName.toLowerCase())) {
          return [{ tag: node.nodeName, inline: true, content: (node.innerHTML || node.textContent).trim(), attrs }]
        }

        return [{ tag: node.nodeName, children: Array.from(node.childNodes).flatMap(transformNode), attrs }]
      }

      return transformNode(root)[0]
    }
  }
}
