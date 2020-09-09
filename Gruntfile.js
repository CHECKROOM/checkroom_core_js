module.exports = function(grunt){
    // Project configuration
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        yuidoc: {
            all: {
                name: '<%= pkg.name %>',
                description: '<%= pkg.description %>',
                version: '<%= pkg.version %>',
                url: '<%= pkg.homepage %>',
                options: {
                    paths: ['src/core'],
                    outdir: './docs/'
                }
            }
        },
        clean:{
            jsdoc:['doc']
        },
        jsdoc : {
            dist : {
                src: ['src/**/*.js', 'src/**/**/*.js', 'README.md'],
                options: {
                    destination: 'doc',
                    template : "node_modules/jaguarjs-jsdoc",
                    configure : "jsdoc.conf.json"
                }
            }
        },
        requirejs: {
            compile: {
                options: {
                    baseUrl: "src/core",
                    out: "build/core.js",
                    include: ['../core'],
                    exclude:['jquery', 'moment'],
                    paths:{
                        "jquery": "empty:",
                        "moment": "empty:"
                    },
                    optimize: "none",
                    onModuleBundleComplete: function (data) {
                        var fs = require('fs'),
                          amdclean = require('amdclean'),
                          outputFile = data.path;

                        fs.writeFileSync(outputFile, amdclean.clean({
                            'filePath': outputFile,
                            wrap: {
                                "start":"(function (root, factory) {\nif (typeof define === 'function' && define.amd) {\ndefine(['jquery', 'moment'], factory);\n} else {\n root.cheqroomCore = factory($, moment);\n}\n}(this, function (jquery, moment) {",
                                "end": "\nif(typeof module !== 'undefined' && module.exports){\nmodule.exports = core;\n}\nreturn core;\n}))"
                            },
                        }));
                    }
                }
            },
            compileSignup: {
                options: {
                    baseUrl: "src/core",
                    out: "build/signup.js",
                    include: ['signup'],
                    exclude:['jquery', 'moment'],
                    paths:{
                        "jquery": "empty:",
                        "moment": "empty:"
                    },
                    optimize: "none",
                    onModuleBundleComplete: function (data) {
                        var fs = require('fs'),
                          amdclean = require('amdclean'),
                          outputFile = data.path;

                        fs.writeFileSync(outputFile, amdclean.clean({
                            'filePath': outputFile,
                            wrap: {
                                "start":"(function (factory) {\nif (typeof define === 'function' && define.amd) {\ndefine(['jquery', 'moment'], factory);\n} else {\nfactory($, moment);\n}\n}(function (jquery, moment) {",
                                "end": '\nreturn signup;\n}))'
                            },
                        }));
                    }
                }
            }            
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
                compress:{
                    pure_funcs: [ 'console.log', 'system.log' ]
                }
            },
            build: {
                src: 'build/core.js',
                dest: 'build/core.min.js'
            },
            signup:{
                src: 'build/signup.js',
                dest: 'build/signup.min.js'
            }
        },
        'gh-pages': {
            options: {
                base: 'doc'
            },
            src: ['**/*']
        }
    });

    // Load the plugins
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks("grunt-jsdoc");
    grunt.loadNpmTasks('grunt-gh-pages');

    // this will generate the docs by typing "grunt docs" on the command line
    grunt.registerTask("docs", ["requirejs", "clean:jsdoc","jsdoc"]);

    // the default task can be run just by typing "grunt" on the command line
    grunt.registerTask('default', ['requirejs', "uglify"]);

    // build signup file
    grunt.registerTask('signup', ['requirejs:compileSignup', "uglify:signup"]);
}