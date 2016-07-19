import create from '../utils/class/create';
import getPath from '../utils/node/get-path';
import getNode from '../utils/node/get-node';

/**
 */

export class Marker {

  constructor(
    private _startPath:Array<string>, 
    private _endPath:Array<string>, 
    private _nodeFactory:any
  ) {
  }

  createSection(rootNode) {
    return new FragmentSection(
      getNode(rootNode, this._startPath),
      getNode(rootNode, this._endPath),
      this._nodeFactory
    );
  }
}


/**
 * a section is a group of nodes contained within a
 */

export default class FragmentSection {

  private _start:any;
  private _end:any;
  private _nodeFactory:any;
  private _hiddenChildren:Array<any>;

  constructor(start, end, nodeFactory = document) {

    this._start       = start || nodeFactory.createTextNode('');
    this._end         = end   || nodeFactory.createTextNode('');
    this._nodeFactory = nodeFactory;

    if (!this._start.parentNode) {
      this.remove();
    }
  }

  appendChild(child) {
    if (this._hiddenChildren) return this._hiddenChildren.push(child);
    this._end.parentNode.insertBefore(child, this._end);
  }

  get visible() {
    return !this._hiddenChildren;
  }

  get childNodes() {
    if (this._hiddenChildren) return this._hiddenChildren;

    var cnode = this._start.nextSibling;
    var childNodes = [];
    while (cnode && cnode !== this._end) {
      childNodes.push(cnode);
      cnode = cnode.nextSibling;
    }

    return childNodes;
  }

  get targetNode() {
    return this._start.parentNode;
  }

  toString() {
    return this.innerHTML;
  }

  removeChildNodes() {
    for (var child of this.childNodes) {
      child.parentNode.removeChild(child);
    }
  }

  get innerHTML() {
    return this.childNodes.map((childNode) => (
      childNode.outerHTML || childNode.nodeValue
    )).join('');
  }

  get allChildNodes() {
    return [this._start, ...this.childNodes, this._end];
  }

  toFragment() {
    var fragment = this._nodeFactory.createDocumentFragment();

    for (var child of this.allChildNodes) {
      fragment.appendChild(child);
    }

    return fragment;
  }

  /**
   * remove the section completely
   */

  remove() {
    var parent = this._nodeFactory.createDocumentFragment();
    for (var child of this.allChildNodes) {
      parent.appendChild(child);
    }
  }

  /**
   * hides the section, but maintains the section position
   */

  hide() {
    if (this._hiddenChildren) return;
    this._hiddenChildren = this.childNodes;
    for (var child of this._hiddenChildren) {
      child.parentNode.removeChild(child);
    }
  }

  /**
   * shows the section if it's hidden
   */

  show() {
    if (!this._hiddenChildren) return;
    var hiddenChildren = this._hiddenChildren;
    this._hiddenChildren = void 0;
    for (var child of hiddenChildren) {
      this._start.appendChild(child);
    }
  }

  /**
   */

  createMarker() {
    return new Marker(
      getPath(this._start),
      getPath(this._end),
      this._nodeFactory
    );
  }

  /**
   */

  clone() {
    if (this.targetNode.nodeType !== 11) {
      throw new Error('cannot currently clone fragment section that is attached to an element.');
    }

    var clone = this.targetNode.cloneNode(true);
    return new FragmentSection(clone.firstChild, clone.lastChild, this._nodeFactory);
  }

  /**
   */

  static create = create;
}
