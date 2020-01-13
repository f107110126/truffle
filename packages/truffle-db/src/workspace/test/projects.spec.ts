import { generateId, Migrations, WorkspaceClient } from "./utils";
import { AddProject, GetProject } from "./projects.graphql";
import { AddNetworks } from "./network.graphql";
import { AddNameRecord } from "./nameRecord.graphql";
import { AddContracts } from "./contract.graphql";

describe("Project", () => {
  let wsClient;
  let expectedId;
  let projectId;
  let addProjectResult;

  beforeAll(async () => {
    wsClient = new WorkspaceClient();

    addProjectResult = await wsClient.execute(AddProject, {
      directory: "test/path"
    });

    projectId = addProjectResult.projectsAdd.projects[0].id;
  });

  test("can be added", async () => {
    expect(addProjectResult).toHaveProperty("projectsAdd");
    expect(addProjectResult.projectsAdd).toHaveProperty("projects");
    const { projects } = addProjectResult.projectsAdd;
    expect(projects).toHaveLength(1);
    const project = projects[0];
    expect(project.directory).toEqual("test/path");
  });

  test("can be queried", async () => {
    const executionResult = await wsClient.execute(GetProject, {
      directory: "test/path"
    });

    expect(executionResult).toHaveProperty("project");
    const { project } = executionResult;
  });
});
