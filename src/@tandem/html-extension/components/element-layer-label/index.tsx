// import "./layer-input.scss";
import "./index.scss";

import * as React from "react";

import FocusComponent from "@tandem/editor/components/focus";
import { MetadataKeys } from "@tandem/editor/constants";
import { SelectAction } from "@tandem/editor/actions";
import * as AutosizeInput from "react-input-autosize";
import { FrontEndApplication } from "@tandem/editor/application";
import { LayerLabelComponentFactoryDependency } from "@tandem/editor/dependencies";
import {
  HTMLElementEntity,
  HTMLExpressionLoader,
  HTMLElementExpression,
  HTMLFragmentExpression,
  VisibleHTMLElementEntity,
} from "@tandem/html-extension/lang";

const VOID_ELEMENTS = [];

import {
  SetToolAction
} from "@tandem/editor/actions";

class ElementLayerLabelComponent extends React.Component<{ entity: HTMLElementEntity, app: FrontEndApplication, connectDragSource: Function }, any> {

  private _updateCount: number;

  constructor() {
    super();
    this._updateCount = 0;
    this.state = {};
  }

  editHTML = () => {
    this.props.entity.metadata.set(MetadataKeys.EDIT_LAYER, true);
  }

  setState(state) {
    super.setState(state);
  }

  addChild(event) {
    this.props.entity.metadata.set(MetadataKeys.LAYER_EXPANDED, true);

    // TODO - this needs to be generalized. Specific to
    // HTML right now
    // const child = this.props.app.dependencies.queryOne("entities/element").factory.create({
    //   tagName: "div",
    //   editLayerSource: true
    // });

    // this.props.entity.children.push(
    //   child
    // );

    // this.props.app.notifier.notify(
    //   new SelectAction([child])
    // );

    // event.stopPropagation();
  }

  componentWillMount() {
    // if (this.props.entity.editLayerSource) {
    //   this.editHTML();
    // }
  }

  render() {
    const entity     = this.props.entity;
    const connectDragSource = this.props.connectDragSource;

    const buffer = [
      <span className="meta punctuation definition tag begin" key="lt">&lt;</span>
    ];

    const editTagName = this.props.entity.metadata.get(MetadataKeys.EDIT_LAYER);

    if (editTagName) {
      buffer.push(this.renderHTMLInput());
    } else {
      buffer.push(editTagName ?
        this.renderHTMLInput() :
        <span className="entity name tag" key="tagName">{entity.source.name.toLowerCase()}</span>
      );

      // filter them, and remove the items we do not want to display
      // (for now)
      // TODO - add attribute components here

      entity.attributes.forEach(function (attr) {
        const k = attr.name;
        buffer.push(
          <span className="entity other attribute-name" key={k + 1}>&nbsp;{k}</span>,
          <span className="entity name meta" key={k + 2}>=</span>,
          <span className="string" key={ k + 3}>"{attr.value}"</span>
        );
      });
    }

    const childNodesKey = entity.metadata.get(MetadataKeys.CHILD_LAYER_PROPERTY) || "childNodes";

    buffer.push(
      <span className="meta punctuation definition tag end" key="et">
        { entity[childNodesKey].length === 0 ? " /" : void 0 }
        &gt;
      </span>
    );

    return <div className="m-label m-element-layer-label" onDoubleClick={this.editHTML}>
      { connectDragSource(<span>{buffer}</span>) }
    </div>;
  }

  onInputKeyDown = (event) => {
    if (event.keyCode === 27) {
      this.cancelEditing();
    }
  }

  onInputChange = (event) => {
    this.setState({
      source: event.target.value
    });
  }

  cancelEditing = () => {
    this.setState({ source: undefined });
  }

  doneEditing = async (event?: KeyboardEvent) => {

    const entity = this.props.entity;
    let ast: HTMLFragmentExpression;

    if (!this.state.source) return this.cancelEditing();

    const loader = new HTMLExpressionLoader();

    try {
      ast = await loader.load({ content: `<${this.state.source} />` }) as HTMLFragmentExpression;
    } catch (e) {
      return this.cancelEditing();
    }

    entity.source.childNodes.forEach((child) => {
      ast.childNodes[0].appendChild(child);
    });

    // replace - tag name might have changed -- this cannot be patched
    const parentSource = entity.source.parent;

    parentSource.insertChildAt(ast, parentSource.children.indexOf(entity.source) + 1);
    parentSource.removeChild(entity.source);

    this.cancelEditing();
  }


  onInputFocus = (event) => {
    event.target.select();
  }

  renderHTMLInput() {
    return <FocusComponent key="input"><AutosizeInput
      type="text"
      className="m-layer-label-input"
      onFocus={this.onInputFocus}
      onBlur={this.doneEditing}
      value={this.state.source == null ? this.getHTMLValue() : this.state.source}
      onChange={this.onInputChange}
      onKeyDown={this.onInputKeyDown}
    /></FocusComponent>;
  }

  getHTMLValue() {

    const entity = this.props.entity;
    const buffer = [entity.source.name.toLowerCase()];

    for (const attribute of entity.attributes) {
      const value = attribute.value;
      buffer.push(" ", attribute.name, "=", typeof value === "object" ? String(value) : `"${value}"`);
    }

    return buffer.join("");
  }
}

export default ElementLayerLabelComponent;

export const elementLayerLabelComponentDependency = new LayerLabelComponentFactoryDependency("element", ElementLayerLabelComponent, "childNodes");