import { keywords, TokenType } from "./TType.ts";
import { Lang } from "./lang.ts";
import { Token } from "./token.ts";

export class Scanner {
  private readonly source: string;
  private readonly tokens: Token[];

  private start = 0;
  private current = 0;
  private line = 1;

  constructor(source: string) {
    this.source = source;
    this.tokens = [];
  }

  public scanTokens(): Token[] {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.scanToken();
    }
    this.tokens.push(new Token(TokenType.EOF, "", null, this.line));
    return this.tokens;
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private scanToken(): void {
    let c = this.advance();

    switch (c) {
      case "(": {
        this.addToken(TokenType.LEFT_PAREN);
        break;
      }
      case ")": {
        this.addToken(TokenType.RIGHT_PAREN);
        break;
      }
      case "{": {
        this.addToken(TokenType.LEFT_BRACE);
        break;
      }
      case "}": {
        this.addToken(TokenType.RIGHT_BRACE);
        break;
      }
      case ",": {
        this.addToken(TokenType.COMMA);
        break;
      }
      case ".": {
        this.addToken(TokenType.DOT);
        break;
      }
      case "-": {
        this.addToken(TokenType.MINUS);
        break;
      }
      case "+": {
        this.addToken(TokenType.PLUS);
        break;
      }
      case ";": {
        this.addToken(TokenType.SEMICOLON);
        break;
      }
      case "*": {
        this.addToken(TokenType.STAR);
        break;
      }
      case "!": {
        this.addToken(this.match("=") ? TokenType.BANG_EQUAL : TokenType.BANG);
        break;
      }
      case "=": {
        this.addToken(
          this.match("=") ? TokenType.EQUAL_EQUAL : TokenType.EQUAL,
        );
        break;
      }
      case "<": {
        this.addToken(this.match("=") ? TokenType.LESS_EQUAL : TokenType.LESS);
        break;
      }
      case ">": {
        this.addToken(
          this.match("=") ? TokenType.GREATER_EQUAL : TokenType.GREATER,
        );
        break;
      }
      case "/": {
        if (this.match("/")) {
          // A comment goes until the end of the line.
          while (this.peek() != "\n" && !this.isAtEnd()) this.advance();
        } else {
          this.addToken(TokenType.SLASH);
        }
        break;
      }
      case " ":
      case "\r":
      case "\t":
        // Ignore whitespace.
        break;
      case "\n": {
        this.line++;
        break;
      }
      case '"': {
        this.string();
        break;
      }
      default: {
        if (this.isDigit(c)) {
          this.number();
        } else if (this.isAlpha(c)) {
          this.identifier();
        } else {
          // console.log("bad char is " + c)
          Lang.error(this.line, "Unexpected character");
        }
      }
    }
  }

  private isDigit(c: string) {
    return c >= "0" && c <= "9";
  }

  private identifier() {
    while (this.isAlphaNumeric(this.peek())) this.advance();

    const text = this.source.substring(this.start, this.current);
    // @ts-ignore: ts sucks
    let type = keywords[text];
    if (text == "constructor") { // js sucks
      type = TokenType.IDENTIFIER;
    }
    if (type == undefined) type = TokenType.IDENTIFIER;
    this.addToken(type);

    // this.addToken(TokenType.IDENTIFIER);
  }

  private isAlpha(c: string): boolean {
    return (c >= "a" && c <= "z") ||
      (c >= "A" && c <= "Z") ||
      c == "_";
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }

  private number() {
    while (this.isDigit(this.peek())) this.advance();

    // Look for a fractional part.
    if (this.peek() == "." && this.isDigit(this.peekNext())) {
      // Consume the "."
      this.advance();

      while (this.isDigit(this.peek())) this.advance();
    }
    this.addToken(
      TokenType.NUMBER, // @ts-ignore ts sucks so much
      parseFloat(this.source.substring(this.start, this.current)),
    );
  }

  private peekNext(): string {
    if (this.current + 1 >= this.source.length) return "\0";
    return this.source.charAt(this.current + 1);
  }

  private string() {
    while (this.peek() != '"' && !this.isAtEnd()) {
      if (this.peek() == "\n") this.line++;
      this.advance();
    }
    if (this.isAtEnd()) {
      Lang.error(this.line, "Unterminated string.");
      return;
    }
    this.advance();

    let value = this.source.substring(this.start + 1, this.current - 1);
    // @ts-ignore wow ts
    this.addToken(TokenType.STRING, value);
  }

  private peek(): string {
    if (this.isAtEnd()) return "\0";
    return this.source[this.current];
  }

  private advance() {
    return this.source[this.current++]; // increment by one, but return source as the previous value of current
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source.charAt(this.current) != expected) return false;

    this.current++;
    return true;
  }

  private addToken(type: TokenType): void;
  private addToken(type: TokenType, literal?: any): void {
    const text = this.source.substring(this.start, this.current);
    this.tokens.push(new Token(type, text, literal, this.line));
  }
}
