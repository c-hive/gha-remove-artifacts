const core = require("@actions/core");
const github = require("@actions/github");

async function run() {
  console.log("It works!");
  console.log(process.env.GITHUB_REPOSITORY);

  const token = core.getInput("GITHUB_TOKEN", { required: true });
  const octokit = new github.GitHub(token);

  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

  console.log(`Repo: ${owner} / ${repo}`);

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
      console.log(
        "Deleting Artifact for Workflow Run",
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

run();
