import DiffMatchPatch from './linear-diff'

export default class LinearDiffer extends DiffMatchPatch {
  indexOf (haystack, needle) {
    const needleLength = needle.length
    const hayStackLength = haystack.length

    if (needleLength === 0) {
      return needleLength
    }

    if (hayStackLength < needleLength) {
      return -1
    }

    const charTable = this._makeCharTable(needle)
    const offsetTable = this._makeOffsetTable(needle)

    for (let i = needleLength - 1; i < hayStackLength;) {
      let k
      for (k = needleLength - 1; this.isEqualChar(needle[k], haystack[i]); i--, k--) {
        if (k === 0) {
          return i
        }
      }
      i += Math.max(offsetTable[needleLength - 1 - k], charTable[JSON.stringify(haystack[i])])
    }

    return -1
  }

  _makeCharTable (needle) {
    const table = {}

    needle.forEach((char, index) => {
      table[JSON.stringify(char)] = index === needle.length - 1 ? needle.length : needle.length - index - 1
    })

    return table
  }

  _makeOffsetTable (needle) {
    let suffix
    const lastIndex = needle.length - 1
    let lastPrefix = needle.length
    const table = new Uint32Array(needle.length)

    for (let i = lastIndex; i >= 0; i--) {
      if (this._isPrefix(needle, i + 1)) {
        lastPrefix = i + 1
      }
      table[lastIndex - i] = lastPrefix - i + lastIndex
    }

    for (let i = 0; i < needle.length; i++) {
      suffix = this._suffixLength(needle, i)
      table[suffix] = lastIndex - i + suffix
    }

    return table
  }

  _isPrefix (needle, i) {
    for (let k = 0; i < needle.length; i++, k++) {
      if (!this.isEqualChar(needle[i], needle[k])) {
        return false
      }
    }

    return true
  }

  _suffixLength (needle, i) {
    let length = 0

    for (let checkPos = needle.length - 1; i >= 0 && needle[i] === needle[checkPos]; i--, checkPos--) {
      length += 1
    }

    return length
  }

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
    const diff = this.diff_main(oldData, newData, { checklines: false })
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
