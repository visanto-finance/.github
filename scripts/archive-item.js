require("dotenv").config();
const { graphql } = require("@octokit/graphql");

const graphqlWithAuth = graphql.defaults({
  headers: { authorization: `token ${process.env.PROJECT_TOKEN}` },
});

async function archiveItem() {
  console.log(`Running archiveItem with PROJECT_TOKEN=${process.env.PROJECT_TOKEN} and PROJECT_ID=${process.env.PROJECT_ID}`);

  const { node } = await graphqlWithAuth(
    `
    query ($projectID: ID!) {
      node(id: $projectID) {
        ... on ProjectV2 {
          items(first: 20) {
            nodes {
              id
              content {
                ... on Issue {
                  number
                  state
                }
              }
            }
          }
        }
      }
    }
    `,
    { projectID: process.env.PROJECT_ID }
  );

  for (const item of node.items.nodes) {
    if (item.content && item.content.state === "CLOSED") {
      await graphqlWithAuth(
        `
          mutation ($projectId: ID!, $itemId: ID!) {
            archiveProjectV2Item(input: {
              projectId: $projectId
              itemId: $itemId
            }) {
              clientMutationId
            }
          }
        `,
        {
          projectId: process.env.PROJECT_ID,
          itemId: item.id,
        }
      );

      console.log(`Archived item #${item.content.number}`);
    }
  }
}

archiveItem().catch(error =>
  console.error(`Error archiving item - ${error}`)
);
