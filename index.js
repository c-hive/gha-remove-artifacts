const core = require("@actions/core");
const github = require("@actions/github");

async function run() {
  console.log("It works!");
  console.log(process.env.GITHUB_REPOSITORY);

  const token = core.getInput("GITHUB_TOKEN", { required: true });
  const octokit = new github.GitHub(token);

  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

  console.log(`Repo: ${owner} / ${repo}`);

  const { workflows } = await octokit.actions.listRepoWorkflows({
    owner,
    repo,
  });

  const runs = await octokit.actions.listRepoWorkflowRuns({
    owner,
    repo,
  });

  // workflows.forEach(workflow => {
  //   octokit.actions.listRepoWorkflowRuns({
  //     owner,
  //     repo,
  //   });
  // });

  console.log(runs);

  console.log(workflows);
}

run();
