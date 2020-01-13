import gql from "graphql-tag";

export const GetProject = gql`
  query GetProject($directory: String!) {
    project(directory: $directory) {
      id
      directory
    }
  }
`;

export const AddProject = gql`
  mutation AddProject($directory: String!) {
    projectsAdd(input: { projects: [{ directory: $directory }] }) {
      projects {
        directory
        id
      }
    }
  }
`;
