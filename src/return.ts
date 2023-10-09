import { RuntimeError } from "./interpreter.ts";

export class Return extends Error {
  public readonly value: any;

  constructor(value: any) {
    super("Return error");
    this.value = value;
  }
}
