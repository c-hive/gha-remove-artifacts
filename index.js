const core = require("@actions/core");
const github = require("@actions/github");
const moment = require("moment");

async function run() {
  const token = core.getInput("GITHUB_TOKEN", { required: true });
  const octokit = new github.GitHub(token);

  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
  console.log("Repo:", owner, "/", repo);

  const [age, units] = core.getInput("age", { required: true }).split(" ");
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
