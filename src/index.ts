import * as Expr from "./expr.ts";
import { Lang } from "./lang.ts";
import { AstPrinter } from "./printer.ts";
import { Token } from "./token.ts";
import { TokenType } from "./TType.ts";

/*
const code = `import std.io;

println("Hello world");`;

console.log(code);
*/

const lang = new Lang();

function main() {
  const args = Deno.args;

  if (args.length > 1) {
    console.log("Usage: jlox [script]");
    Deno.exit(64);
  } else if (args.length == 1) {
    lang.runFile(args[0]);
  } else {
    lang.runPrompt();
  }

  /*
  let expression: Expr.Expr = new Expr.Binary(
    new Expr.Unary(
      new Token(TokenType.MINUS, "-", null, 1),
      new Expr.Literal(123)),
    new Token(TokenType.STAR, "*", null, 1),
    new Expr.Grouping(
      new Expr.Literal(45.67)
    )
  );

  console.log(new AstPrinter().print(expression));
  */
}

if (import.meta.main) {
  main();
}
