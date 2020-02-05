module.exports = {
  extends: [
    "airbnb-base",
    // Only this is needed to integrate Prettier, see: https://github.com/prettier/eslint-plugin-prettier#recommended-configuration
    "plugin:prettier/recommended",
  ],
  rules: {
    "linebreak-style": ["error", (process.platform === "win32" ? "windows" : "unix")], // https://stackoverflow.com/q/39114446/2771889
    "import/prefer-default-export": 0, // https://stackoverflow.com/q/54245654/2771889
    "react/sort-comp": "off", // https://github.com/yannickcr/eslint-plugin-react/issues/1214
    "no-console": "off", // console log is fine in the context of GitHub Actions
  },
};
