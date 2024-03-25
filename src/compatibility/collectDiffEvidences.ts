import { DiffCheckersBuilder, combineDiffCheckersArray } from "./DiffCheckers";
import {
  DiffVisitors,
  DiffVisitorsState,
  createDiffVisitors,
} from "./DiffVisitors";
import {
  excludingNull,
  inArray,
  isLiteral,
  isNode,
  isNull,
  not,
  union,
} from "./TypeChecker";

import { DiffEvidence } from "./DiffEvidence";
import { ESVersion } from "./ESVersion";
import acorn from "acorn";
import walk from "acorn-walk";

export const collectDiffEvidences = (
  program: acorn.Program
): DiffEvidence[] => {
  const state: DiffVisitorsState = { evidences: [] };
  walk.simple(program, diffVisitors, undefined, state);
  return state.evidences;
};

const initDiffVisitors = (): DiffVisitors => {
  const diffCheckers = combineDiffCheckersArray([
    new DiffCheckersBuilder(ESVersion.ES2015)
      .intro("for-of")
      .definesNode("ForOfStatement")

      .intro("block-scoping")
      .extendsProp(
        "VariableDeclaration",
        "kind",
        union(isLiteral("let"), isLiteral("const"))
      )

      .intro("object-super")
      .definesNode("Super")
      .extendsProp("CallExpression", "callee", isNode("Super"))
      .extendsProp("MemberExpression", "object", isNode("Super"))

      .intro("spread")
      .definesNode("SpreadElement")
      .extendsProp(
        "ArrayExpression",
        "elements",
        inArray(excludingNull(isNode("SpreadElement")))
      )
      .extendsProp(
        "CallExpression",
        "arguments",
        inArray(isNode("SpreadElement"))
      )
      .extendsProp(
        "NewExpression",
        "arguments",
        inArray(isNode("SpreadElement"))
      )

      .intro("method-properties")
      .extendsProp("Property", "method", isLiteral(true))

      .intro("shorthand-properties")
      .extendsProp("Property", "shorthand", isLiteral(true))

      .intro("computed-properties")
      .extendsProp(
        "Property",
        "key",
        not(union(isNode("Literal"), isNode("Identifier")))
      )
      .extendsProp("Property", "computed", isLiteral(true))

      .intro("arrow-functions")
      .definesNode("ArrowFunctionExpression")

      .intro("generator-functions")
      .definesNode("YieldExpression")
      .extendsProp("Function", "generator", isLiteral(true))

      .intro("template-literals")
      .definesNode("TemplateLiteral")
      .definesNode("TaggedTemplateExpression")
      .definesNode("TemplateElement")

      .intro("destructuring")
      .definesNode("ObjectPattern")
      .definesNode("ArrayPattern")
      .definesNode("RestElement")
      .definesNode("AssignmentPattern")

      .intro("classes")
      .definesNode("Class")
      .definesNode("ClassBody")
      .definesNode("MethodDefinition")
      .definesNode("ClassDeclaration")
      .definesNode("ClassExpression")
      .definesNode("MetaProperty")

      .intro("modules")
      .definesNode("ImportDeclaration")
      .definesNode("ImportSpecifier")
      .definesNode("ImportDefaultSpecifier")
      .definesNode("ImportNamespaceSpecifier")
      .definesNode("ExportNamedDeclaration")
      .definesNode("ExportSpecifier")
      .definesNode("ExportDefaultDeclaration")
      .definesNode("ExportAllDeclaration")
      .extendsProp("Program", "sourceType", isLiteral("module"))
      .extendsProp(
        "Program",
        "body",
        inArray(
          union(
            isNode("ImportDeclaration"),
            isNode("ExportNamedDeclaration"),
            isNode("ExportDefaultDeclaration"),
            isNode("ExportAllDeclaration")
          )
        )
      )

      .build(),

    new DiffCheckersBuilder(ESVersion.ES2016)
      .intro("exponentiation-operator")
      .extendsProp("BinaryExpression", "operator", isLiteral("**"))
      .extendsProp("AssignmentExpression", "operator", isLiteral("**="))

      .build(),

    new DiffCheckersBuilder(ESVersion.ES2017)
      .intro("async-functions")
      .extendsProp("Function", "async", isLiteral(true))
      .definesNode("AwaitExpression")

      .build(),

    new DiffCheckersBuilder(ESVersion.ES2018)
      .intro("for-await-of")
      .extendsProp("ForOfStatement", "await", isLiteral(true))

      .intro("object-spread")
      .extendsProp(
        "ObjectExpression",
        "properties",
        inArray(isNode("SpreadElement"))
      )

      .intro("object-destructuring")
      .extendsProp(
        "ObjectPattern",
        "properties",
        inArray(isNode("RestElement"))
      )

      .build(),

    new DiffCheckersBuilder(ESVersion.ES2019)
      .intro("optional-catch-binding")
      .extendsProp("CatchClause", "param", isNull())

      .build(),

    new DiffCheckersBuilder(ESVersion.ES2020)
      .intro("bigint")
      .extendsProp("Literal", "value", (input) => typeof input === "bigint")
      .extendsProp("Literal", "bigint", not(isNull()))

      .intro("optional-chaining")
      .definesNode("ChainExpression")
      .extendsProp("CallExpression", "optional", isLiteral(true))
      .extendsProp("MemberExpression", "optional", isLiteral(true))

      .intro("nullish-coalescing-operator")
      .extendsProp("LogicalExpression", "operator", isLiteral("??"))

      .intro("dynamic-import")
      .definesNode("ImportExpression")

      .intro("export-namespace-from")
      .extendsProp("ExportAllDeclaration", "exported", not(isNull()))

      .build(),

    new DiffCheckersBuilder(ESVersion.ES2021)
      .intro("logical-assignment-operators")
      .extendsProp(
        "AssignmentExpression",
        "operator",
        union(isLiteral("||="), isLiteral("&&="), isLiteral("??="))
      )

      .build(),

    new DiffCheckersBuilder(ESVersion.ES2022)
      .intro("class-properties")
      .definesNode("PropertyDefinition")
      .extendsProp(
        "ClassBody",
        "body",
        inArray(union(isNode("PropertyDefinition"), isNode("StaticBlock")))
      )

      .intro("private-properties")
      .definesNode("PrivateIdentifier")
      .extendsProp("MethodDefinition", "key", isNode("PrivateIdentifier"))
      .extendsProp("MemberExpression", "property", isNode("PrivateIdentifier"))
      .extendsProp("BinaryExpression", "left", isNode("PrivateIdentifier"))

      .intro("class-static-block")
      .definesNode("StaticBlock")

      .intro("es2022-imports-exports")
      .extendsProp("ImportSpecifier", "imported", isNode("Literal"))
      .extendsProp("ExportSpecifier", "local", isNode("Literal"))
      .extendsProp("ExportSpecifier", "exported", isNode("Literal"))
      .extendsProp("ExportAllDeclaration", "exported", not(isNull()))

      .build(),
  ]);

  return createDiffVisitors(diffCheckers);
};

const diffVisitors = initDiffVisitors();
