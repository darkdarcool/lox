import { Token } from "./token.ts";

export interface Visitor<R> {
  visitAssignExpr(expr: Assign): R;
  visitBinaryExpr(expr: Binary): R;
  visitCallExpr(expr: Call): R;
  visitGetExpr(expr: Get): R;
  visitGroupingExpr(expr: Grouping): R;
  visitLiteralExpr(expr: Literal): R;
  visitLogicalExpr(expr: Logical): R;
  visitSetExpr(expr: Set): R;
  // visitSuperExpr(expr: Super): R;
  visitThisExpr(expr: This): R;
  // visitUnaryExpr(expr: Unary): R;
  visitVariableExpr(expr: Variable): R;
}

export abstract class Expr {
  abstract accept<R>(visitor: Visitor<R>): R;
}

export class Assign extends Expr {
  readonly name: Token;
  readonly value: Expr;
  constructor(name: Token, value: Expr) {
    super();
    this.name = name;
    this.value = value;
  }

  accept<R>(visitor: Visitor<R>) {
    return visitor.visitAssignExpr(this);
  }
}

export class Binary extends Expr {
  readonly left: Expr;
  readonly operator: Token;
  readonly right: Expr;
  constructor(left: Expr, operator: Token, right: Expr) {
    super();
    this.left = left;
    this.operator = operator;
    this.right = right;
  }
  // @Override
  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitBinaryExpr(this);
  }
}

export class Call extends Expr {
  readonly callee: Expr;
  readonly paren: Token;
  readonly arguments: Array<Expr>;
  constructor(callee: Expr, paren: Token, args: Array<Expr>) {
    super();
    this.callee = callee;
    this.paren = paren;
    this.arguments = args;
  }

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitCallExpr(this);
  }
}

export class Get extends Expr {
  readonly object: Expr;
  readonly name: Token;
  constructor(object: Expr, name: Token) {
    super();
    this.object = object;
    this.name = name;
  }
  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitGetExpr(this);
  }
}

export class Grouping extends Expr {
  readonly expression: Expr;
  constructor(expression: Expr) {
    super();
    this.expression = expression;
  }

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitGroupingExpr(this);
  }
}

export class Literal extends Expr {
  readonly value: any;
  constructor(value: any) {
    super();
    this.value = value;
  }

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitLiteralExpr(this);
  }
}

export class Logical extends Expr {
  readonly left: Expr;
  readonly operator: Token;
  readonly right: Expr;
  constructor(left: Expr, operator: Token, right: Expr) {
    super();
    this.left = left;
    this.operator = operator;
    this.right = right;
  }

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitLogicalExpr(this);
  }
}

export class Set extends Expr {
  readonly object: Expr;
  readonly name: Token;
  readonly value: Expr;
  constructor(object: Expr, name: Token, value: Expr) {
    super();
    this.object = object;
    this.name = name;
    this.value = value;
  }

  accept<R>(visitor: Visitor<R>) {
    return visitor.visitSetExpr(this);
  }
}

export class Super extends Expr {
  readonly keyword: Token;
  readonly method: Token;
  constructor(keyword: Token, method: Token) {
    super();
    this.keyword = keyword;
    this.method = method;
  }

  accept<R>(visitor: Visitor<R>) {
    return visitor.visitSuperExpr(this);
  }
}

export class This extends Expr {
  readonly keyword: Token;
  constructor(keyword: Token) {
    super();
    this.keyword = keyword;
  }

  accept<R>(visitor: Visitor<R>) {
    return visitor.visitThisExpr(this);
  }
}

export class Unary extends Expr {
  readonly operator: Token;
  readonly right: Expr;
  constructor(operator: Token, right: Expr) {
    super();
    this.operator = operator;
    this.right = right;
  }

  accept<R>(visitor: Visitor<R>) {
    return visitor.visitUnaryExpr(this);
  }
}

export class Variable extends Expr {
  readonly name: Token;
  constructor(name: Token) {
    super();
    this.name = name;
  }

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitVariableExpr(this);
  }
}
