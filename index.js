const core = require("@actions/core");
const github = require("@actions/github");

async function run() {
  console.log("It works!");
  console.log(process.env.GITHUB_REPOSITORY);

  const token = core.getInput("GITHUB_TOKEN", { required: true });
  const Octokit = new github.GitHub(token);

  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

  console.log(`Repo: ${owner} / ${repo}`);

  const { workflows } = Octokit.actions.listRepoWorkflows({
    owner,
    repo,
  });

  console.log(workflows);
}

run();
