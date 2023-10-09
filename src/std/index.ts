import { LoxCallable } from "../callable.ts";
import { LoxClass } from "../class.ts";
import { LoxInstance } from "../instance.ts";
import { Interpreter } from "../interpreter.ts";
import { LoxClassWithoutConstructor } from "./utils.ts";

export function getGlobals(
  path: string[],
): Array<
  {
    name: string;
    type: "func" | "classWithoutConstructor" | "classWithConstructor";
    fn?: LoxCallable | any;
    klass?: LoxInstance | any;
  }
> {
  return [
    {
      name: "person",
      type: "classWithoutConstructor",
      klass: class extends LoxClassWithoutConstructor {
        constructor() {
          super("Person", {
            hello: class implements LoxCallable {
              public arity() {
                return 0;
              }

              call(interpreter: Interpreter, args: any[]) {
                console.log("Hello from person!");
              }
            },
          });
        }
      },
    },
    {
      name: "log",
      type: "func",
      fn: class implements LoxCallable {
        public arity() {
          return 1;
        }

        call(interpreter: Interpreter, args: any[]) {
          console.log(args[0]);
        }
      },
    },
  ];
}
