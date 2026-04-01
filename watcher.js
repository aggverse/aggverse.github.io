const chokidar = require("chokidar");
const { exec } = require("child_process");

const watcher = chokidar.watch("writing", {
  ignoreInitial: true,
  persistent: true
});

watcher.on("all", (event, path) => {
  console.log(`Detected ${event} on ${path}`);
  console.log("Rebuilding...");
  exec("node build.js", (err, stdout, stderr) => {
    if (err) console.error(err);
    console.log(stdout);
  });
});