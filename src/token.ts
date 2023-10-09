import { TokenType } from "./TType.ts";

export class Token {
  public readonly type: TokenType;
  public readonly lexme: string;
  public readonly literal: any;
  public readonly line: number;

  constructor(type: TokenType, lexme: string, literal: any, line: number) {
    this.type = type;
    this.lexme = lexme;
    this.literal = literal;
    this.line = line;
  }

  public toString(): string {
    return `${this.type} ${this.lexme} ${this.literal}`;
  }
}
