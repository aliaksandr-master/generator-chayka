'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var shelljs = require('shelljs');
var fs = require('fs');
// console.log(shelljs);
// var strings = require('yeoman-generator/underscore.strings');

var framework = {
    helpers: {
        name: 'Chayka.Helpers',
        packagist: 'chyaka/wp',
        src: 'Chayka.WP/src',
    },
    mvc: {
        name: 'Chayka.MVC',
        packagist: 'chyaka/wp',
        src: 'Chayka.WP/src',
        deps: ['helpers']
    },
    wp: {
        name: 'Chayka.WP',
        packagist: 'chyaka/wp',
        src: 'Chayka.WP/src',
        deps: ['mvc']
    },
    core: {
        name: 'Chayka.Core.wpp',
        packagist: 'chyaka/core-wpp',
        deps: ['wp']
    },
    email: {
        name: 'Chayka.Email.wpp',
        packagist: 'chyaka/email-wpp',
        deps: ['core'],
    },
    auth: {
        name: 'Chayka.Auth.wpp',
        packagist: 'chyaka/auth-wpp',
        deps: ['core', 'email'],
    },
};

module.exports = yeoman.generators.Base.extend({
    initializing: function() {

        this.pkg = require('../../package.json');

        var g = this;

        g.appExists = fs.existsSync(g.destinationPath('Theme.php')) || fs.existsSync(g.destinationPath('Plugin.php'));

        // g.log('appExists: '+g.appExists);

        g.Chayka = {
            options: fs.existsSync(g.destinationPath('chayka.json'))?
                JSON.parse(g.fs.read(g.destinationPath('chayka.json'))):
                {}
            };

        this.readTplJSON = function(file, context) {
            var tpl = g.fs.read(g.templatePath(file));
            var json = g._.template(tpl, context);
            return JSON.parse(json);
        };

        this.readJSON = function(file) {
            var json = g.fs.read(g.destinationPath(file));
            return JSON.parse(json);
        };

        this.writeJSON = function(file, json) {
            g.fs.write(g.destinationPath(file), JSON.stringify(json, null, 4));
        };

        this.ensureSupport = function(appCode, support){
            var supportCode = '';
            support.forEach(function(sup){
                if(appCode.indexOf('addSupport_'+sup) === -1){
                    supportCode += g.fs.read(g.templatePath('code/App.addSupport_'+sup+'.xphp'));
                }
            });

            /* chayka: init/addSupport */
            return appCode.replace(/(?:\n)\s*\/\*\s*chayka:\s*init\/addSupport\s*\*\//, function(match){
                return '\n'+supportCode + match;
            });
        };

        this.ensureFunctions = function(appCode, functions){
            var functionsCode = '';
            functions.forEach(function(func){
                if(appCode.indexOf(func) === -1){
                    functionsCode += g.fs.read(g.templatePath('code/App.'+func+'.xphp'));
                }
            });

            return appCode.replace(/\}(?:[^}]*)\s*$/, functionsCode + '}');   
        };

        this.ensureIdeaPhpIncludePath = function(configCode, deps){
            var depsCode = '';
            for(var dep in deps){
                var depObj = framework[dep];
                var src = depObj.src || depObj.name;
                if(configCode.indexOf(src) === -1){
                    depsCode += g._.template(
                        g.fs.read(g.templatePath('idea/ideaProject.include.iml')),
                        {includePath: src}
                    );
                }
            }

            return configCode.replace(/(?:\n)\s*<!--\s*chayka:\s*includePath\s*-->/g, function(match){
                return '\n'+depsCode + match;
            });   
        };

        this.resolveDeps = function(dep, deps){
            deps = deps || {};
            var depObj = framework[dep];
            if(depObj){
                if(!deps[dep]){
                    if(depObj.deps){
                        depObj.deps.forEach(function(dep){
                            g.resolveDeps(dep, deps);
                        });
                    }
                    deps[dep] = true;
                }
            }

            return deps;
        };
        // this.log(this._);
    },
    prompting: function() {
        var done = this.async();
        var _ = this._;
        var g = this;
        var config = g.Chayka.options;
        // Have Yeoman greet the user.
        this.log(yosay('Welcome to the divine ' + chalk.red('Chayka') + ' generator!'));
        var prompts = [{
            name: 'wizard',
            message: 'Looks like the app already exists. Select what you are going to do:',
            type: 'list',
            choices: [
                {
                    name: 'Update configs',
                    value: 'update-configs'
                }, {
                    name: 'Update code',
                    value: 'update-code'
                }, {
                    name: 'Init .idea',
                    value: 'init-idea'
                }, 
            ],
            when: function(){
                return g.appExists; 
            }
        }, {
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
            default: 'plugin',
            when: function(answers){
                if(g.appExists){
                    answers = _.extend(answers, config);
                }
                return !g.appExists;
            }
        }, {
            name: 'parentTheme',
            message: 'Parent theme name, if omitted simple (non-child) theme will be created',
            when: function(answers) {
                return answers.appType === 'child-theme' && (!g.appExists || answers.wizard === 'update-configs');
            }
        }, {
            name: 'routing',
            message: 'Please select routing type',
            type: 'list',
            choices: [{
                name: chalk.green('WordPress') + ': app will use index.php, archive.php, single.php, etc as proxying stubs.',
                value: 'WP'
            }, {
                name: chalk.green('Chayka') + ': app will have index.php that will proxy all requests to MVC router.',
                value: 'Chayka'
            }, ],
            when: function(answers) {
                if (answers.appType === 'child-theme' && !answers.parentTheme) {
                    answers.appType = 'theme';
                }
                return !g.appExists && answers.appType === 'theme';
            }
        }, {
            name: 'appName',
            message: 'What would you like to call your application?',
            validate: function(value) {
                if (value && !value.match(/^[\w\d\.\-_]+$/)) {
                    return 'Only letters, numbers, ".", "-" and "_" are allowed';
                }
                return value ? true : 'You should specify project name, the field is required.';
            },
            when: function(){
                return !g.appExists;
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
            },
            when: function(answers){
                return !g.appExists || answers.wizard === 'update-configs';
            }
        }, {
            name: 'appKeywords',
            message: 'How would you describe your application in comma seperated key words?',
            default: config.appKeywords || 'WordPress, Chayka',
            when: function(answers){
                return !g.appExists || answers.wizard === 'update-configs';
            }
        }, {
            name: 'appVersion',
            message: 'So what\'s the version of your app?',
            default: config.appVersion || '0.0.1',
            when: function(answers){
                return !g.appExists || answers.wizard === 'update-configs';
            }
        }, {
            name: 'packagistVendor',
            message: 'Your packagist.org vendor id?',
            default: function(answers) {
                var re = /[\._\-].*$/;
                var vendor = g._slugify(answers.appName.replace(re, ''));
                return config.packagistVendor || vendor;
            },
            validate: function(value) {
                return value ? true : 'Oh common, don\'t be a masked hero!';
            },            
            when: function(answers){
                return !g.appExists || answers.wizard === 'update-configs';
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
                return config.packagistPackage || _.slugify(pck);
            },
            when: function(answers){
                return !g.appExists || answers.wizard === 'update-configs';
            }
        }, {
            name: 'phpNamespace',
            message: 'PHP namespace for your app',
            default: function(answers) {
                var re = new RegExp('^' + answers.packagistVendor + '[\\._\\-]?', 'i');
                return _.classify(answers.packagistVendor) + '\\' + _.classify(answers.appName.replace(re, ''));
            },
            when: function(){
                return !g.appExists;
            }
        }, {
            name: 'chaykaFramework',
            message: 'Select Chayka Framework location',
            type: 'list',
            choices: [
                'external',
                'embedded'
            ],
            when: function(){
                return !g.appExists;
            }
        }, {
            name: 'chaykaFrameworkDeps',
            message: 'Select Chayka Framework modules',
            type: 'checkbox',
            choices: [
                {
                    name: 'Chayka.Core.wpp',
                    value: 'core',
                    checked: true,
                },
                {
                    name: 'Chayka.Email.wpp',
                    value: 'email',
                    // checked: true,
                },
                {
                    name: 'Chayka.Auth.wpp',
                    value: 'auth',
                    // checked: true,
                },
                {
                    name: 'Chayka.Comments.wpp',
                    value: 'comments',
                    disabled: true,
                    // checked: true,
                },
                {
                    name: 'Chayka.Search.wpp',
                    value: 'search',
                    disabled: true,
                    // checked: true,
                },
                {
                    name: 'Chayka.DbMonitor.wpp',
                    value: 'db-monitor',
                    disabled: true,
                    // checked: true,
                },
                {
                    name: 'Chayka.Facebook.wpp',
                    value: 'facebook',
                    disabled: true,
                    // checked: true,
                },
            ],
            when: function(answers){
                return !g.appExists || answers.wizard === 'update-configs';
            }
        }, {
            name: 'initDep',
            message: 'Add init dependency check?',
            type: 'confirm',
            when: function(){
                return !g.appExists;
            }
        }, {
            name: 'initDepPhpClass',
            message: 'PHP class existence to check:',
            default: 'Chayka\\WP\\Plugin',
            when: function(answers){
                return answers.initDep && (!g.appExists || answers.wizard === 'update-code');
            }
        }, {
            name: 'initDepMessage',
            message: 'Init dependency check message:',
            default: 'Chayka Framework functionality is not available',
            when: function(answers){
                return answers.initDep && (!g.appExists || answers.wizard === 'update-code');
            }
        }, {
            name: 'support',
            message: 'Add support...',
            type: 'checkbox',
            choices: function(answers){
                var support = [
                    {
                        name: 'URI Processing',
                        value: 'UriProcessing',
                    },
                    {
                        name: 'Console Pages',
                        value: 'ConsolePages',
                    },
                    {
                        name: 'Metaboxes',
                        value: 'Metaboxes',
                    },
                    {
                        name: 'Custom Permalinks',
                        value: 'CustomPermalinks',
                    },
                    {
                        name: 'Post Processing',
                        value: 'PostProcessing',
                    },
                ];

                return answers.appType === 'Plugin' ? support : support.concat(
                    {
                        name: 'Thumbnails',
                        value: 'Thumbnails',
                    },
                    {
                        name: 'Excerpt',
                        value: 'Excerpt',
                    }
                );
            },
            when: function(answers){
                return !g.appExists || answers.wizard === 'update-code';
            }

        }, {
            name: 'register',
            message: 'Register...',
            type: 'checkbox',
            choices: function(answers){
                var register = [
                    {
                        name: 'Actions',
                        value: 'registerActions',
                        checked: true
                    },
                    {
                        name: 'Filters',
                        value: 'registerFilters',
                        checked: true
                    },
                    {
                        name: 'Resources',
                        value: 'registerResources',
                        checked: true
                    },
                    {
                        name: 'Routes',
                        value: 'registerRoutes',
                        checked: answers.support.indexOf('UriProcessing') > -1
                    },
                    {
                        name: 'Custom Post Types',
                        value: 'registerCustomPostTypes',
                        checked: answers.support.indexOf('CustomPermalinks') > -1
                    },
                    {
                        name: 'Taxonomies',
                        value: 'registerTaxonomies',
                        checked: answers.support.indexOf('CustomPermalinks') > -1
                    },
                    {
                        name: 'Console Pages',
                        value: 'registerConsolePages',
                        checked: answers.support.indexOf('ConsolePages') > -1
                    },
                    {
                        name: 'Metaboxes',
                        value: 'registerMetaboxes',
                        checked: answers.support.indexOf('Metaboxes') > -1
                    },
                    {
                        name: 'Shortcodes',
                        value: 'registerShortcodes',
                    },
                    {
                        name: 'Sidebars',
                        value: 'registerSidebars',
                    },
                ];

                return answers.appType === 'Plugin' ? register : register.concat(
                    {
                        name: 'NavMenus',
                        value: 'registerNavMenus',
                    }
                );
            },
            when: function(answers){
                return !g.appExists || answers.wizard === 'update-code';
            }

        }, {
            name: 'gitInit',
            message: 'Init git repository?',
            type: 'confirm',
            when: function(answers){
                return !fs.existsSync(g.destinationPath('.git')) && (!g.appExists || answers.wizard === 'update-configs');
            }
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
                return (!!answers.gitInit || fs.existsSync(g.destinationPath('.git')) && !config.gitRemote)  && (!g.appExists || answers.wizard === 'update-configs');
            }
        }, {
            name: 'githubUser',
            message: 'Your ' + chalk.green('GitHub.com') + ' username?',
            type: 'input',
            when: function(answers) {
                return answers.gitRemote === 'github' && (!g.appExists || answers.wizard === 'update-configs');
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
                return answers.gitRemote === 'bitbucket' && (!g.appExists || answers.wizard === 'update-configs');
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
                return !!answers.gitRemote && (!g.appExists || answers.wizard === 'update-configs');
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
                return !!answers.gitRemote && (!g.appExists || answers.wizard === 'update-configs');
            }
        }, {
            name: 'ideaInit',
            message: 'Init idea project?',
            type: 'confirm',
            when: function(answers){
                if(answers.wizard === 'init-idea'){
                    answers.ideaInit = true;
                }
                return !fs.existsSync(g.destinationPath('.idea')) && !g.appExists;
            }
        }, {
            name: 'ideaProject',
            message: 'Idea project name?',
            default: function(answers){
                return answers.appName + (answers.appType === 'plugin'?'.wpp':'.wpt');
            },
            when: function(answers){
                return !!answers.ideaInit;
            }
        }, {
            name: 'ideaDeploymentServerTheme',
            message: 'Idea deployment server?',
            default: 'WP Themes',
            when: function(answers){
                return !!answers.ideaInit && answers.appType !== 'plugin';
            },
            store: true
        }, {
            name: 'ideaDeploymentServerPlugin',
            message: 'Idea deployment server?',
            default: 'WP Plugins',
            when: function(answers){
                return !!answers.ideaInit && answers.appType === 'plugin';
            },
            store: true
        }, {
            name: 'ideaDeploymentPath',
            message: 'Idea deployment server?',
            default: function(answers){
                return '/' + answers.ideaProject;   
            },
            when: function(answers){
                return !!answers.ideaInit;
            },
            store: true
        }, {
            name: 'appAuthor',
            message: 'What is your company/author name?',
            validate: function(value) {
                return value ? true : 'Oh common, don\'t be a masked hero!';
            },
            default: config.appAuthor || '',
            when: function(answers){
                return !g.appExists || answers.wizard === 'update-configs';
            },
            store: true
        }, {
            name: 'appAuthorEmail',
            message: 'What is your email?',
            validate: function(value) {
                return value ? true : 'Oh common, don\'t be a masked hero!';
            },
            default: config.appAuthorEmail || '',
            when: function(answers){
                return !g.appExists || answers.wizard === 'update-configs';
            },
            store: true
        }, {
            name: 'appAuthorUri',
            message: 'What is your author URI? (optional)',
            default: function(answers){
                var uri = 'mailto:'+answers.appAuthorEmail;
                switch (answers.gitRemote || config.gitRemote) {
                    case 'github':
                        uri = 'https://github.com/' + answers.githubUser + '/';
                        break;
                    case 'bitbucket':
                        uri = 'https://bitbucket.org/' + answers.bitbucketUser + '/';
                        break;
                }

                return uri;
            },
            when: function(answers){
                return !g.appExists || answers.wizard === 'update-configs';
            },
            store: true
        }, {
            name: 'appLicense',
            message: 'What will be the license?',
            default: config.appLicense || 'proprietary',
            when: function(answers){
                return !g.appExists || answers.wizard === 'update-configs';
            },
            store: true
        }];
        this.prompt(prompts, function(answers) {

            if(answers.appType === 'plugin'){
                answers.ideaDeploymentServer = answers.ideaDeploymentServerPlugin;
                delete answers.ideaDeploymentServerPlugin;
            }else{
                answers.ideaDeploymentServer = answers.ideaDeploymentServerTheme;
                delete answers.ideaDeploymentServerTheme;
            }
            answers.appClass = answers.appType === 'plugin'? 'Plugin':'Theme';
            answers.chaykaFrameworkDeps = g.resolveDeps(answers.chaykaFrameworkDeps.length?answers.chaykaFrameworkDeps:['wp']);


            this.Chayka = {
                options: answers
            };
            this.appname = answers.appName;
            this.description = answers.appDescription;


            // this.log(this);
            done();
        }.bind(this));
    },
    writing: {
        newInstance: function() {
            var g = this;
            if(!g.appExists){

                // directroies
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

                // package.json
                var vars = this.Chayka.options;
                var pckg = this.readTplJSON('configs/_package.json', vars);
                if (vars.gitRemoteRepo) {
                    pckg.repository = {
                        type: 'git',
                        url: vars.gitRemoteRepo
                    };
                }
                this.writeJSON('package.json', pckg);

                // bower
                var bower = this.readTplJSON('configs/_bower.json', vars);
                bower.keywords = vars.appKeywords.split(/,\s*/);
                this.writeJSON('bower.json', bower);
                this.fs.copy(this.templatePath('configs/bowerrc'), this.destinationPath('.bowerrc'));

                // composer
                var composer = this.readTplJSON('configs/_composer.json', vars);
                if (vars.appType === 'plugin') {
                    composer.autoload.classmap.push('Plugin.php');
                } else {
                    composer.autoload.classmap.push('Theme.php');
                    delete composer['chayka-wp-plugin'];
                }
                var phpDeps = {};
                for(var dep in vars.chaykaFrameworkDeps){
                    var phpDep = framework[dep].packagist;
                    phpDeps[phpDep] = 'dev-master';
                }
                // this.log(vars.chaykaFrameworkDeps);
                // this.log(phpDeps);
                var depsField = vars.chaykaFramework === 'external' ? 'suggest':'require';
                this._.extend(composer[depsField], phpDeps);
                // this.log(composer);
                this.writeJSON('composer.json', composer);

                // grunt
                this.fs.copy(this.templatePath('configs/Gruntfile.js'), this.destinationPath('Gruntfile.js'));
                this.fs.copy(this.templatePath('configs/jshintrc'), this.destinationPath('.jshintrc'));
                this.fs.copy(this.templatePath('configs/csslintrc'), this.destinationPath('.csslintrc'));
                this.fs.copy(this.templatePath('configs/editorconfig'), this.destinationPath('.editorconfig'));

                // git
                this.fs.copy(this.templatePath('configs/gitignore'), this.destinationPath('.gitignore'));
                this.fs.write('README.md', vars.appDescription);

                // chayka.json
                delete vars.wizard;
                this.writeJSON('chayka.json', vars);

                // Plugin or Theme
                // this.template(this.templatePath('code/App.xphp'), this.destinationPath(vars.appClass + '.php'), vars);

                var appCode = this._.template(this.fs.read(this.templatePath('code/App.xphp')), vars);

                var snippets = [];
                if(vars.support.indexOf('PostProcessing') > -1){
                    snippets.push('postProcessing');
                }
                if(vars.support.indexOf('CustomPermalinks') > -1){
                    snippets.push('permalinks');
                }

                appCode = this.ensureSupport(appCode, vars.support);
                appCode = this.ensureFunctions(appCode, vars.register);
                if(snippets.length){
                    appCode = this.ensureFunctions(appCode, snippets);
                }

                // this.log(appCode);

                this.fs.write(this.destinationPath(vars.appClass + '.php'), appCode);

                if(vars.appType === 'plugin'){
                    var initCode = this.fs.read(this.templatePath(vars.initDep?'code/functions.dep.xphp':'code/functions.xphp'))
                        .replace('<?php', '<?php\n' + this._.template(this.templatePath('configs/header-plugin.xphp'), vars));
                    this.fs.write(this.destinationPath(vars.appName + '.wpp.php'), initCode);
                }else{  // theme or child theme

                    this.template(
                        this.templatePath(vars.initDep?'code/functions.dep.xphp':'code/functions.xphp'),
                        this.destinationPath('functions.php'),
                        vars
                    );

                    this.template(
                        this.templatePath(vars.parentTheme?'configs/header-child-theme.xcss':'configs/header-theme.xcss'),
                        this.destinationPath('res/src/theme-header.css'),
                        vars
                    );

                    if(vars.appType === 'theme'){

                    }else{

                    }
                }

            }
        },

        updateConfigs: function(){
            // var g = this;
            var vars = this.Chayka.options;
            if(vars.wizard === 'update-configs'){
                // package.json
                var pckgUpdate = this.readTplJSON('configs/_package.json', vars);
                if (vars.gitRemoteRepo) {
                    pckgUpdate.repository = {
                        type: 'git',
                        url: vars.gitRemoteRepo
                    };
                }
                pckgUpdate = this._.omit(pckgUpdate, 'dependencies', 'devDependencies');
                var pckg = this.readJSON('package.json');
                this._.extend(pckg, pckgUpdate);
                this.writeJSON('package.json', pckg);

                // bower
                var bowerUpdate = this.readTplJSON('configs/_bower.json', vars);
                bowerUpdate = this._.omit(bowerUpdate, 'dependencies', 'devDependencies', 'keywords', 'ignore');
                var bower = this.readJSON('bower.json');
                bower.keywords = vars.appKeywords.split(/,\s*/);
                this._.extend(bower, bowerUpdate);
                this.writeJSON('bower.json', bower);

                // composer
                var composerUpdate = this.readTplJSON('configs/_composer.json', vars);
                composerUpdate = this._.omit(composerUpdate, 'require', 'requireDev', 'suggest', 'autoload');
                var composer = this.readJSON('composer.json');
                this._.extend(composer, composerUpdate);
                var phpDeps = {};
                for(var dep in vars.chaykaFrameworkDeps){
                    var phpDep = framework[dep].packagist;
                    phpDeps[phpDep] = 'dev-master';
                }
                var depsField = vars.chaykaFramework === 'external' ? 'suggest':'require';
                this._.extend(composer[depsField], phpDeps);
                this.writeJSON('composer.json', composer);

                // app headers
                if(vars.appType === 'plugin'){
                    var initCode = this.fs.read(this.destinationPath(vars.appName + '.wpp.php'))
                        .replace(/^\s*<\?php\s*\/\*\*(\s*\n\s*\*[^\n]*)*\s*\*\//, '<?php\n' + this._.template(this.templatePath('configs/header-plugin.xphp'), vars));
                    this.fs.write(this.destinationPath(vars.appName + '.wpp.php'), initCode);
                }else{  // theme or child theme
                    this.template(
                        this.templatePath(vars.parentTheme?'configs/header-child-theme.xcss':'configs/header-theme.xcss'),
                        this.destinationPath('res/src/theme-header.css'),
                        vars
                    );
                }

            }
        },

        updateCode: function(){
            // var g = this;
            var vars = this.Chayka.options;
            if(vars.wizard === 'update-code'){
                var appFile = this.destinationPath(vars.appClass + '.php');
                var appCode = this.fs.read(appFile);

                var snippets = [];
                if(vars.support.indexOf('PostProcessing') > -1){
                    snippets.push('postProcessing');
                }
                if(vars.support.indexOf('CustomPermalinks') > -1){
                    snippets.push('permalinks');
                }

                appCode = this.ensureSupport(appCode, vars.support);
                appCode = this.ensureFunctions(appCode, vars.register);
                if(snippets.length){
                    appCode = this.ensureFunctions(appCode, snippets);
                }

                // this.log(appCode);

                this.fs.write(appFile, appCode);
            }
        },

        initIdea: function(){
            var g = this;
            var vars = this.Chayka.options;
            if(vars.ideaInit){
                var configCode;
                var configPath = g.destinationPath('.idea/' + vars.ideaProject + '.iml');
                if(!g.appExists || vars.wizard === 'init-idea'){
                    
                    configCode = this.fs.read(g.templatePath('idea/ideaProject.iml'));
                    if(vars.chaykaFramework === 'external'){
                        configCode = this.ensureIdeaPhpIncludePath(configCode, vars.chaykaFrameworkDeps);
                    }
                    this.fs.write(configPath, configCode);
                    this.mkdir(g.destinationPath('.idea'));
                    this.template(g.templatePath('idea/.name'), g.destinationPath('.idea/.name'), vars);
                    this.template(g.templatePath('idea/deployment.xml'), g.destinationPath('.idea/deployment.xml'), vars);
                    this.template(g.templatePath('idea/modules.xml'), g.destinationPath('.idea/modules.xml'), vars);
                    this.fs.copy(g.templatePath('idea/php.xml'), g.destinationPath('.idea/php.xml'));
                    if(vars.gitInit){
                        this.fs.copy(g.templatePath('idea/vcs.xml'), g.destinationPath('.idea/vcs.xml'));
                    }
                }else if(vars.wizard === 'update-configs' && vars.chaykaFramework === 'external'){
                    configCode = this.fs.read(configPath);
                    configCode = this.ensureIdeaPhpIncludePath(configCode, vars.chaykaFrameworkDeps);
                    this.fs.write(configPath, configCode);
                }
            }
        }
    },
    install: function() {
        var g = this;
        if (!this.options['skip-install'] && !g.appExists) {
            this.installDependencies({
                skipInstall: this.options['skip-install']
            });

            shelljs.exec('composer install');
            // shelljs.exec('grunt');
            this.spawnCommand('grunt');
        }

        if (this.Chayka.options.gitInit && !fs.existsSync(g.destinationPath('.git'))) {
            shelljs.exec('git init');
            shelljs.exec('git add .');
            shelljs.exec('git commit -m "first commit"');
        }
        if (this.Chayka.options.gitRemoteRepo && fs.existsSync(g.destinationPath('.git/config')) && this.fs.read(g.destinationPath('.git/config')).indexOf(this.Chayka.options.gitRemoteRepo) > -1) {
            shelljs.exec('git remote add origin ' + this.Chayka.options.gitRemoteRepo);
            if (this.Chayka.options.gitPush) {
                shelljs.exec('git push -u origin master');
            }
        }
    }
});