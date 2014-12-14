'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var shelljs = require('shelljs');
var fs = require('fs');
// console.log(shelljs);
// var strings = require('yeoman-generator/underscore.strings');
module.exports = yeoman.generators.Base.extend({
    initializing: function() {
        this.pkg = require('../../package.json');
        var g = this;
        this.log(this.fs);
        this.readTplJSON = function(file, context) {
            var tpl = g.fs.read(g.templatePath(file));
            var json = g._.template(tpl, context);
            return JSON.parse(json);
        };
        this.writeJSON = function(file, json) {
            g.fs.write(g.destinationPath(file), JSON.stringify(json, null, 4));
        };
        // this.log(this._);
    },
    prompting: function() {
        var done = this.async();
        var _ = this._;
        // Have Yeoman greet the user.
        this.log(yosay('Welcome to the divine ' + chalk.red('Chayka') + ' generator!'));
        var prompts = [{
            name: 'appType',
            message: 'Please select application type',
            type: 'list',
            choices: [{
                name: 'WP Plugin',
                value: 'plugin'
            }, {
                name: 'WP Theme',
                value: 'theme'
            }, {
                name: 'WP Child Theme',
                value: 'child-theme'
            }, ],
            default: 'plugin'
        }, {
            name: 'parentTheme',
            message: 'Parent theme name, if omitted simple (non-child) theme will be created',
            when: function(answers) {
                return answers.appType === 'child-theme';
            }
        }, {
            name: 'routing',
            message: 'Please select routing type',
            type: 'list',
            choices: [{
                name: 'WordPress: app will use index.php, archive.php, single.php, etc as proxying stubs.',
                value: 'WP'
            }, {
                name: 'Chayka: app will have index.php that will proxy all requests to MVC router.',
                value: 'Chayka'
            }, ],
            when: function(answers) {
                if (answers.appType === 'child-theme' && !answers.parentTheme) {
                    answers.appType = 'theme';
                }
                return answers.appType === 'theme';
            }
        }, {
            name: 'appName',
            message: 'What would you like to call your application?',
            validate: function(value) {
                if (value && !value.match(/^[\w\d\.\-_]+$/)) {
                    return 'Only letters, numbers, ".", "-" and "_" are allowed';
                }
                return value ? true : 'You should specify project name, the field is required.';
            }
        }, {
            name: 'appDescription',
            message: 'How would you describe your application?',
            default: function(answers) {
                var type = '';
                if (answers.appType === 'child-theme' && !answers.parentTheme) {
                    answers.appType = 'theme';
                }
                switch (answers.appType) {
                    case 'theme':
                        type = 'WP Theme';
                        break;
                    case 'child-theme':
                        type = 'WP Child Theme';
                        break;
                    default:
                    case 'plugin':
                        type = 'WP Plugin';
                }
                return 'MVC/OOP ' + type + ' built with Chayka framework';
            }
        }, {
            name: 'appKeywords',
            message: 'How would you describe your application in comma seperated key words?',
            default: 'WordPress, Chayka'
        }, {
            name: 'appAuthor',
            message: 'What is your company/author name?',
            validate: function(value) {
                return value ? true : 'Oh common, don\'t be a masked hero!';
            },
            store: true
        }, {
            name: 'appAuthorEmail',
            message: 'What is your email?',
            store: true
        }, {
            name: 'packagistVendor',
            message: 'Your packagist.org vendor id?',
            default: function(answers) {
                return _.slugify(answers.appAuthor);
            },
            store: true
        }, {
            name: 'packagistPackage',
            message: 'Your packagist.org package id?',
            default: function(answers) {
                var re = new RegExp('^' + answers.packagistVendor + '[\\._\\-]?', 'i');
                var pck = answers.appName.replace(re, '');
                if (answers.parentTheme) {
                    pck += '-' + answers.parentTheme;
                }
                pck += answers.appType === 'plugin' ? '-wpp' : '-wpt';
                return _.slugify(pck);
            }
        }, {
            name: 'appLicense',
            message: 'What will be the license?',
            default: 'proprietary',
            store: true
        }, {
            name: 'phpNamespace',
            message: 'PHP namespace for your app',
            default: function(answers) {
                var re = new RegExp('^' + answers.packagistVendor + '[\\._\\-]?', 'i');
                return _.classify(answers.packagistVendor) + '\\' + _.classify(answers.appName.replace(re, ''));
            }
        }, {
            name: 'gitInit',
            message: 'Init git repository?',
            type: 'confirm'
        }, {
            name: 'gitRemote',
            message: 'Do you need remote repository?',
            type: 'list',
            choices: [{
                name: 'No',
                value: ''
            }, {
                name: 'Yes, ' + chalk.green('GitHub.com') + ' please',
                value: 'github'
            }, {
                name: 'Yes, ' + chalk.green('Bitbucket.org') + ' please',
                value: 'bitbucket'
            }, ],
            when: function(answers) {
                return !!answers.gitInit;
            }
        }, {
            name: 'githubUser',
            message: 'Your ' + chalk.green('GitHub.com') + ' username?',
            type: 'input',
            when: function(answers) {
                return answers.gitRemote === 'github';
            },
            validate: function(value) {
                return value ? true : 'Oh common, don\'t be a masked hero!';
            },
            default: function(answers) {
                return answers.packagistVendor || '';
            },
            store: true
        }, {
            name: 'bitbucketUser',
            message: 'Your ' + chalk.green('Bitbucket.org') + ' username?',
            type: 'input',
            when: function(answers) {
                return answers.gitRemote === 'bitbucket';
            },
            validate: function(value) {
                return value ? true : 'Oh common, don\'t be a masked hero!';
            },
            default: function(answers) {
                return answers.packagistVendor || '';
            },
            store: true
        }, {
            name: 'gitRemoteRepo',
            message: 'Please specify remote repo:',
            type: 'input',
            when: function(answers) {
                return !!answers.gitRemote;
            },
            default: function(answers) {
                var repo = '';
                //'git@bitbucket.org:chaykaborya/wpp-jurcatalogby-catalog.git'
                var appName = answers.appName;
                if (answers.parentTheme) {
                    appName += '-' + answers.parentTheme;
                }
                var suffix = answers.appType === 'plugin' ? '.wpp' : '.wpt';
                switch (answers.gitRemote) {
                    case 'github':
                        repo = 'git@github.com:' + answers.githubUser + '/' + appName + suffix + '.git';
                        break;
                    case 'bitbucket':
                        repo = 'git@bitbucket.org:' + answers.bitbucketUser + '/' + appName.toLowerCase() + suffix + '.git';
                        break;
                }
                return repo;
            },
            store: true
        }, {
            name: 'gitPush',
            message: 'git push?',
            type: 'confirm',
            when: function(answers) {
                return !!answers.gitRemote;
            }
        }];
        this.prompt(prompts, function(props) {
            this.Chayka = {
                options: props
            };
            this.appname = props.appName;
            this.description = props.appDescription;
            // this.log(this);
            done();
        }.bind(this));
    },
    writing: {
        app: function() {
            // package.json
            var pckg = this.readTplJSON('_package.json', this.Chayka.options);
            if (this.Chayka.options.gitRemoteRepo) {
                pckg.repository = {
                    type: 'git',
                    url: this.Chayka.options.gitRemoteRepo
                };
            }
            this.writeJSON('package.json', pckg);
            // bower
            var bower = this.readTplJSON('_bower.json', this.Chayka.options);
            bower.keywords = this.Chayka.options.appKeywords.split(/,\s*/);
            this.writeJSON('bower.json', bower);
            this.fs.copy(this.templatePath('bowerrc'), this.destinationPath('.bowerrc'));
            // composer
            var composer = this.readTplJSON('_composer.json', this.Chayka.options);
            if (this.Chayka.options.appType === 'plugin') {
                composer.autoload.classmap.push('Plugin.php');
            } else {
                composer.autoload.classmap.push('Theme.php');
                delete composer['chayka-wp-plugin'];
            }
            this.writeJSON('composer.json', composer);
            // grunt
            this.fs.copy(this.templatePath('Gruntfile.js'), this.destinationPath('Gruntfile.js'));
            this.fs.copy(this.templatePath('jshintrc'), this.destinationPath('.jshintrc'));
            this.fs.copy(this.templatePath('csslintrc'), this.destinationPath('.csslintrc'));
            this.fs.copy(this.templatePath('editorconfig'), this.destinationPath('.editorconfig'));
            // git
            this.fs.copy(this.templatePath('gitignore'), this.destinationPath('.gitignore'));
            this.fs.write('README.md', this.Chayka.options.appDescription);
            this.writeJSON('chayka.json', this.Chayka.options);
        },
        directories: function() {
            this.mkdir(this.destinationPath('app'));
            this.mkdir(this.destinationPath('app/controllers'));
            this.mkdir(this.destinationPath('app/helpers'));
            this.mkdir(this.destinationPath('app/models'));
            this.mkdir(this.destinationPath('app/views'));
            this.mkdir(this.destinationPath('res'));
            this.mkdir(this.destinationPath('res/lib'));
            this.mkdir(this.destinationPath('res/dist'));
            this.mkdir(this.destinationPath('res/src'));
            this.mkdir(this.destinationPath('res/src/css'));
            this.mkdir(this.destinationPath('res/src/js'));
            this.mkdir(this.destinationPath('res/src/img'));
        },
        projectfiles: function() {},
        themeFiles: function() {
            if (this.Chayka.options.appType === 'theme') {
                this.template(this.templatePath('Theme.xphp'), this.destinationPath('Theme.php'), this.Chayka.options);
            }
        },
        childThemeFiles: function() {},
        pluginFiles: function() {
            if (this.Chayka.options.appType === 'plugin') {
                this.template(this.templatePath('Plugin.xphp'), this.destinationPath('Plugin.php'), this.Chayka.options);
            }
        }
    },
    install: function() {
        if (!this.options['skip-install']) {
            this.installDependencies({
                skipInstall: this.options['skip-install']
            });
            this.spawnCommand('composer', ['install']);
            if (this.Chayka.options.gitInit && !fs.existsSync('.git')) {
                shelljs.exec('git init');
                shelljs.exec('git add .');
                shelljs.exec('git commit -m "first commit"');
            }
            if (this.Chayka.options.gitRemoteRepo && fs.existsSync('.git/config') && this.fs.read('.git/config').indexOf(this.Chayka.options.gitRemoteRepo) > -1) {
                shelljs.exec('git remote add origin ' + this.Chayka.options.gitRemoteRepo);
            }
            if (this.Chayka.options.gitPush) {
                shelljs.exec('git push -u origin master');
            }
        }
    }
});