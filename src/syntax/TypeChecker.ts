import { VisitorTypeName } from "./DiffCheckers";
import acorn from "acorn";
import assert from "assert";
import walk from "acorn-walk";

export type TypeChecker<T> = (input: T) => boolean;

export type LiteralType = boolean | number | string;

export const isLiteral = <T extends LiteralType, U extends T>(
  value: U
): TypeChecker<T> => {
  return (input) => input === value;
};

export const isIdentifier = (name: string): TypeChecker<acorn.Identifier> => {
  return (input) => input.name === name;
};

export const inArray = <T>(typeChecker: TypeChecker<T>): TypeChecker<T[]> => {
  return (input) => input.some((element) => typeChecker(element));
};

export const isNode = (typeName: VisitorTypeName): TypeChecker<acorn.Node> => {
  let result: boolean | null = null;

  return (input) => {
    walk.recursive<void>(
      input,
      undefined,
      {
        [typeName]: (_: any) => {
          result = true;
        },
      },
      new Proxy(
        {},
        {
          get() {
            return (_: any) => {
              result = false;
            };
          },
        }
      )
    );
    assert(result !== null);
    return result;
  };
};

export const union = <T>(...typeCheckers: TypeChecker<T>[]): TypeChecker<T> => {
  return (input) => typeCheckers.some((typeChecker) => typeChecker(input));
};

export const not = <T>(typeChecker: TypeChecker<T>): TypeChecker<T> => {
  return (input) => !typeChecker(input);
};

export const isNull = (): TypeChecker<any> => {
  return (input) => input === null || input === undefined;
};

export const excludingNull = <T>(
  typeChecker: TypeChecker<T>
): TypeChecker<T | null | undefined> => {
  return (input) => {
    if (input !== null && input !== undefined) {
      return typeChecker(input);
    }
    return false;
  };
};
