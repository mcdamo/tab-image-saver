module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    removelogging: {
      build: {
        src: "build/**/*.js", // Each file will be overwritten with the output!
      },
      options: {
        methods: ["debug", "info"],
      },
    },
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks("grunt-remove-logging");

  // Default task(s).
  grunt.registerTask("default", ["removelogging"]);
};
