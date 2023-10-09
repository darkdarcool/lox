import { RuntimeError } from "./interpreter.ts";
import { Token } from "./token.ts";

export class Environment {
  public readonly enclosing: Environment;

  constructor(enclosing: Environment | undefined);
  constructor(enclosing: Environment) {
    if (enclosing) this.enclosing = enclosing;
  }

  public values: {
    [key: string]: any;
  } = {};

  define(name: string, value: any): void {
    this.values[name] = value;
  }

  get(name: Token): any {
    if (name.lexme in this.values) return this.values[name.lexme];
    if (this.enclosing != null) {
      return this.enclosing.get(name);
    }

    throw new RuntimeError(name, `Undefined variable '${name.lexme}'.`);
  }

  assign(name: Token, value: any) {
    if (name.lexme in this.values) {
      this.values[name.lexme] = value;
      return;
    }

    if (this.enclosing != null) {
      this.enclosing.assign(name, value);
      return;
    }

    throw new RuntimeError(name, `Undefined variable '${name.lexme}'.`);
  }

  private ancestor(distance: number): Environment {
    let environment = this as Environment;
    for (let i = 0; i < distance; i++) {
      environment = environment.enclosing;
    }

    return environment;
  }

  public assignAt(distance: number, name: Token, value: any) {
    this.ancestor(distance).values.put(name.lexme, value);
  }

  public getAt(distance: number, name: string) {
    return this.ancestor(distance).values[name];
  }
}
