// deno-lint-ignore-file ban-types
import * as Expr from "./expr.ts";
import { TokenType } from "./TType.ts";
import { Token } from "./token.ts";
import { Lang } from "./lang.ts";
import * as Stmt from "./stmt.ts";
import { Environment } from "./environment.ts";
import { LoxCallable } from "./callable.ts";
import { getGlobals } from "./std/index.ts";
import { LoxFunction } from "./function.ts";
import { Return } from "./return.ts";

import { TSMap } from "npm:typescript-map";
import { LoxClass } from "./class.ts";
import { LoxInstance } from "./instance.ts";

function isCallable(object: any): object is LoxCallable {
  try {
    return object.prototype["arity"] != undefined;
  } catch (e: any) {
    try {
      return object.arity != undefined;
    } catch (e) {
      return false;
    }
  }
}

export class RuntimeError extends Error {
  public readonly token: Token;

  constructor(token: Token, msg: string) {
    super(msg);
    this.token = token;
  }
}

export class Interpreter implements Expr.Visitor<any>, Stmt.Visitor<any> {
  public globals = new Environment(undefined);
  private environment = this.globals;
  private locals = new TSMap<Expr.Expr, number>();

  constructor() {
    /*
    for (let global of getGlobals()) {
      this.globals.define(global.name, new global.fn());
    }
    */
  }

  public interpret(expression: Expr.Expr) {
    try {
      let value = this.evaluate(expression);
      // console.log(this.stringify(value));
    } catch (e: any) {
      Lang.runtimeError(e);
    }
  }

  public visitImportStmt(stmt: Stmt.Import) {
    if (stmt.paths[0] == "std") { // standard lib
      let trimmed = stmt.paths;
      trimmed.splice(0, 1);
      for (let global of getGlobals(trimmed)) { // 0 1
        if (global.type == "func") {
          this.globals.define(global.name, new global.fn()); // add support for classes
        } else if (global.type == "classWithoutConstructor") {
          this.globals.define(global.name, new global.klass().call(this, []));
        }
      }
    }
  }

  public visitGetExpr(expr: Expr.Get) {
    let object = this.evaluate(expr.object);
    if (object instanceof LoxInstance) {
      return (object as LoxInstance).get(expr.name);
    }

    throw new RuntimeError(expr.name, "Only instances have properties.");
  }

  public visitSetExpr(expr: Expr.Set) {
    let object = this.evaluate(expr.object);

    if (!(object instanceof LoxInstance)) {
      throw new RuntimeError(expr.name, "Only instances have fields.");
    }

    let value = this.evaluate(expr.value);
    (object as LoxInstance).set(expr.name, value);
    return value;
  }

  public visitThisExpr(expr: Expr.This) {
    return this.lookUpVariable(expr.keyword, expr);
  }

  public visitClassStmt(stmt: Stmt.Class) {
    this.environment.define(stmt.name.lexme, null);
    let methods: {
      [key: string]: LoxFunction;
    } = {};
    for (let method of stmt.methods) {
      let func = new LoxFunction(
        method,
        this.environment,
        method.name.lexme == "init",
      );
      methods[method.name.lexme] = func;
    }

    let klass = new LoxClass(stmt.name.lexme, methods);
    this.environment.assign(stmt.name, klass);
    return null;
  }

  public resolve(expr: Expr.Expr, depth: number): void {
    this.locals.set(expr, depth);
  }

  public visitReturnStmt(stmt: Stmt.Return) {
    let value = null;
    if (stmt.value != null) value = this.evaluate(stmt.value);

    throw new Return(value)!;
    return this;
  }

  public visitAssignExpr(expr: Expr.Assign) {
    let value = this.evaluate(expr.value);

    let distance = this.locals.get(expr);
    if (distance != null) {
      this.environment.assignAt(distance, expr.name, value);
    } else {
      this.globals.assign(expr.name, value);
    }
    return value;
  }

  public visitBlockStmt(stmt: Stmt.Block) {
    this.executeBlock(stmt.statements, new Environment(this.environment));
    return null;
  }

  public visitFunctionStmt(stmt: Stmt.Function) {
    let func = new LoxFunction(stmt, this.environment, false);

    this.environment.define(stmt.name.lexme, func);

    return func;
  }

  public visitWhileStmt(stmt: Stmt.While) {
    while (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.body);
    }
    return null;
  }

  public visitIfStmt(stmt: Stmt.If) {
    if (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.thenBranch);
    } else if (stmt.elseBranch != null) {
      this.execute(stmt.elseBranch);
    }
    return null;
  }

  public visitLogicalExpr(expr: Expr.Logical) {
    let left = this.evaluate(expr.left);

    if (expr.operator.type == TokenType.OR) {
      if (this.isTruthy(left)) return left;
    } else {
      if (!this.isTruthy(left)) return left;
    }

    return this.evaluate(expr.right);
  }

  public executeBlock(statements: Stmt.Stmt[], environment: Environment) {
    let previous = this.environment;

    try {
      this.environment = environment;
      for (let statement of statements) {
        // console.log(statement);
        this.execute(statement);
      }
    } finally {
      this.environment = previous;
    }
  }

  public visitVarStmt(stmt: Stmt.Var) {
    let value = null;
    if (stmt.initializer != null) {
      value = this.evaluate(stmt.initializer);
    }

    this.environment.define(stmt.name.lexme, value);
    return null;
  }

  public visitVariableExpr(expr: Expr.Variable) {
    // return this.environment.get(expr.name);
    return this.lookUpVariable(expr.name, expr);
  }

  private lookUpVariable(name: Token, expr: Expr.Expr) {
    let distance = this.locals.get(expr);
    if (distance != null) {
      return this.environment.getAt(distance, name.lexme);
    } else {
      return this.globals.get(name);
    }
  }

  public interpretStmts(statements: Stmt.Stmt[]) {
    try {
      for (let statement of statements) {
        this.execute(statement);
      }
    } catch (e: any) {
      Lang.runtimeError(e);
    }
  }

  private execute(stmt: Stmt.Stmt) {
    stmt.accept(this);
  }

  public visitExpressionStmt(stmt: Stmt.Expression) {
    this.evaluate(stmt.expression);
    return null;
  }

  public visitPrintStmt(stmt: Stmt.Print) {
    let value = this.evaluate(stmt.expression);

    console.log(this.stringify(value));
    return null;
  }

  private stringify(obj: any): string {
    if (obj == null) return "nil";

    if (typeof obj === "number") {
      let text = obj.toString();
      if (text.endsWith(".0")) {
        text = text.substring(0, text.length - 2);
      }

      return text;
    }

    return obj.toString();
  }

  public visitLiteralExpr(expr: Expr.Literal) {
    return expr.value;
  }

  public visitGroupingExpr(expr: Expr.Grouping) {
    return this.evaluate(expr.expression);
  }

  public visitUnaryExpr(expr: Expr.Unary) {
    let right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.BANG: {
        return !this.isTruthy(right);
      }
      case TokenType.MINUS: {
        return -right as number;
      }
    }

    return null;
  }

  public visitBinaryExpr(expr: Expr.Binary) {
    let left = this.evaluate(expr.left);
    let right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.GREATER: {
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) > (right as number);
      }
      case TokenType.GREATER_EQUAL: {
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) >= (right as number);
      }
      case TokenType.LESS: {
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) < (right as number);
      }
      case TokenType.LESS_EQUAL: {
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) <= (right as number);
      }
      case TokenType.MINUS: {
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) - (right as number);
      }
      case TokenType.SLASH: {
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) / (right as number);
      }
      case TokenType.STAR: {
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) * (right as number);
      }
      case TokenType.PLUS: {
        if (typeof left === "number" && typeof right === "number") {
          return (left as number) + (right as number);
        }

        if (typeof left === "string" && typeof right === "string") {
          return (left as string) + (right as string);
        }

        throw new RuntimeError(
          expr.operator,
          "Operands must be two numbers or two strings.",
        );
      }

      case TokenType.BANG_EQUAL:
        return !this.isEqual(left, right);
      case TokenType.EQUAL_EQUAL:
        return this.isEqual(left, right);
    }

    // unreachable
    return null;
  }

  private checkNumberOperand(operator: Token, operand: any) {
    if (typeof operand === "number") return;
    throw new RuntimeError(operator, "Operand must be number");
  }

  private checkNumberOperands(operator: Token, left: any, right: any) {
    if (typeof left == "number" && typeof right == "number") return;
    throw new RuntimeError(operator, "Operands must both be numbers.");
  }

  private isEqual(a: any, b: any) {
    if (a == null && b == null) return true;
    if (a == null) return false;
    return a === b; // == ?
  }

  private isTruthy(obj: object): boolean {
    if (obj == null) return false;
    if (typeof obj === "boolean") return obj as boolean;
    return true;
  }

  private evaluate(expr: Expr.Expr): Object {
    return expr.accept(this);
  }

  public visitCallExpr(expr: Expr.Call): any {
    let callee = this.evaluate(expr.callee);

    let args = [];

    for (let argument of expr.arguments) {
      args.push(this.evaluate(argument));
    }
    if (!(isCallable(callee))) {
      if (!(isCallable(new (callee as any)()))) {
        throw new RuntimeError(
          expr.paren,
          "Can only call functions and classes.",
        );
      } else {
        if (!isCallable(callee)) callee = new callee(); // it's still in class form
      }
    }

    let func = callee as unknown as LoxCallable;
    if (args.length != func.arity()) {
      throw new RuntimeError(
        expr.paren,
        "Expected " +
          func.arity() + " arguments but got " +
          args.length + ".",
      );
    }
    return func.call(this, args);
  }
}
