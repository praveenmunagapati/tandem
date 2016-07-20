import Entity from 'saffron-common/src/entities/entity';
import { ClassFactoryFragment } from 'saffron-common/src/fragments/index';

export default class StringEntity extends Entity {
  public value:any;
  public expression:any;
  
  async load() {
    this.value = this.expression.value;
  }
}

export const fragment = new ClassFactoryFragment('entities/string', StringEntity);