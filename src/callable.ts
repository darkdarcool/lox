import { Interpreter } from "./interpreter.ts";

export interface LoxCallable {
  call(interpreter: Interpreter, args: any[]): any;
  arity(): number;
}
