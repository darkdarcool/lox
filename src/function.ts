import { LoxCallable } from "./callable.ts";
import { Environment } from "./environment.ts";
import { LoxInstance } from "./instance.ts";
import { Interpreter } from "./interpreter.ts";

import * as Stmt from "./stmt.ts";

export class LoxFunction implements LoxCallable {
  private readonly declaration: Stmt.Function;
  private readonly closure: Environment;
  private readonly isInitializer: boolean;
  constructor(
    declaration: Stmt.Function,
    closure: Environment,
    isInitializer: boolean,
  ) {
    this.declaration = declaration;
    this.closure = closure;
    this.isInitializer = isInitializer;
  }

  public call(interpreter: Interpreter, args: any[]) {
    let environment = new Environment(this.closure);
    for (let i = 0; i < this.declaration.params.length; i++) {
      environment.define(this.declaration.params[i].lexme, args[i]);
    }

    try {
      interpreter.executeBlock(this.declaration.body, environment);
    } catch (returnValue: any) {
      if (this.isInitializer) return this.closure.getAt(0, "this");
      return returnValue.value;
    }
    if (this.isInitializer) return this.closure.getAt(0, "this");
    return null;
  }

  public arity() {
    return this.declaration.params.length;
  }

  public bind(instance: LoxInstance) {
    let environment = new Environment(this.closure);
    environment.define("this", instance);
    return new LoxFunction(this.declaration, environment, this.isInitializer);
  }
}
