const core = require("@actions/core");
const github = require("@actions/github");
const moment = require("moment");

async function run() {
  console.log("It works!");
  console.log(process.env.GITHUB_REPOSITORY);

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

  const { data: runs } = await octokit.actions.listRepoWorkflowRuns({
    owner,
    repo,
  });

  for await (const workflowRun of runs.workflow_runs) {
    const { data: artifacts } = await octokit.actions.listWorkflowRunArtifacts({
      owner,
      repo,
      run_id: workflowRun.id,
    });

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

run();
