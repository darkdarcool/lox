import {
  Assign,
  Binary,
  Expr,
  Grouping,
  Literal,
  Unary,
  Visitor,
} from "./expr.ts";

export class AstPrinter implements Visitor<string> {
  print(expr: Expr): string {
    return expr.accept(this);
  }

  visitBinaryExpr(expr: Binary): string {
    return this.parenthesize(expr.operator.lexme, expr.left, expr.right);
  }

  visitGroupingExpr(expr: Grouping): string {
    return this.parenthesize("group", expr.expression);
  }

  visitLiteralExpr(expr: Literal): string {
    if (expr.value == null) return "nil";
    return expr.value.toString();
  }

  visitUnaryExpr(expr: Unary) {
    return this.parenthesize(expr.operator.lexme, expr.right);
  }

  private parenthesize(name: string, ...exprs: Expr[]): string {
    let str = `(${name}`;

    for (const e in exprs) {
      const expr = exprs[e];
      str += " ";
      str += expr.accept(this);
    }
    str += ")";

    return str;
  }
}
