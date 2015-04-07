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
                    paths: ['src/app'],
                    outdir: './docs/'
                }
            }
        },
        clean:{
            jsdoc:['doc']
        },
        jsdoc : {
            dist : {
                src: ['src/**/*.js', 'README.md'],
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
                    baseUrl: "src/app",
                    out: "build/<%= pkg.name %>.js",
                    include: ['../main', '../../tests/js/lib/almond/almond'],
                    exclude:['jquery', 'jquery-jsonp', 'jquery-pubsub', 'moment'],
                    paths:{
                        "jquery": "empty:",
                        "jquery-jsonp": "empty:",
                        "moment": "empty:",
                        "jquery-pubsub": "empty:"
                    },
                    wrap: {
                        "startFile": "wrap.start",
                        "endFile": "wrap.end"
                    },
                    optimize: "none"
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
                src: 'build/<%= pkg.name %>.js',
                dest: 'build/<%= pkg.name %>.min.js'
            }
        },
        qunit: {
            options : {
                '--web-security' : false,
                '--local-to-remote-url-access' : true,
                '--ignore-ssl-errors' : true
            },
            all:{
                options:{
                    urls:[
                        'http://localhost:8000/tests/index.html'
                    ]
                }
            }
        },
        connect: {
            server: {
                options: {
                    port: 8000,
                    base: '.'
                }
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
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks("grunt-jsdoc");
    grunt.loadNpmTasks('grunt-gh-pages');

    // this will generate the docs by typing "grunt docs" on the command line
    grunt.registerTask("docs", ["clean:jsdoc","jsdoc"]);

    // this would be run by typing "grunt test" on the command line
    grunt.registerTask('test', ['connect','qunit']);

    // the default task can be run just by typing "grunt" on the command line
    grunt.registerTask('default', ['requirejs', "uglify", 'connect', 'qunit']);
}