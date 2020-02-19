const core = require("@actions/core");
const github = require("@actions/github");
const moment = require("moment");

function run() {
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

  return octokit
    .paginate(workflowRunsRequest)
    .then(workflowRuns =>
      workflowRuns.forEach(workflowRun => {
        if (!workflowRun.id) {
          return;
        }

        const artifactsRequest = octokit.actions.listWorkflowRunArtifacts.endpoint.merge(
          Object.assign(repoOptions, { run_id: workflowRun.id })
        );

        // eslint-disable-next-line consistent-return
        return octokit.paginate(artifactsRequest).then(artifacts =>
          artifacts.forEach(artifact => {
            const createdAt = moment(artifact.created_at);

            if (!createdAt.isBefore(maxAge)) {
              return;
            }

            console.log(
              "Deleting Artifact which was created",
              createdAt.from(maxAge),
              "from maximum age for Workflow Run",
              workflowRun.id,
              ": ",
              artifact
            );

            // eslint-disable-next-line consistent-return
            return octokit.actions.deleteArtifact({
              owner,
              repo,
              artifact_id: artifact.id,
            });
          })
        );
      })
    )
    .catch(err => {
      console.log(err);
    });
}

run();
