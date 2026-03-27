module.exports = {
  extends: ["expo"],
  ignorePatterns: ["node_modules/", "db/migrations/"],
  rules: {
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
};
