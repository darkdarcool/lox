import { LoxCallable } from "../callable.ts";
import { LoxClass } from "../class.ts";
import { LoxFunction } from "../function.ts";
import { LoxInstance } from "../instance.ts";
import { Interpreter } from "../interpreter.ts";

export class LoxClassWithoutConstructor extends LoxClass {
  public name: string;
  public argCount: number;
  constructor(name: string, methods: { [key: string]: LoxCallable }) {
    super(name, methods);
    this.name = name;
    this.argCount = 0;
  }

  call(interpreter: Interpreter, args: any[]): LoxInstance {
    let instance = new LoxInstance(this);
    return instance;
  }

  findMethod(name: string): LoxFunction | null {
    if (Object.hasOwn(this.methods, name)) {
      return this.methods[name];
    }

    return null;
  }

  arity() {
    return this.argCount;
  }
}

export class LoxClassWithConstructor extends LoxClass {
  public name: string;
  constructor(name: string, methods: { [key: string]: LoxCallable }) {
    super(name, methods);
    this.name = name;
  }

  call(interpreter: Interpreter, args: any[]): LoxInstance {
    let instance = new LoxInstance(this);
    let initializer = this.findMethod("constructor");
    if (initializer != null) {
      initializer.call(interpreter, args);
    }
    return instance;
  }

  findMethod(name: string): LoxFunction | null { // excuse the fact that it actually returns a LoxCallable. the interpreter doesn't need to know that
    if (Object.hasOwn(this.methods, name)) {
      return this.methods[name];
    }

    return null;
  }

  arity() {
    let initializer = this.findMethod("constructor");
    if (initializer == null) return 0;
    return initializer.arity();
  }
}
