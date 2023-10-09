import { LoxCallable } from "./callable.ts";
import { LoxFunction } from "./function.ts";
import { LoxInstance } from "./instance.ts";
import { Interpreter } from "./interpreter.ts";

export class LoxClass implements LoxCallable {
  public readonly name: string;
  public methods: {
    [key: string]: LoxFunction;
  };

  constructor(name: string, methods: any) {
    this.name = name;
    this.methods = methods;
  }

  findMethod(name: string): LoxFunction | null {
    if (Object.hasOwn(this.methods, name)) {
      return this.methods[name];
    }

    return null;
  }

  public call(interpreter: Interpreter, args: any[]) {
    let instance = new LoxInstance(this);
    let initializer = this.findMethod("constructor");
    if (initializer != null) {
      initializer.bind(instance).call(interpreter, args);
    }
    return instance;
  }

  public arity() {
    let initializer = this.findMethod("constructor");
    if (initializer == null) return 0;
    return initializer.arity();
  }

  public toString() {
    return this.name;
  }
}
