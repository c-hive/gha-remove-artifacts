const core = require("@actions/core");
const github = require("@actions/github");
const moment = require("moment");

const devEnv = process.env.NODE_ENV === "dev";

function isDefined(value) {
  return typeof value !== "undefined" && value !== null;
}

if (devEnv) {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  require("dotenv").config();
}

function getToken() {
  if (devEnv) {
    if (!isDefined(process.env.PERSONAL_ACCESS_TOKEN)) {
      throw new Error("Missing PERSONAL_ACCESS_TOKEN environment variable");
    }

    return process.env.PERSONAL_ACCESS_TOKEN;
  }

  return core.getInput("GITHUB_TOKEN", { required: true });
}

function getRepoOptions() {
  if (devEnv && !isDefined(process.env.GITHUB_REPOSITORY)) {
    throw new Error("Missing GITHUB_REPOSITORY environment variable");
  }

  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

  if (!isDefined(owner) || !isDefined(repo)) {
    throw new Error("Missing repository options");
  }

  return {
    owner,
    repo,
  };
}

function getMaxAge() {
  if (devEnv) {
    if (!isDefined(process.env.AGE)) {
      throw new Error("Missing AGE environment variable");
    }

    const [age, units] = process.env.AGE.split(" ");

    if (!isDefined(age) || !isDefined(units)) {
      throw new Error("AGE format is invalid");
    }

    const maxAge = moment().subtract(age, units);

    console.log(
      "Maximum artifact age:",
      age,
      units,
      "( created before",
      maxAge.format(),
      ")"
    );

    return moment().subtract(age, units);
  }

  return core.getInput("age", { required: true }).split(" ");
}

function getConfigs() {
  return {
    token: getToken(),
    repoOptions: getRepoOptions(),
    maxAge: getMaxAge(),
  };
}

async function run() {
  const configs = getConfigs();
  const octokit = new github.GitHub(configs.token);

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
