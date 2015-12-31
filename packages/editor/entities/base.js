import uuid from 'uuid';
import Node from 'common/node';
import assert from 'assert';
import { clone } from 'common/utils/object';
import BaseObject from 'common/object/base';

/**
 * deserializes a JSON object into an Entity
 * @param {Object} data the serialized Entity data
 * @param {Object} rootProps the root entity props such as the global notifier
 * @param {Array} fragments the Array of fragments which contains the Entity factories
 * @returns {*}
 */

export function deserialize(data, rootProps, fragments) {

  var entityFragment = fragments.queryOne({
    id: data.props.fragmentId
  });

  return entityFragment.factory.create({ ...data.props, ...rootProps }, data.children.map(function(childData) {
    return deserialize(childData, {}, fragments);
  }));
}

/**
 * Representation of some thing - built to be mutated by the editor. Compilable to JavaScript
 */

class Entity extends Node {

  /**
   *
   * @param {Object} properties the initial properties to assign to the entity
   * @param {Array} children the entity children
   */

  constructor(properties, children) {

    assert(properties.fragmentId, 'Fragment id must exist');

    // entities are represented by other things, and so an ID is necessary
    // for quickly finding related objects
    super({
      fragmentId: properties.fragmentId,
      id: properties.id || uuid.v1(),
      ...properties
    }, children);
  }

  /**
   * serializes the entity into a POJO
   * @returns {{children: *, props: {}}}
   */

  serialize() {

    var data = {
      children: this.children.map(function(child) {
        return child.serialize();
      }),
      props: {}
    };

    // might break, but simple enough. Should work
    // for most cases.
    for (var key in this) {
      var value = this[key];
      if (key === 'parent' || key === 'notifier' || typeof value === 'function' || key.charAt(0) === '_') continue;
      data.props[key] = clone(value);
    }

    return data;
  }
}

export default Entity;
