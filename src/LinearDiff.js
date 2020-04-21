import { DIFF_EQUAL, DIFF_INSERT } from './linear-diff'
import LinearDiffer from './LinearDiffer'

const decorationsMatch = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b)

const decorationsStartWith = (reference, prefix) => prefix.length > reference ? false : prefix.reduce((
  acc,
  current,
  i
) => acc && decorationsMatch(reference[i], current), true)

export default {
  name: 'LinearDiff',
  props: {
    tag: {
      type: String,
      default: () => 'p'
    },
    old: {
      type: String,
      required: true
    },
    new: {
      type: String,
      required: true
    }
  },
  data () {
    const differ = new LinearDiffer()
    differ.Diff_Timeout = 0

    return {
      diff: null,
      differ
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
    }
  },
  mounted () {
    this.updateDiff()
  },
  render (h) {
    if (this.diff === null) {
      return h(
        this.tag,
        { class: ['vuesual-diff', 'vuesual-diff--linear', 'vuesual-diff--placeholder'] },
        [this.$slots.placeholder || 'Computing diff...']
      )
    }

    function renderNode (node) {
      if (node.children === undefined) {
        return node.text
      }

      return h(node.tag, { attrs: node.attrs }, node.children.map(renderNode))
    }

    const children = this.diff.flatMap(([type, content]) => {
      const renderedContent = this.rebuildTree(content).map(renderNode)
      if (type === DIFF_EQUAL) {
        return renderedContent
      }

      if (type === DIFF_INSERT) {
        return [h('ins', { class: 'vuesual-diff__inserted' }, renderedContent)]
      }

      return [h('del', { class: 'vuesual-diff__deleted' }, renderedContent)]
    })
    return h(this.tag, { class: ['vuesual-diff', 'vuesual-diff--linear'] }, children)
  },
  methods: {
    async updateDiff () {
      const oldElement = document.createElement(this.tag)
      oldElement.innerHTML = this.old
      const newElement = document.createElement(this.tag)
      newElement.innerHTML = this.new

      const linearizedOld = this.linearizeContent(oldElement)
      const linearizedNew = this.linearizeContent(newElement)

      this.diff = this.differ.diff(linearizedOld, linearizedNew)
    },
    linearizeContent (root) {
      function linearize (node, decorations) {
        if (node.nodeType === Node.COMMENT_NODE) {
          return []
        }

        if (node.nodeType === Node.TEXT_NODE) {
          return Array.from(node.textContent).map(char => ({ text: char, decorations }))
        }

        const content = []
        node.childNodes.forEach((child) => {
          const attrs = {}
          const attributes = node.attributes
          if (attributes !== undefined) {
            for (let i = 0; i < attributes.length; i++) {
              attrs[attributes[i].name] = attributes[i].value
            }
          }

          content.push(...linearize(child, [...decorations, { tag: node.nodeName, attrs }]))
        })
        return content
      }

      const linearized = []
      root.childNodes.forEach((child) => {
        linearized.push(...linearize(child, []))
      })

      return linearized
    },
    rebuildTree (linearized) {
      const rootNode = { children: [] }

      let currentNode
      let prefix = []
      const nodeStack = [rootNode]
      linearized.forEach(({ text, decorations }) => {
        if (currentNode === undefined) {
          let lastNode = rootNode
          decorations.forEach(deco => {
            const node = { tag: deco.tag, attrs: deco.attrs, children: [] }
            lastNode.children.push(node)
            lastNode = node
            nodeStack.push(lastNode)
          })
          currentNode = { text }
          lastNode.children.push(currentNode)
          prefix = [...decorations]
          return
        }

        if (decorationsMatch(prefix, decorations)) {
          currentNode.text += text
          return
        }

        let lastNode = nodeStack.pop()
        while (!decorationsStartWith(decorations, prefix)) {
          prefix.pop()
          lastNode = nodeStack.pop()
        }
        nodeStack.push(lastNode)

        decorations.slice(prefix.length).forEach(deco => {
          const node = { tag: deco.tag, attrs: deco.attrs, children: [] }
          lastNode.children.push(node)
          lastNode = node
          nodeStack.push(lastNode)
        })

        currentNode = { text }

        lastNode.children.push(currentNode)

        prefix = [...decorations]
      })

      return rootNode.children
    }
  }
}
