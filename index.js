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

  octokit.paginate(workflowRunsRequest).then(workflowRuns => {
    const deleteArtifactPromises = workflowRuns
      .filter(workflowRun => workflowRun.id)
      .map(workflowRun =>
        octokit
          .paginate(
            octokit.actions.listWorkflowRunArtifacts.endpoint.merge(
              Object.assign(repoOptions, { run_id: workflowRun.id })
            )
          )
          .then(artifacts =>
            artifacts
              .filter(artifact => {
                const createdAt = moment(artifact.created_at);

                return createdAt.isBefore(maxAge);
              })
              .map(artifact =>
                octokit.actions.deleteArtifact({
                  owner,
                  repo,
                  artifact_id: artifact.id,
                })
              )
          )
      );

    console.log(deleteArtifactPromises);

    Promise.all(deleteArtifactPromises)
      .then(() => {
        console.log(
          `Successfully removed ${deleteArtifactPromises.length} artifacts`
        );
      })
      .catch(err => {
        console.log(err);
      });
  });
}

run();
