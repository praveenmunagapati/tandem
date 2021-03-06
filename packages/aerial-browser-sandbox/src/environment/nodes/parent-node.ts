import { 
  weakMemo, 
  Mutation, 
  diffArray, 
  eachArrayValueMutation, 
  createInsertChildMutation,
  createRemoveChildMutation,
  createMoveChildMutation,
  MoveChildMutation,
  InsertChildMutation,
  RemoveChildMutation,
} from "aerial-common2";
import { getSEnvNodeClass, SEnvNodeInterface, diffNodeBase, baseNodeMutators } from "./node";
import { getSEnvHTMLCollectionClasses, SEnvNodeListInterface, SEnvHTMLAllCollectionInterface } from "./collections";
import { getDOMExceptionClasses } from "./exceptions";
import { getL3EventClasses } from "../level3";
import { getSEnvEventClasses } from "../events";
import { SEnvDocumentInterface } from "./document";
import { SEnvNodeTypes } from "../constants";
import { querySelector, querySelectorAll } from "./utils";
import { SyntheticNode, SyntheticParentNode, BasicParentNode, BasicNode } from "../../state";

export interface SEnvParentNodeInterface extends SEnvNodeInterface, ParentNode, Node {
  ownerDocument: SEnvDocumentInterface;
  readonly struct: SyntheticNode;
  insertChildAt<T extends Node>(child: T, index: number);
}

export const getSEnvParentNodeClass = weakMemo((context: any) => {

  const SEnvNode = getSEnvNodeClass(context);
  const { SEnvDOMException } = getDOMExceptionClasses(context);
  const { SEnvHTMLCollection } = getSEnvHTMLCollectionClasses(context);
  const { SEnvMutationEvent } = getL3EventClasses(context);
  const { SEnvMutationEvent: SEnvMutationEvent2 } = getSEnvEventClasses(context);

  return class SEnvParentNode extends SEnvNode implements ParentNode {
    private _children: SEnvHTMLAllCollectionInterface;

    $$preconstruct() {
      super.$$preconstruct();
      this._children = new SEnvHTMLCollection().$init(this);
    }

    get children() {
      return this._children.update();
    }

    appendChild<T extends Node>(child: T) {
      return this.insertChildAt(child, this.childNodes.length);
    }

    insertBefore<T extends Node>(newChild: T, refChild: Node | null): T {

      // if null, then append -- this is to spec. See MSDN docs about this.
      if (refChild == null) {
        return this.appendChild(newChild);
      }

      const index = Array.prototype.indexOf.call(this.childNodes, refChild);

      if (index === -1) {
        throw new SEnvDOMException(`Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.`);
      }

      return this.insertChildAt(newChild, index);
    }

    createStruct(parentNode?: SEnvNodeInterface): SyntheticParentNode {
      return {
        ...(super.createStruct(parentNode) as any),
        childNodes: Array.prototype.map.call(this.childNodes, child => child.struct)
      };
    }

    insertChildAt<T extends Node>(child: T, index: number) {
      if (child.nodeType === SEnvNodeTypes.DOCUMENT_FRAGMENT) {
        while(child.childNodes.length) {
          this.insertChildAt(child.lastChild, index);
        }
        return child;
      }
      this._linkChild(child as any as SEnvNodeInterface);
      this.childNodesArray.splice(index, 0, child as any);
      if (this.connectedToDocument) {
        (child as any as SEnvNodeInterface).$$addedToDocument();
      }

      const event2 = new SEnvMutationEvent2();
      event2.initMutationEvent(createParentNodeInsertChildMutation(this, child, index, false));
      this.dispatchEvent(event2);

      return child;
    }

    removeChild<T extends Node>(child: T) {
      const index = this.childNodesArray.indexOf(child);
      if (index === -1) {
        throw new SEnvDOMException("The node to be removed is not a child of this node.");
      }

      // needs to come after so that 
      this._unlinkChild(child as any as SEnvNodeInterface);
      this.childNodesArray.splice(index, 1);

      const event2 = new SEnvMutationEvent2();
      event2.initMutationEvent(createParentNodeRemoveChildMutation(this, child, index));
      this.dispatchEvent(event2);

      return child;
    }

    querySelector(selectors: string): Element | null {
      return querySelector(this, selectors);
    }

    getElementsByName(elementName: string): NodeListOf<HTMLElement> {
      this._throwUnsupportedMethod();
      return null;
    }

    getElementsByClassName(classNames: string): HTMLCollectionOf<Element> {
      // TODO - need to allow for multiple class names
      return this.querySelectorAll(classNames.split(/\s+/g).map(className => `.${className}`).join(",")) as HTMLCollectionOf<Element>;
    }
    
    getElementsByTagName<K extends keyof ElementListTagNameMap>(tagname: K): ElementListTagNameMap[K];
    getElementsByTagName(tagName: string): NodeListOf<Element> {
      return this.querySelectorAll(tagName);
    }

    getElementsByTagNameNS(namespaceURI: "http://www.w3.org/1999/xhtml", localName: string): HTMLCollectionOf<HTMLElement>;
    getElementsByTagNameNS(namespaceURI: "http://www.w3.org/2000/svg", localName: string): HTMLCollectionOf<SVGElement>;
    getElementsByTagNameNS(namespaceURI: string, localName: string): HTMLCollectionOf<Element> {
      this._throwUnsupportedMethod();
      return null;
    }

    querySelectorAll(selectors: string): NodeListOf<Element> {

      // TODO - not actually an array here
      return querySelectorAll(this, selectors) as any as NodeListOf<Element>;
    }
    
    replaceChild<T extends Node>(newChild: Node, oldChild: T): T {
      const index = this.childNodesArray.indexOf(oldChild);
      if (index === -1) {
        throw new SEnvDOMException("The node to be replaced is not a child of this node.");
      }
      this.childNodesArray.splice(index, 1, newChild);
      return oldChild;
    }

    get firstElementChild() {
      return this.children[0];
    }

    get textContent() {
      return Array.prototype.map.call(this.childNodes, (child) => child.textContent).join("");
    }

    set textContent(value: string) {
      this.removeAllChildren();
      const textNode = this.ownerDocument.createTextNode(value);
      this.appendChild(textNode);
    }

    protected removeAllChildren() {
      while(this.childNodes.length) {
        this.removeChild(this.childNodes[0]);
      }
    }

    get lastElementChild() {
      return this.children[this.children.length - 1];
    }

    get childElementCount() {
      return this.children.length;
    }

    protected _linkChild(child: SEnvNodeInterface) {
      if (child.$$parentNode) {
        child.$$parentNode.removeChild(child);
      }
      child.$$parentNode = this;
      child.$setOwnerDocument(this.nodeType === SEnvNodeTypes.DOCUMENT ? this as any as SEnvDocumentInterface : this.ownerDocument);
    }

    protected _unlinkChild(child: SEnvNodeInterface) {
      child.$$parentNode = null;
      if (child.connectedToDocument) {
        child.$$removedFromDocument();
      }
    }
  }
});

export namespace SEnvParentNodeMutationTypes {
  export const INSERT_CHILD_NODE_EDIT = "INSERT_CHILD_NODE_EDIT";
  export const REMOVE_CHILD_NODE_EDIT = "REMOVE_CHILD_NODE_EDIT";
  export const MOVE_CHILD_NODE_EDIT   = "MOVE_CHILD_NODE_EDIT";
};

export const cloneNode = (node: BasicNode, deep?: boolean) => {
  if (node.constructor === Object) return JSON.parse(JSON.stringify(node));
  return (node as Node).cloneNode(deep);
}

export const createParentNodeInsertChildMutation = (parent: BasicParentNode, child: BasicNode, index: number, cloneChild: boolean = true) => {
  return createInsertChildMutation(SEnvParentNodeMutationTypes.INSERT_CHILD_NODE_EDIT, parent, cloneChild ? cloneNode(child, true) : child, index, cloneChild);
};

export const createParentNodeRemoveChildMutation = (parent: BasicParentNode, child: BasicNode, index?: number) => {
  return createRemoveChildMutation(SEnvParentNodeMutationTypes.REMOVE_CHILD_NODE_EDIT, parent, child, index != null ? index : Array.from(parent.childNodes).indexOf(child));
};

export const createParentNodeMoveChildMutation = (oldNode: BasicParentNode, child: BasicNode, index: number, patchedOldIndex?: number) => {
  return createMoveChildMutation(SEnvParentNodeMutationTypes.MOVE_CHILD_NODE_EDIT, oldNode, child, patchedOldIndex || Array.from(oldNode.childNodes).indexOf(child), index);
};

export const diffParentNode = (oldNode: ParentNode & Node, newNode: ParentNode & Node, diffChildNode: (oldChild: BasicNode, newChild: BasicNode) => Mutation<any>[]) => {

  const mutations = [...diffNodeBase(oldNode as any as SEnvNodeInterface, newNode as any as SEnvNodeInterface)];

  const diff = diffArray(Array.from(oldNode.childNodes), Array.from(newNode.childNodes), (oldNode, newNode) => {
    if (oldNode.nodeName !== newNode.nodeName || oldNode.namespaceURI !== newNode.namespaceURI) return -1;
    return 1;
  });
  
  eachArrayValueMutation(diff, {
    insert({ index, value }) {
      mutations.push(createParentNodeInsertChildMutation(oldNode, value, index));
    },
    delete({ index }) {
      mutations.push(createParentNodeRemoveChildMutation(oldNode, oldNode.childNodes[index]));
    },
    update({ originalOldIndex, patchedOldIndex, newValue, index }) {
      if (patchedOldIndex !== index) {
        mutations.push(createParentNodeMoveChildMutation(oldNode, oldNode.childNodes[originalOldIndex], index, patchedOldIndex));
      }
      const oldValue = oldNode.childNodes[originalOldIndex];
      mutations.push(...diffChildNode(oldValue, newValue));
    }
  });

  return mutations;
};

const insertChildNodeAt = (parent: Node, child: Node, index: number) => {
  if (index >= parent.childNodes.length || parent.childNodes.length === 0) {
    parent.appendChild(child);
  } else {
    const before = parent.childNodes[index];
    parent.insertBefore(child, before);
  }
}

export const parentNodeMutators = {
  ...baseNodeMutators,
  [SEnvParentNodeMutationTypes.REMOVE_CHILD_NODE_EDIT](oldNode: ParentNode & Node, {index, child}: RemoveChildMutation<any, any>) {
    (oldNode as any as Element).removeChild(oldNode.childNodes[index] as any);
  },
  [SEnvParentNodeMutationTypes.MOVE_CHILD_NODE_EDIT](oldNode: ParentNode & Node, {oldIndex, index}: MoveChildMutation<any, any>) {
    insertChildNodeAt(oldNode, oldNode.childNodes[oldIndex] as any, index)
  },
  [SEnvParentNodeMutationTypes.INSERT_CHILD_NODE_EDIT](oldNode: ParentNode & Node, {index, child, clone}: InsertChildMutation<any, any>) {
    insertChildNodeAt(oldNode, clone !== false ? cloneNode(child, true) : child, index);
  }
}