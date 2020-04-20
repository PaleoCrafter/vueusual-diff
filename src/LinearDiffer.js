import DiffMatchPatch from '@/linear-diff'

export default class LinearDiffer extends DiffMatchPatch {
  isEqualChar (a, b) {
    if (a === b) {
      return true
    }

    if (a === undefined || b === undefined) {
      return false
    }

    if (a.text !== b.text) {
      return false
    }

    return JSON.stringify(a.decorations) === JSON.stringify(b.decorations)
  }

  isEqualString (a, b) {
    if (a === b) {
      return true
    }
    if (a === null || b === null) {
      return false
    }
    if (a.length !== b.length) {
      return false
    }

    for (let i = 0, l = a.length; i < l; i++) {
      if (!this.isEqualChar(a[i], b[i])) {
        return false
      }
    }
    return true
  }

  charsToString (chars) {
    return chars.slice()
  }

  getEmptyString () {
    return []
  }

  matchChar (char, regex) {
    return char.text.match(regex)
  }

  matchString (string, regex) {
    return string.map(c => c.text).join('').match(regex)
  }

  diff (oldData, newData) {
    // Remove empty edits
    const diff = this.diff_main(oldData, newData)
    this.diff_cleanupSemantic(diff)

    const cleanedDiff = []
    // Merge consecutive insertions and deletions
    let lastType, lastContent
    diff.filter(([_, content]) => content.length > 0).forEach(([type, content]) => {
      if (lastType === undefined || lastType !== type) {
        [lastType, lastContent] = [type, content]
        cleanedDiff.push([lastType, lastContent])
        return
      }

      lastContent.push(...content)
    })

    return cleanedDiff
  }
}
