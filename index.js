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

function run() {
  const configs = getConfigs();
  const octokit = new Octokit();

  const workflowRunsRequest = octokit.actions.listRepoWorkflowRuns.endpoint.merge(
    configs.repoOptions
  );

  return octokit.paginate(workflowRunsRequest).then(async workflowRuns => {
    const workflowRunPromises = workflowRuns.reduce((result, workflowRun) => {
      const workflowRunArtifactsRequest = octokit.actions.listWorkflowRunArtifacts.endpoint.merge(
        {
          ...configs.repoOptions,
          run_id: workflowRun.id,
        }
      );

      result.push(
        octokit.paginate(workflowRunArtifactsRequest).then(artifacts =>
          artifacts.reduce((artifactsResult, artifact) => {
            const createdAt = moment(artifact.created_at);

            if (!createdAt.isBefore(configs.maxAge)) {
              return artifactsResult;
            }

            if (devEnv) {
              console.log(
                `Recognized development environment, preventing ${artifact.id} from being removed`
              );

              return artifactsResult;
            }

            artifactsResult.push(
              octokit.actions
                .deleteArtifact({
                  ...configs.repoOptions,
                  artifact_id: artifact.id,
                })
                .then(() => {
                  console.log(
                    `Successfully removed artifact with id ${artifact.id}`
                  );
                })
            );

            return artifactsResult;
          }, [])
        )
      );

      return result;
    }, []);

    return Promise.all(workflowRunPromises).then(results => {
      const filteredResult = results.filter(result => result.length);

      return Promise.all([].concat(...filteredResult));
    });
  });
}

(async () => {
  await run();
})();
