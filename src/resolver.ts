import * as Expr from "./expr.ts";
import { Interpreter } from "./interpreter.ts";
import * as Stmt from "./stmt.ts";
import { Token } from "./token.ts";
import { Lang } from "./lang.ts";

enum FunctionType {
  NONE = "NONE",
  FUNCTION = "FUNCTION",
  METHOD = "METHOD",
  INITIALIZER = "INITIALIZER",
}

enum ClassType {
  NONE,
  CLASS,
}

export class Resolver implements Expr.Visitor<any>, Stmt.Visitor<any> {
  private readonly interpreter: Interpreter;
  private readonly scopes: Array<{
    [key: string]: boolean;
  }> = [];
  private currentFunction = FunctionType.NONE;
  private currentClass = ClassType.NONE;

  constructor(interpreter: Interpreter) {
    this.interpreter = interpreter;
  }

  public visitClassStmt(stmt: Stmt.Class) {
    let enclosingClass = this.currentClass;
    this.currentClass = ClassType.CLASS;
    this.declare(stmt.name);
    this.define(stmt.name);

    this.beginScope();
    this.scopes[this.scopes.length - 1]["this"] = true;

    for (let method of stmt.methods) {
      let declaration = FunctionType.METHOD;
      if (method.name.lexme == "constructor") {
        declaration = FunctionType.INITIALIZER;
      }
      this.resolveFunction(method, declaration);
    }

    this.endScope();
    this.currentClass = enclosingClass;
    return null;
  }

  public visitGetExpr(expr: Expr.Get) {
    this.resolve(expr.object);
    return null;
  }

  public visitSetExpr(expr: Expr.Set) {
    this.resolve(expr.value);
    this.resolve(expr.object);
    return null;
  }

  public visitBlockStmt(stmt: Stmt.Block) {
    this.beginScope();
    this.resolve(stmt.statements);
    this.endScope();
    return null;
  }

  public visitVarStmt(stmt: Stmt.Var) {
    this.declare(stmt.name);
    if (stmt.initializer != null) {
      this.resolve(stmt.initializer);
    }
    this.define(stmt.name);
    return null;
  }

  public visitVariableExpr(expr: Expr.Variable) {
    if (
      this.scopes.length != 0 &&
      this.scopes[this.scopes.length - 1][expr.name.lexme] == false
    ) {
      Lang.error(
        expr.name as any,
        "Can't read local variable in its own initializer.",
      );
    }

    this.resolveLocal(expr, expr.name);
    return null;
  }

  public visitAssignExpr(expr: Expr.Assign) {
    this.resolve(expr.value);
    this.resolveLocal(expr, expr.name);
    return null;
  }

  public visitFunctionStmt(stmt: Stmt.Function) {
    this.declare(stmt.name);
    this.define(stmt.name);

    this.resolveFunction(stmt, FunctionType.FUNCTION);
    return null;
  }

  private resolveFunction(func: Stmt.Function, type: FunctionType) {
    let enclosingFunction = this.currentFunction;
    this.currentFunction = type;
    this.beginScope();
    for (const param of func.params) {
      this.declare(param);
      this.define(param);
    }
    this.resolve(func.body);
    this.endScope();
    this.currentFunction = enclosingFunction;
  }

  public visitExpressionStmt(stmt: Stmt.Expression) {
    this.resolve(stmt.expression);
    return null;
  }

  public visitImportStmt(stmt: Stmt.Import) {
    // this.resolve(stmt.paths);
    return null;
  }

  public visitIfStmt(stmt: Stmt.If) {
    this.resolve(stmt.condition);
    this.resolve(stmt.thenBranch);
    if (stmt.elseBranch != null) this.resolve(stmt.elseBranch);
    return null;
  }

  public visitPrintStmt(stmt: Stmt.Print) {
    this.resolve(stmt.expression);
    return null;
  }

  public visitReturnStmt(stmt: Stmt.Return) {
    if (this.currentFunction == FunctionType.NONE) {
      Lang.error(stmt.keyword as any, "Can't return from top-level code.");
    }
    if (stmt.value != null) {
      if (this.currentFunction == FunctionType.INITIALIZER) {
        Lang.error(
          stmt.keyword as any,
          "Can't return a value from an initializer.",
        );
      }
      this.resolve(stmt.value);
    }

    return null;
  }

  public visitWhileStmt(stmt: Stmt.While) {
    this.resolve(stmt.condition);
    this.resolve(stmt.body);
    return null;
  }

  public visitBinaryExpr(expr: Expr.Binary) {
    this.resolve(expr.left);
    this.resolve(expr.right);
    return null;
  }

  public visitCallExpr(expr: Expr.Call) {
    this.resolve(expr.callee);

    for (let argument of expr.arguments) {
      this.resolve(argument);
    }

    return null;
  }

  public visitGroupingExpr(expr: Expr.Grouping) {
    this.resolve(expr.expression);
    return null;
  }

  public visitLiteralExpr(expr: Expr.Literal) {
    return null;
  }

  public visitLogicalExpr(expr: Expr.Logical) {
    this.resolve(expr.left);
    this.resolve(expr.right);
    return null;
  }

  public visitUnaryExpr(expr: Expr.Unary) {
    this.resolve(expr.right);
    return null;
  }

  private resolveLocal(expr: Expr.Expr, name: Token) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (Object.hasOwn(this.scopes[i], name.lexme)) {
        this.interpreter.resolve(expr, this.scopes.length - 1 - i);
        return;
      }
    }
  }

  private declare(name: Token) {
    if (this.scopes.length == 0) return;

    let scope = this.scopes[this.scopes.length - 1];
    if (Object.hasOwn(scope, name.lexme)) {
      Lang.error(
        name as any,
        "Already a variable with this name in this scope.",
      );
    }

    scope[name.lexme] = false;
  }

  private define(name: Token) {
    if (this.scopes.length == 0) return;
    this.scopes[this.scopes.length - 1][name.lexme] = true;
  }

  public resolve(statements: Stmt.Stmt[] | Stmt.Stmt | Expr.Expr) {
    if (Array.isArray(statements)) {
      for (const statement of statements) {
        this.resolve(statement);
      }
    } else {
      // @ts-ignore so that i can finish in peace
      statements.accept(this);
    }
  }

  public visitThisExpr(expr: Expr.This) {
    if (this.currentClass == ClassType.NONE) {
      Lang.error(expr.keyword as any, "Can't use 'this' outside of a class.");
      return null;
    }
    this.resolveLocal(expr, expr.keyword);
    return null;
  }

  private beginScope() {
    this.scopes.push({});
  }

  private endScope() {
    this.scopes.pop();
  }
}
