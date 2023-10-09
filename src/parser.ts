import { Token } from "./token.ts";
import * as Expr from "./expr.ts";
import { TokenType } from "./TType.ts";
import { Lang } from "./lang.ts";
import * as Stmt from "./stmt.ts";

export class Parser {
  private readonly tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): Expr.Expr | null {
    try {
      return this.expression();
    } catch (_error: any) {
      return null;
    }
  }

  public parseStmts() {
    const statements: Stmt.Stmt[] = [];

    while (!this.isAtEnd()) {
      statements.push(this.declaration()!);
    }

    return statements;
  }

  private declaration() {
    try {
      if (this.match(TokenType.CLASS)) return this.classDeclaration();
      if (this.match(TokenType.FUN)) return this.function("function");
      if (this.match(TokenType.VAR)) return this.varDeclaration();

      return this.statement();
    } catch (e: any) {
      this.synchronize();
      return null;
    }
  }

  private classDeclaration(): Stmt.Stmt {
    let name = this.consume(TokenType.IDENTIFIER, "Expect class name.");
    this.consume(TokenType.LEFT_BRACE, "Expect '{' before class body.");

    let methods: Stmt.Function[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      methods.push(this.function("method"));
    }
    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after class body.");
    return new Stmt.Class(name, methods);
  }

  private function(kind: string): Stmt.Function {
    let name: Token = this.consume(
      TokenType.IDENTIFIER,
      `Expect ${kind} name.`,
    );

    this.consume(TokenType.LEFT_PAREN, "Expect '(' after " + kind + " name.");
    let parameters: Token[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (parameters.length >= 255) {
          this.error(this.peek(), "Can't have more than 255 parameters.");
        }

        parameters.push(
          this.consume(TokenType.IDENTIFIER, "Expect parameter name."),
        );
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.");
    this.consume(TokenType.LEFT_BRACE, "Expect '{' before " + kind + " body.");
    let body: Stmt.Stmt[] = this.block();
    return new Stmt.Function(name, parameters, body);
  }

  private varDeclaration(): Stmt.Stmt {
    let name: Token = this.consume(
      TokenType.IDENTIFIER,
      "Expected variable name",
    );

    let initializer: Expr.Expr | null = null;
    if (this.match(TokenType.EQUAL)) {
      initializer = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration");

    return new Stmt.Var(name, initializer!);
  }

  private statement(): Stmt.Stmt {
    if (this.match(TokenType.FOR)) return this.forStatement();
    if (this.match(TokenType.PRINT)) return this.printStatement();
    if (this.match(TokenType.RETURN)) return this.returnStatement();
    if (this.match(TokenType.WHILE)) return this.whileStatement();
    if (this.match(TokenType.LEFT_BRACE)) return new Stmt.Block(this.block());
    if (this.match(TokenType.IF)) return this.ifStatement();
    if (this.match(TokenType.IMPORT)) return this.importStatement();

    return this.expressionStatement();
  }

  private importStatement(): Stmt.Stmt {
    let initialPath = this.consume(
      TokenType.IDENTIFIER,
      "Expected import module",
    );
    let paths = [initialPath.lexme];
    const maxIters = 10;
    let iters = 0;
    if (this.match(TokenType.DOT)) {
      do {
        iters++;
        paths.push(this.consume(TokenType.IDENTIFIER, "Expected path").lexme);
        if (this.match(TokenType.SEMICOLON)) {
          return new Stmt.Import(paths);
        }
      } while (iters <= maxIters);
    }
    // add error message for iters
    this.consume(TokenType.SEMICOLON, "Expect ';' after import statement");
    return new Stmt.Import(paths);
  }

  private returnStatement(): Stmt.Stmt {
    const keyword = this.previous();
    let value: Expr.Expr | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      value = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after return value.");
    return new Stmt.Return(keyword, value!);
  }

  private forStatement(): Stmt.Stmt {
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'for'");

    let initializer: Stmt.Stmt | null;

    if (this.match(TokenType.SEMICOLON)) {
      initializer = null;
    } else if (this.match(TokenType.VAR)) {
      initializer = this.varDeclaration();
    } else {
      initializer = this.expressionStatement();
    }

    let condition: Expr.Expr | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expected ';' after for loop condition");

    let increment: Expr.Expr | null = null;
    if (!this.check(TokenType.RIGHT_PAREN)) {
      increment = this.expression();
    }
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after for clauses");

    let body = this.statement();

    if (increment != null) {
      body = new Stmt.Block([body, new Stmt.Expression(increment)]);
    }

    if (condition == null) condition = new Expr.Literal(true);
    body = new Stmt.While(condition, body);

    if (initializer != null) {
      body = new Stmt.Block([initializer, body]);
    }

    return body;
  }

  private whileStatement(): Stmt.Stmt {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.");
    let condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after condition.");
    let body = this.statement();

    return new Stmt.While(condition, body);
  }

  private ifStatement(): Stmt.Stmt {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'");
    let condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after 'if' condition");

    let thenBranch = this.statement();
    let elseBranch = null;

    if (this.match(TokenType.ELSE)) {
      elseBranch = this.statement();
    }

    return new Stmt.If(condition, thenBranch, elseBranch!);
  }

  private block(): Stmt.Stmt[] {
    let statements: Stmt.Stmt[] = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      statements.push(this.declaration()!);
    }

    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block");
    return statements;
  }

  private printStatement(): Stmt.Stmt {
    let value = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
    return new Stmt.Print(value);
  }

  private expressionStatement() {
    let expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
    return new Stmt.Expression(expr);
  }

  private expression(): Expr.Expr {
    return this.assignment();
  }

  private assignment(): Expr.Expr {
    let expr = this.or(); // this.assignment
    if (this.match(TokenType.EQUAL)) {
      let equals = this.previous();
      let value = this.assignment();

      if (expr instanceof Expr.Variable) {
        let name: Token = (expr as Expr.Variable).name;
        return new Expr.Assign(name, value);
      } else if (expr instanceof Expr.Get) {
        let get = expr as Expr.Get;
        return new Expr.Set(get.object, get.name, value);
      }

      this.error(equals, "Invalid assignment target.");
    }
    return expr;
  }

  private or(): Expr.Expr {
    let expr = this.and();

    while (this.match(TokenType.OR)) {
      let operator = this.previous();
      let right = this.and();

      expr = new Expr.Logical(expr, operator, right);
    }

    return expr;
  }

  private and(): Expr.Expr {
    let expr = this.equality();

    while (this.match(TokenType.AND)) {
      let operator = this.previous();
      let right = this.equality();
      expr = new Expr.Logical(expr, operator, right);
    }

    return expr;
  }

  private equality(): Expr.Expr {
    let expr: Expr.Expr = this.comparison();

    while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
      let operator: Token = this.previous();
      let right: Expr.Expr = this.comparison();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }

  private comparison(): Expr.Expr {
    let expr = this.term();

    while (
      this.match(
        TokenType.GREATER,
        TokenType.GREATER_EQUAL,
        TokenType.LESS,
        TokenType.LESS_EQUAL,
      )
    ) {
      let operator: Token = this.previous();
      let right: Expr.Expr = this.term();
      expr = new Expr.Binary(expr, operator, right);
    }
    return expr;
  }

  private term(): Expr.Expr {
    let expr: Expr.Expr = this.factor();

    while (this.match(TokenType.MINUS, TokenType.PLUS)) {
      let operator: Token = this.previous();
      let right: Expr.Expr = this.factor();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }

  private factor(): Expr.Expr {
    let expr: Expr.Expr = this.unary();

    while (this.match(TokenType.SLASH, TokenType.STAR)) {
      let operator: Token = this.previous();
      let right: Expr.Expr = this.unary();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }

  private unary(): Expr.Expr {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      let operator: Token = this.previous();
      let right: Expr.Expr = this.unary();
      return new Expr.Unary(operator, right);
    }

    return this.call(); // primary
  }

  private call(): Expr.Expr {
    let expr = this.primary();

    while (true) {
      if (this.match(TokenType.LEFT_PAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.DOT)) {
        let name = this.consume(
          TokenType.IDENTIFIER,
          "Expect property name after '.'.",
        );
        expr = new Expr.Get(expr, name);
      } else {
        break;
      }
    }

    return expr;
  }

  private finishCall(callee: Expr.Expr): Expr.Expr {
    let args: Expr.Expr[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (args.length >= 255) {
          this.error(this.peek(), "Can't have more than 255 arguments.");
        }
        args.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }

    let paren = this.consume(
      TokenType.RIGHT_PAREN,
      "Expect ')' after argumets",
    );

    return new Expr.Call(callee, paren, args);
  }

  private primary(): Expr.Expr {
    if (this.match(TokenType.FALSE)) return new Expr.Literal(false);
    if (this.match(TokenType.TRUE)) return new Expr.Literal(true);
    if (this.match(TokenType.NIL)) return new Expr.Literal(null);

    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      return new Expr.Literal(this.previous().literal);
    }

    if (this.match(TokenType.THIS)) return new Expr.This(this.previous());

    if (this.match(TokenType.IDENTIFIER)) {
      return new Expr.Variable(this.previous());
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      let expr: Expr.Expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
      return new Expr.Grouping(expr);
    }

    throw this.error(this.peek(), "Expect expression.");
  }

  private match(...types: TokenType[]): boolean {
    for (let type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  private consume(type: TokenType, msg: string): Token {
    if (this.check(type)) return this.advance();

    throw this.error(this.peek(), msg);
  }

  private error(token: Token, msg: string) {
    Lang.errorT(token, msg);
    Deno.exit(1);
    return new Error();
  }

  private synchronize() {
    if (this.previous().type == TokenType.SEMICOLON) return;

    switch (this.peek().type) {
      case TokenType.CLASS:
      case TokenType.FUN:
      case TokenType.VAR:
      case TokenType.FOR:
      case TokenType.IF:
      case TokenType.WHILE:
      case TokenType.PRINT:
      case TokenType.RETURN:
        return;
    }

    this.advance();
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type == type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd() {
    return this.peek().type == TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }
}
