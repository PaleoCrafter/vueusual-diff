# vuesual-diff
<a href="https://www.npmjs.com/package/vuesual-diff"><img src="https://img.shields.io/npm/v/vuesual-diff.svg?sanitize=true" alt="Version"></a> <a href="https://www.npmjs.com/package/vuesual-diff"><img src="https://img.shields.io/npm/l/vuesual-diff.svg?sanitize=true" alt="License"></a>  

A pair of Vue.js components for generating (visual) diffs of DOM trees akin to [MediaWiki's VisualEditor](https://www.mediawiki.org/wiki/VisualEditor/Diffs).  

## Components
There are two components included in this package, one for performing diffs of entire DOM trees  
and one for diffing linear content, i.e. flowing text which may be annotated by links, typographic tags etc.  

### `TreeDiff`
This component takes in two HTML strings which are to be compared as a tree. This means that on a surface level, only a node's tag and
its children are diffed, disregarding content. For nodes not marked as blocks, the component first roughly compares the content
using equality of the raw HTML. Any changes of such "linear" content occurring within the tree are then calculating in detail by the
`LinearDiff` component.

#### Props
| Prop         | Type           | Default value              | Description                                                       |
| ----------- | --------------- | -------------------------- | ----------------------------------------------------------------- |
| `tag`       | `String`        | `div`                      | Tag used for rendering the diff in                                |
| `old`       | `String`        | Required                   | HTML of the old (left-hand side) content                          |
| `new`       | `String`        | Required                   | HTML of the old (left-hand side) content                          |
| `blockTags` | `Array<String>` | `div`, `table`, `ul`, `ol` | HTML tags *not* to be considered linear, i.e. as subtrees instead |

> ⚠️ **Note on `blockTags`** ⚠️
> 
> List items (`li`) are always treated as blocks. They direct linear content is wrapped in `span` tags, while any
> sublists (nested `ul` or `ol` tags) are kept as normal block children.

#### Slots
The diff is calculated asynchronously whenever any of the props change. During the calculation, a placeholder text is displayed.
You may influence this through the following slots:

| Slot                | Default               | Description                                                                                                                                     |
| ------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `placeholder`       | "Calculating diff..." | Placeholder content during the calculation of the diff of the entire tree, without linear diffs                                                 |
| `linearPlaceholder` | `undefined`           | Placeholder content for individual linear nodes while their detailed diff is calculated, defaults to whatever the default of the linear diff is |

### `LinearDiff`
As part of a `TreeDiff` component or as standalone component, this component performs a difference calculation using a modified version of
Google's [diff-match-patch](https://github.com/google/diff-match-patch) algorithm. All stylistic elements such as bolding, italics etc.
as well as any functional markup such as links are maintained and taken into consideration by the diff.

#### Props
| Prop         | Type           | Default value              | Description                              |
| ----------- | --------------- | -------------------------- | ---------------------------------------- |
| `tag`       | `String`        | `p`                        | Tag used for rendering the diff in       |
| `old`       | `String`        | Required                   | HTML of the old (left-hand side) content |
| `new`       | `String`        | Required                   | HTML of the old (left-hand side) content |

#### Slots
The diff is calculated asynchronously whenever any of the props change. During the calculation, a placeholder text is displayed.
You may influence this through the following slot:

| Slot          | Default               | Description                                                     |
| ------------- | --------------------- | --------------------------------------------------------------- |
| `placeholder` | "Calculating diff..." | Placeholder content during the calculation of the detailed diff |

## Styling
By default, no styles are applied to diffs whatsoever. Insertions and deletions of linear content are marked using `ins` and `del` tags respectively.

However, classes are attached to every changed element (including the `ins` and `del` tags) as well as the components themselves.
The following is a list of classes and their purpose.

| Class                       | Description                                                                                                                                                |
| --------------------        | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vuesual-diff`              | Used by both components for their respective root tags. This includes `LinearDiff` nodes nested within `TreeDiff`.                                         |
| `vuesual-diff--tree`        | Exclusively used by the `TreeDiff` component for its root tag.                                                                                             |
| `vuesual-diff--linear`      | Exclusively used by the `LinearDiff` component for its root tag. This includes those nested within `TreeDiff`.                                             |
| `vuesual-diff__sub-diff`    | Used by `TreeDiff` to mark any `LinearDiffs` nested within it.                                                                                             |
| `vuesual-diff--placeholder` | Used by either component while its diff is being calculated. This includes `LinearDiff` nodes nested within `TreeDiff`.                                    |
| `vuesual-diff__inserted`    | Used by both components to mark insertions. For insertions into a tree, only the "highest" node in a subtree not yet present in the old content is marked. |
| `vuesual-diff__deleted`     | Used by both components to mark deletions. For deletions from a tree, only the "highest" node in a subtree previously in the old content is marked.        |

## Example
As an example, consider the following pieces of markups:

**Left**
```html
<p>A <a href="#">world (the target of this link changes)</a> is on a planet. There are different types of planets. There are several types of planets in this solar system:</p>
<ul>
  <li>Terrestrial Planets</li>
  <li>four giant planets</li>
</ul>
<blockquote>Some more details about planets should go here.</blockquote>
<p>These are the planets in this solar system:</p>
```

**Right**
```html
<p>A <a href="https://google.com">world (the target of this link changes)</a> is on a planet. There are different types of planets.
The planets in a <a href="#">solar system</a> go around a star, or a <i>sun</i>. There are some planets in this solar system:</p>
<ul>
  <li>four terrestrial planets</li>
  <li>four giant planets
    <ul>
      <li>two gas giants</li>
      <li>ice giants</li>
    </ul>
  </li>
</ul>
<p>There are other sizes of planets that are not present in our solar system, such as mesoplanets, mini-neptunes, brown dwarfs, super-Earths, super-Jupiters, and sub-Earths.</p>
<p>These are the planets in this solar system:</p>
```

**Textual HTML Diff**
```diff
-<p>A <a href="#">world (the target of this link changes)</a> is on a planet. There are different types of planets. There are several types of planets in this solar system:</p>
+<p>A <a href="https://google.com">world (the target of this link changes)</a> is on a planet. There are different types of planets.
+The planets in a <a href="#">solar system</a> go around a star, or a <i>sun</i>. There are some planets in this solar system:</p>
 <ul>
-  <li>Terrestrial Planets</li>
-  <li>four giant planets</li>
+  <li>four terrestrial planets</li>
+  <li>four giant planets
+    <ul>
+      <li>two gas giants</li>
+      <li>ice giants</li>
+    </ul>
+  </li>
 </ul>
-<blockquote>Some more details about planets should go here.</blockquote>
+<p>There are other sizes of planets that are not present in our solar system, such as mesoplanets, mini-neptunes, brown dwarfs, super-Earths, super-Jupiters, and sub-Earths.</p>
 <p>These are the planets in this solar system:</p>
```

This results in the following diff to be rendered:

![Diff Example](docs/example.png)
