import { Parser } from "./parser.ts";
import { AstPrinter } from "./printer.ts";
import { Scanner } from "./scanner.ts";
import { Token } from "./token.ts";
import { TokenType } from "./TType.ts";
import { Interpreter, RuntimeError } from "./interpreter.ts";
import { Resolver } from "./resolver.ts";
export class Lang {
  static hadError = false;
  static hadRuntimeError = false;
  private static readonly interpreter = new Interpreter();
  public runFile(path: string) {
    const code = Deno.readTextFileSync(path);
    this.run(code);

    if (Lang.hadError) Deno.exit(65);
    if (Lang.hadRuntimeError) Deno.exit(70);
  }

  public runPrompt() {
    for (;;) {
      let input = window.prompt(">");
      if (input == "") break;
      this.run(input!);
      Lang.hadError = false;
    }
  }

  run(source: string) {
    const scanner = new Scanner(source);
    const tokens = scanner.scanTokens();

    const parser = new Parser(tokens);
    // let expression = parser.parse();
    let statements = parser.parseStmts();

    if (Lang.hadError) return;

    let resolver = new Resolver(Lang.interpreter);
    resolver.resolve(statements);

    if (Lang.hadError) return;

    // console.log(new AstPrinter().print(expression!));
    Lang.interpreter.interpretStmts(statements!);
  }

  static error(line: number, msg: string) {
    this.report(line, "", msg);
  }

  static errorT(token: Token, msg: string) {
    if (token.type == TokenType.EOF) {
      this.report(token.line, " at end", msg);
    } else {
      this.report(token.line, ` at '${token.lexme}'`, msg);
    }
  }

  static report(line: number, where: string, msg: string) {
    console.error(`[line ${line}] Error${where}: ${msg}`);
    this.hadError = false;
  }

  static runtimeError(error: RuntimeError) {
    console.log(error);
    console.error(`${error.message}\n[line ${error.token.line}]`);
    this.hadRuntimeError = true;
  }
}
