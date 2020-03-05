const core = require("@actions/core");
const { Octokit } = require("@octokit/action");
const moment = require("moment");

const devEnv = process.env.NODE_ENV === "dev";

if (devEnv) {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  require("dotenv-safe").config();
}

function getConfigs() {
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
  const [age, units] = devEnv
    ? process.env.AGE.split(" ")
    : core.getInput("age", { required: true }).split(" ");
  const maxAge = moment().subtract(age, units);

  console.log(
    "Maximum artifact age:",
    age,
    units,
    "( created before",
    maxAge.format(),
    ")"
  );

  return {
    repoOptions: {
      owner,
      repo,
    },
    maxAge: moment().subtract(age, units),
  };
}

async function run() {
  const configs = getConfigs();
  const octokit = new Octokit();

  const workflowRunsRequest = octokit.actions.listRepoWorkflowRuns.endpoint.merge(
    configs.repoOptions
  );

  for await (const { data: workflowRuns } of octokit.paginate.iterator(
    workflowRunsRequest
  )) {
    for await (const workflowRun of workflowRuns) {
      const artifactsRequest = octokit.actions.listWorkflowRunArtifacts.endpoint.merge(
        Object.assign(configs.repoOptions, { run_id: workflowRun.id })
      );

      for await (const { data: artifacts } of octokit.paginate.iterator(
        artifactsRequest
      )) {
        console.log(artifacts);
        for await (const artifact of artifacts.artifacts) {
          const createdAt = moment(artifact.created_at);

          if (createdAt.isBefore(configs.maxAge)) {
            console.log(
              "Deleting Artifact which was created",
              createdAt.from(configs.maxAge),
              "from maximum age for Workflow Run",
              workflowRun.id,
              ": ",
              artifact
            );

            if (devEnv) {
              console.log(
                `Development environment is recognized, skipping the removal of ${artifact.id}.`
              );

              return;
            }

            await octokit.actions.deleteArtifact({
              ...configs.repoOptions,
              artifact_id: artifact.id,
            });
          }
        }
      }
    }
  }
}

run();
