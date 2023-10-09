import { LoxClass } from "./class.ts";
import { RuntimeError } from "./interpreter.ts";
import { Token } from "./token.ts";

export class LoxInstance {
  private klass: LoxClass;
  private fields: {
    [key: string]: any;
  } = {};

  constructor(klass: LoxClass) {
    this.klass = klass;
  }

  get(name: Token) {
    if (Object.hasOwn(this.fields, name.lexme)) {
      return this.fields[name.lexme];
    }

    let method = this.klass.findMethod(name.lexme);
    if (method != null) return method.bind(this);

    throw new RuntimeError(name, "Undefined property '" + name.lexme + "'.");
  }

  set(name: Token, value: any) {
    this.fields[name.lexme] = value;
  }

  public toString() {
    return this.klass.name + " instance";
  }
}
