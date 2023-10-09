// deno-lint-ignore-file no-explicit-any
import * as Expr from "./expr.ts";
import { Token } from "./token.ts";

// Expression, Print
export interface Visitor<R> {
  visitBlockStmt(stmt: Block): R;
  visitExpressionStmt(stmt: Expression): R;
  visitPrintStmt(stmt: Print): R;
  visitVarStmt(stmt: Var): R;
  visitIfStmt(stmt: If): R;
  visitWhileStmt(stmt: While): R;
  visitFunctionStmt(stmt: Function): R;
  visitReturnStmt(stmt: Return): R;
  visitClassStmt(stmt: Class): R;
  visitImportStmt(stmt: Import): R;
}

export abstract class Stmt {
  abstract accept<R>(visitor: Visitor<R>): R;
}

export class Print extends Stmt {
  public readonly expression: Expr.Expr;
  constructor(expression: Expr.Expr) {
    super();
    this.expression = expression;
  }

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitPrintStmt(this);
  }
}

export class Expression extends Stmt {
  public readonly expression: Expr.Expr;
  constructor(expression: Expr.Expr) {
    super();
    this.expression = expression;
  }

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitExpressionStmt(this);
  }
}

export class Var extends Stmt {
  public readonly name: Token;
  public readonly initializer: Expr.Expr;

  constructor(name: Token, initializer: Expr.Expr) {
    super();
    this.name = name;
    this.initializer = initializer;
  }

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitVarStmt(this);
  }
}

export class Block extends Stmt {
  public readonly statements: Stmt[];

  constructor(statements: Stmt[]) {
    super();
    this.statements = statements;
  }

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitBlockStmt(this);
  }
}

export class If extends Stmt {
  public condition: Expr.Expr;
  public thenBranch: Stmt;
  public elseBranch: Stmt;

  constructor(condition: Expr.Expr, thenBranch: Stmt, elseBranch: Stmt) {
    super();
    this.condition = condition;
    this.thenBranch = thenBranch;
    this.elseBranch = elseBranch;
  }

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitIfStmt(this);
  }
}

export class While extends Stmt {
  public readonly condition: Expr.Expr;
  public readonly body: Stmt;

  constructor(condition: Expr.Expr, body: Stmt) {
    super();
    this.condition = condition;
    this.body = body;
  }

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitWhileStmt(this);
  }
}

export class Function extends Stmt {
  public readonly name: Token;
  public readonly params: Token[];
  public readonly body: Stmt[];
  constructor(name: Token, params: Token[], body: Stmt[]) {
    super();

    this.name = name;
    this.params = params;
    this.body = body;
  }

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitFunctionStmt(this);
  }
}

export class Return extends Stmt {
  public readonly keyword: Token;
  public readonly value: Expr.Expr;

  constructor(keyword: Token, value: Expr.Expr) {
    super();

    this.keyword = keyword;
    this.value = value;
  }

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitReturnStmt(this);
  }
}

export class Class extends Stmt {
  public readonly name: Token;
  public readonly methods: Function[];
  constructor(name: Token, methods: Function[]) {
    super();
    this.name = name;
    this.methods = methods;
  }

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitClassStmt(this);
  }
}

export class Import extends Stmt {
  public readonly paths: string[];

  constructor(paths: string[]) {
    super();
    this.paths = paths;
  }

  accept<R>(visitor: Visitor<R>) {
    return visitor.visitImportStmt(this);
  }
}
