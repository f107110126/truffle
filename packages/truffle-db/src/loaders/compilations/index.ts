import { Compilation, IdObject, Request } from "../types";

import { AddCompilation } from "../queries";

const compilationCompilerInput = ({
  contracts
}: Compilation): DataModel.ICompilerInput => ({
  name: contracts[0].compiler.name,
  version: contracts[0].compiler.version
});

const compilationSourceContractInputs = (
  { contracts }: Compilation,
  sourceIds: IdObject[]
): DataModel.ICompilationSourceContractInput[] =>
  contracts.map(({ contractName: name, ast }, index) => ({
    name,
    source: sourceIds[index],
    ast: ast ? { json: JSON.stringify(ast) } : undefined
  }));

const compilationInput = (
  compilation: Compilation,
  sources: IdObject[]
): DataModel.ICompilationInput => {
  const compiler = compilationCompilerInput(compilation);
  const contracts = compilationSourceContractInputs(compilation, sources);

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

interface LoadableCompilation {
  compilation: Compilation;
  sources: IdObject[];
}

interface LoadedCompilation {
  id: string;
  compiler: DataModel.ICompiler;
}

interface CompilationsAddResponse {
  data: {
    workspace: {
      compilationsAdd: DataModel.ICompilationsAddPayload;
    };
  };
}

export function* generateCompilationsLoad(
  loadableCompilations: LoadableCompilation[]
): Generator<Request, LoadedCompilation[], CompilationsAddResponse> {
  const compilations = loadableCompilations.map(({ compilation, sources }) =>
    compilationInput(compilation, sources)
  );

  const result = yield {
    mutation: AddCompilation,
    variables: { compilations }
  };

  // return only array of objects { id }
  return result.data.workspace.compilationsAdd.compilations.map(
    ({ id, compiler }) => ({ id, compiler })
  );
}
