const core = require("@actions/core");
const github = require("@actions/github");
const moment = require("moment");

const devEnv = process.env.NODE_ENV === "dev";

if (devEnv) {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  require("dotenv").config();
}

function getToken() {
  if (devEnv) {
    return process.env.PERSONAL_ACCESS_TOKEN;
  }

  return core.getInput("GITHUB_TOKEN", { required: true });
}

function getAge() {
  if (devEnv) {
    return process.env.AGE.split(" ");
  }

  return core.getInput("age", { required: true }).split(" ");
}

async function run() {
  const token = getToken();
  const octokit = new github.GitHub(token);

  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
  console.log("Repo:", owner, "/", repo);

  const [age, units] = getAge();
  const maxAge = moment().subtract(age, units);
  console.log(
    "Maximum artifact age:",
    age,
    units,
    "( created before",
    maxAge.format(),
    ")"
  );

  const repoOptions = { owner, repo };

  const workflowRunsRequest = octokit.actions.listRepoWorkflowRuns.endpoint.merge(
    repoOptions
  );

  for await (const { data: workflowRuns } of octokit.paginate.iterator(
    workflowRunsRequest
  )) {
    for await (const workflowRun of workflowRuns) {
      const artifactsRequest = octokit.actions.listWorkflowRunArtifacts.endpoint.merge(
        Object.assign(repoOptions, { run_id: workflowRun.id })
      );

      for await (const { data: artifacts } of octokit.paginate.iterator(
        artifactsRequest
      )) {
        console.log(artifacts);
        for await (const artifact of artifacts.artifacts) {
          const createdAt = moment(artifact.created_at);

          if (createdAt.isBefore(maxAge)) {
            console.log(
              "Deleting Artifact which was created",
              createdAt.from(maxAge),
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
              owner,
              repo,
              artifact_id: artifact.id,
            });
          }
        }
      }
    }
  }
}

run();
