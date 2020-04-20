// Copyright (c) 2016 Thalia Chan under the terms of The MIT License (MIT)
// https://github.com/Tchanders/treeDiffer
/* eslint-disable */

/**
 * TreeNode
 *
 * Abstract TreeNode class for Trees to be diffed. It should be extended,
 * then a Tree should be built by passing the root node and the name of
 * the new class into the Tree constructor.
 *
 * @class
 * @constructor
 * @param {Object} node Object representing a node to be wrapped
 */
const TreeNode = function ( node ) {
  /**
   * @property {Object} node Object representing the wrapped node
   */
  this.node = node;

  /**
   * @property {TreeNode[]} children Child nodes
   */
  this.children = [];

  /**
   * @property {number} index Index in node list ordered by deepest-first then document order
   */
  this.index = null;

  /**
   * @property {number} leftmost Leftmost of this node; see treeDiffer.Tree
   */
  this.leftmost = null;
};

/**
 * Add a node to the list of this node's children
 *
 * @param {TreeNode} child
 */
TreeNode.prototype.addChild = function ( child ) {
  this.children.push( child );
  child.parent = this;
};

/**
 * @method
 * Check if another TreeNode is equal to this node. Conditions for equality
 * will depend on the use case.
 *
 * @param {TreeNode} other The other TreeNode
 * @return {boolean} True if equal
 */
TreeNode.prototype.isEqual = null;

/**
 * @method
 *
 * Get the children of the node that this tree node wraps. How to
 * find and filter children will depend on the use case.
 *
 * @return {Object[]} Children of the wrapped node
 */
TreeNode.prototype.getOriginalNodeChildren = null;

export default TreeNode
