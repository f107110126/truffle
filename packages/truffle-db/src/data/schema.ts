import { transformSchema, FilterRootFields } from "@gnd/graphql-tools";
import { GraphQLSchema } from "graphql";

import { scopeSchemas } from "./utils";

import { abiSchema, schema as artifactsSchema } from "truffle-db/artifacts";
import { schema as workspaceSchema } from "truffle-db/workspace";
import { loaderSchema } from "truffle-db/loaders";

import { readInstructions } from "./bytecode";

interface Subschemas {
  [subschema: string]: GraphQLSchema;
}

const subschemas: Subschemas = {
  artifacts: artifactsSchema,
  workspace: workspaceSchema
};

try {
  // since @truffle/workflow-compile is an optional dependency,
  // only hook up the loaders schema if we have it
  require("@truffle/workflow-compile/package.json");

  subschemas.loaders = loaderSchema;
} catch (_) {}

export const schema = scopeSchemas({
  subschemas,
  typeDefs: [
    // add types from abi schema
    transformSchema(abiSchema, [new FilterRootFields(() => false)])
  ],
  resolvers: {
    Bytecode: {
      instructions: {
        fragment: "... on Bytecode { bytes sourceMap }",
        resolve: ({ bytes, sourceMap }) => readInstructions(bytes, sourceMap)
      }
    },

    AbiItem: {
      __resolveType(obj) {
        switch (obj.type) {
          case "event":
            return "Event";
          case "constructor":
            return "ConstructorFunction";
          case "fallback":
            return "FallbackFunction";
          case "function":
          default:
            return "NormalFunction";
        }
      }
    },

    NormalFunction: {
      type: {
        resolve(value) {
          return "function";
        }
      }
    }
  }
});
