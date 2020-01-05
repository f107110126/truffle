import { CompiledContract, Compilation, IdObject, Request } from "../types";

import { AddSources } from "../queries";

interface SourcesAddResponse {
  data: {
    workspace: {
      sourcesAdd: {
        sources: {
          id: string;
        }[];
      };
    };
  };
}

const contractSourceInput = ({
  sourcePath,
  source: contents
}: CompiledContract): DataModel.ISourceInput => ({
  contents,
  sourcePath
});

const compilationSourceInputs = ({
  contracts
}: Compilation): DataModel.ISourceInput[] => contracts.map(contractSourceInput);

// returns list of IDs
export function* generateSourcesLoad(
  compilation: Compilation
): Generator<Request, IdObject[], SourcesAddResponse> {
  // for each compilation, we need to load sources for each of the contracts
  const sources = compilationSourceInputs(compilation);

  const result = yield {
    mutation: AddSources,
    variables: { sources }
  };

  // return only array of objects { id }
  return result.data.workspace.sourcesAdd.sources.map(({ id }) => ({ id }));
}
