import {
  Compilation,
  Compilations,
  IdObject,
  Request,
  Response
} from "../types";

import { generateSourcesLoad } from "../sources";

import { AddCompilation } from "../queries";

const compilationSourceContractInputs = (
  { contracts }: Compilation,
  sourceIds: IdObject[]
): DataModel.ICompilationSourceContractInput[] =>
  contracts.map(({ contractName: name, ast }, index) => ({
    name,
    source: sourceIds[index],
    ast: ast ? { json: JSON.stringify(ast) } : undefined
  }));

const compilationCompilerInput = ({
  contracts
}: Compilation): DataModel.ICompilerInput => ({
  name: contracts[0].compiler.name,
  version: contracts[0].compiler.version
});

const compilationInput = (
  compilation: Compilation,
  sources: IdObject[],
  contracts: DataModel.ICompilationSourceContractInput[]
): DataModel.ICompilationInput => {
  const compiler = compilationCompilerInput(compilation);

  if (compiler.name === "solc") {
    return {
      compiler,
      contracts,
      sources,
      sourceMaps: compilation.contracts.map(({ sourceMap: json }) => ({ json }))
    };
  } else {
    return {
      compiler,
      contracts,
      sources
    };
  }
};

interface CompilationsAddResponse {
  data: {
    workspace: {
      compilationsAdd: DataModel.ICompilationsAddPayload;
    };
  };
}

interface LoadedCompilation {
  id: string;
  compiler: DataModel.ICompiler;
}

export function* generateCompilationsLoad(
  compilations: Compilations
): Generator<Request, LoadedCompilation[], Response> {
  const compilationsWithContracts = Object.values(compilations).filter(
    ({ contracts }) => contracts.length > 0
  );

  let compilationsInput = [];
  for (let compilation of compilationsWithContracts) {
    const sourceIds = yield* generateSourcesLoad(compilation);
    const sourceContractInputs = compilationSourceContractInputs(
      compilation,
      sourceIds
    );

    compilationsInput.push(
      compilationInput(compilation, sourceIds, sourceContractInputs)
    );
  }

  const result: CompilationsAddResponse = yield {
    mutation: AddCompilation,
    variables: { compilations: compilationsInput }
  };

  // return only array of objects { id }
  return result.data.workspace.compilationsAdd.compilations.map(
    ({ id, compiler }) => ({ id, compiler })
  );
}
