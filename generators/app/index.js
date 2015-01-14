'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var shelljs = require('shelljs');
var utils = require('../utils'), util = null;
var promptAnswers = {}
// var fs = require('fs');
// console.log(shelljs);
// var strings = require('yeoman-generator/underscore.strings');

var framework = {
    helpers: {
        name: 'Chayka.Helpers',
        packagist: 'chayka/wp',
        src: 'Chayka.WP/src',
    },
    mvc: {
        name: 'Chayka.MVC',
        packagist: 'chayka/wp',
        src: 'Chayka.WP/src',
        deps: ['helpers']
    },
    wp: {
        name: 'Chayka.WP',
        packagist: 'chayka/wp',
        src: 'Chayka.WP/src',
        deps: ['mvc']
    },
    core: {
        name: 'Chayka.Core.wpp',
        packagist: 'chayka/core-wpp',
        deps: ['wp']
    },
    email: {
        name: 'Chayka.Email.wpp',
        packagist: 'chayka/email-wpp',
        deps: ['core'],
    },
    auth: {
        name: 'Chayka.Auth.wpp',
        packagist: 'chayka/auth-wpp',
        deps: ['core', 'email'],
    },
};

module.exports = yeoman.generators.Base.extend({
    initializing: function() {

        this.pkg = require('../../package.json');

        util = utils(this);

        var g = this;

        g.appExists = util.pathExists('Theme.php') || util.pathExists('Plugin.php');

        // g.Chayka = {
        //     options: util.pathExists('chayka.json')?
        //         util.readJSON('chayka.json'):
        //         {}
        //     };

        this.ensureSupport = function(appCode, support){
            var supportCode = '';
            support.forEach(function(sup){
                if(appCode.indexOf('addSupport_'+sup) === -1){
                    supportCode += util.readTpl('code/App.addSupport_'+sup+'.xphp');
                }
            });

            /* chayka: init-addSupport */
            return util.insertAtSlashStarComment('init-addSupport', appCode, supportCode);
        };

        this.ensureFunctions = function(appCode, functions){
            var functionsCode = '';
            functions.forEach(function(func){
                if(appCode.indexOf(func) === -1){
                    functionsCode += util.readTpl('code/App.'+func+'.xphp');
                }
            });

            return util.insertBeforeClosingBracket(appCode, functionsCode);   
        };

        this.ensureIdeaPhpIncludePath = function(configCode, deps){
            var depsCode = '';
            for(var dep in deps){
                var depObj = framework[dep];
                var src = depObj.src || depObj.name;
                if(configCode.indexOf(src) === -1){
                    depsCode += util.readTpl('idea/ideaProject.include.iml', {includePath: src});
                }
            }

            return util.insertAtHtmlComment('includePath', configCode, depsCode);
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

        this.generateProjectName = function(answers){
            var name = answers.appName;
            // console.log('parent theme: '+ answers.parentTheme);
            if(answers.parentTheme && answers.includeParent){
                name += '.'+answers.parentTheme;
            }
            name += answers.appType === 'plugin'?'.wpp':'.wpt';
            return name;
        };

        g.config.defaults({
            'support': [],
            'register': [],
        });
    },
    prompting: function() {
        var done = this.async();
        // var _ = this._;
        var g = this;
        var config = g.config.getAll();
        // var config = g.Chayka.options;
        // Have Yeoman greet the user.
        var prompts = [{
            name: 'wizard',
            message: 'Looks like the app already exists. Select what you are going to do:',
            type: 'list',
            choices: [
                {
                    name: 'Update configs',
                    value: 'update-configs',
                }, {
                    name: 'Update code',
                    value: 'update-code',
                }, {
                    name: 'Init .idea',
                    value: 'init-idea',
                    disabled: util.pathExists('.idea'),
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
                    answers = util.extend(answers, config);
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
            name: 'includeParent',
            message: 'Include parent theme name in project name?',
            type: 'confirm',
            when: function(answers) {
                if (answers.appType === 'child-theme' && !answers.parentTheme) {
                    answers.appType = 'theme';
                }
                return !g.appExists && answers.appType === 'child-theme';
            },
            store: true,
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
            validate: util.checkRequired,            
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
                if (answers.parentTheme && answers.includeParent) {
                    pck += '-' + answers.parentTheme;
                }
                pck += answers.appType === 'plugin' ? '-wpp' : '-wpt';
                return config.packagistPackage || util.slugify(pck);
            },
            when: function(answers){
                return !g.appExists || answers.wizard === 'update-configs';
            }
        }, {
            name: 'phpNamespace',
            message: 'PHP namespace for your app',
            default: function(answers) {
                var re = new RegExp('^' + answers.packagistVendor + '[\\._\\-]?', 'i');
                return util.classify(answers.packagistVendor) + '\\' + util.classify(answers.appName.replace(re, ''));
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
            name: 'support', // http://codex.wordpress.org/Post_Formats
            message: 'Add support...',
            type: 'checkbox',
            choices: function(answers){
                var support = [
                    {
                        name: 'URI Processing',
                        value: 'UriProcessing',
                        checked: config.support.indexOf('UriProcessing') > -1,
                        disabled: config.support.indexOf('UriProcessing') > -1,
                    },
                    {
                        name: 'Console Pages',
                        value: 'ConsolePages',
                        checked: config.support.indexOf('ConsolePages') > -1,
                        disabled: config.support.indexOf('ConsolePages') > -1,
                    },
                    {
                        name: 'Metaboxes',
                        value: 'Metaboxes',
                        checked: config.support.indexOf('Metaboxes') > -1,
                        disabled: config.support.indexOf('Metaboxes') > -1,
                    },
                    {
                        name: 'Custom Permalinks',
                        value: 'CustomPermalinks',
                        checked: config.support.indexOf('CustomPermalinks') > -1,
                        disabled: config.support.indexOf('CustomPermalinks') > -1,
                    },
                    {
                        name: 'Post Processing',
                        value: 'PostProcessing',
                        checked: config.support.indexOf('PostProcessing') > -1,
                        disabled: config.support.indexOf('PostProcessing') > -1,
                    },
                ];

                return answers.appType === 'plugin' ? support : support.concat(
                    {
                        name: 'Thumbnails',
                        value: 'Thumbnails',
                        checked: config.support.indexOf('Thumbnails') > -1,
                        disabled: config.support.indexOf('Thumbnails') > -1,
                    },
                    {
                        name: 'Excerpt',
                        value: 'Excerpt',
                        checked: config.support.indexOf('Excerpt') > -1,
                        disabled: config.support.indexOf('Excerpt') > -1,
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
                        checked: config.register.indexOf('registerActions') > -1 || true,
                        disabled: config.register.indexOf('registerActions') > -1,
                    },
                    {
                        name: 'Filters',
                        value: 'registerFilters',
                        checked: config.register.indexOf('registerFilters') > -1 || true,
                        disabled: config.register.indexOf('registerFilters') > -1,
                    },
                    {
                        name: 'Resources',
                        value: 'registerResources',
                        checked: config.register.indexOf('registerResources') > -1 || true,
                        disabled: config.register.indexOf('registerResources') > -1,
                    },
                    {
                        name: 'Routes',
                        value: 'registerRoutes',
                        checked: config.register.indexOf('registerRoutes') > -1 || answers.support.indexOf('UriProcessing') > -1,
                        disabled: config.register.indexOf('registerRoutes') > -1,
                    },
                    {
                        name: 'Custom Post Types',
                        value: 'registerCustomPostTypes',
                        checked: config.register.indexOf('registerCustomPostTypes') > -1 || answers.support.indexOf('CustomPermalinks') > -1,
                        disabled: config.register.indexOf('registerCustomPostTypes') > -1,
                    },
                    {
                        name: 'Taxonomies',
                        value: 'registerTaxonomies',
                        checked: config.register.indexOf('registerTaxonomies') > -1 || answers.support.indexOf('CustomPermalinks') > -1,
                        disabled: config.register.indexOf('registerTaxonomies') > -1,
                    },
                    {
                        name: 'Console Pages',
                        value: 'registerConsolePages',
                        checked: config.register.indexOf('registerConsolePages') > -1 || answers.support.indexOf('ConsolePages') > -1,
                        disabled: config.register.indexOf('registerConsolePages') > -1,
                    },
                    {
                        name: 'Metaboxes',
                        value: 'registerMetaboxes',
                        checked: config.register.indexOf('registerMetaboxes') > -1 || answers.support.indexOf('Metaboxes') > -1,
                        disabled: config.register.indexOf('registerMetaboxes') > -1,
                    },
                    {
                        name: 'Shortcodes',
                        value: 'registerShortcodes',
                        checked: config.register.indexOf('registerShortcodes') > -1,
                        disabled: config.register.indexOf('registerShortcodes') > -1,
                    },
                    {
                        name: 'Sidebars',
                        value: 'registerSidebars',
                        checked: config.register.indexOf('registerSidebars') > -1,
                        disabled: config.register.indexOf('registerSidebars') > -1,
                    },
                ];

                return answers.appType === 'plugin' ? register : register.concat(
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
                return !util.pathExists('.git') && (!g.appExists || answers.wizard === 'update-configs');
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
                return (!!answers.gitInit || util.pathExists('.git') && !config.gitRemote)  && (!g.appExists || answers.wizard === 'update-configs');
            }
        }, {
            name: 'githubUser',
            message: 'Your ' + chalk.green('GitHub.com') + ' username?',
            type: 'input',
            when: function(answers) {
                return answers.gitRemote === 'github' && (!g.appExists || answers.wizard === 'update-configs');
            },
            validate: util.checkRequired,
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
            validate: util.checkRequired,
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
                var prjName = g.generateProjectName(answers);
                switch (answers.gitRemote) {
                    case 'github':
                        repo = 'git@github.com:' + answers.githubUser + '/' + prjName + '.git';
                        break;
                    case 'bitbucket':
                        repo = 'git@bitbucket.org:' + answers.bitbucketUser + '/' + prjName.toLowerCase() + '.git';
                        break;
                }
                return repo;
            },
            // store: true
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
                return !util.pathExists('.idea');
            }
        }, {
            name: 'ideaProject',
            message: 'Idea project name?',
            default: function(answers){
                return g.generateProjectName(answers);
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
            validate: util.checkRequired,
            default: config.appAuthor || '',
            when: function(answers){
                return !g.appExists || answers.wizard === 'update-configs';
            },
            store: true
        }, {
            name: 'appAuthorEmail',
            message: 'What is your email?',
            validate: util.checkRequired,
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
        promptAnswers = config;
        promptAnswers.support = promptAnswers.support || [];
        promptAnswers.register = promptAnswers.register || [];
        switch(g.options.externalCall){
            case 'enable-console-pages':
                promptAnswers.wizard = 'update-code';
                promptAnswers.support.push('ConsolePages');
                promptAnswers.register.push('registerConsolePages');
                break;
            case 'enable-metaboxes':
                promptAnswers.wizard = 'update-code';
                promptAnswers.support.push('Metaboxes');
                promptAnswers.register.push('registerMetaBoxes');
                break;
            case 'enable-shortcodes':
                promptAnswers.wizard = 'update-code';
                promptAnswers.register.push('registerShortcodes');
                break;
            case 'enable-custom-post-types':
                promptAnswers.wizard = 'update-code';
                promptAnswers.register.push('registerCustomPostTypes');
                break;
            case 'enable-taxonomies':
                promptAnswers.wizard = 'update-code';
                promptAnswers.register.push('registerTaxonomies');
                break;
            default:
                this.log(yosay('Welcome to the divine ' + chalk.red('Chayka') + ' generator!'));
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

                    this.appname = answers.appName;
                    this.description = answers.appDescription;
                    answers.support = g._.union(promptAnswers.support, answers.support);
                    answers.register = g._.union(promptAnswers.register, answers.register);
                    util.extend(promptAnswers, answers);

                    done();
                }.bind(this));
        }
        if(g.options.externalCall){
            done();
        }
    },
    writing: {
        newInstance: function() {
            var g = this;
            if(!g.appExists){

                // directroies
                util.mkdir('app');
                util.mkdir('app/controllers');
                util.mkdir('app/helpers');
                util.mkdir('app/models');
                util.mkdir('app/views');
                util.mkdir('res');
                util.mkdir('res/lib');
                util.mkdir('res/dist');
                util.mkdir('res/src');
                util.mkdir('res/src/css');
                util.mkdir('res/src/js');
                util.mkdir('res/src/img');

                // package.json
                // var vars = this.Chayka.options;
                var vars = promptAnswers;
                var pckg = util.readTplJSON('configs/_package.json', vars);
                if (vars.gitRemoteRepo) {
                    pckg.repository = {
                        type: 'git',
                        url: vars.gitRemoteRepo
                    };
                }
                util.writeJSON('package.json', pckg);

                // bower
                var bower = util.readTplJSON('configs/_bower.json', vars);
                bower.keywords = vars.appKeywords.split(/,\s*/);
                util.writeJSON('bower.json', bower);
                util.copy('configs/bowerrc', '.bowerrc');

                // composer
                var composer = util.readTplJSON('configs/_composer.json', vars);
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
                util.extend(composer[depsField], phpDeps);
                // this.log(composer);
                util.writeJSON('composer.json', composer);

                // grunt
                util.copy('configs/Gruntfile.js', 'Gruntfile.js');
                util.copy('configs/jshintrc', '.jshintrc');
                util.copy('configs/csslintrc', '.csslintrc');
                util.copy('configs/editorconfig', '.editorconfig');

                // git
                util.copy('configs/gitignore', '.gitignore');
                util.write('README.md', vars.appDescription);

                // chayka.json

                util.writeJSON('chayka.json', g._.pick(vars, [
                    'appType', 'appName', 'appDescription', 'appKeywords', 'appVersion', 
                    'appAuthor', 'appAuthorEmail', 'appAuthorUri', 'appLicense', 
                    'parentTheme', 'phpNamespace', 'routing', 'chaykaFramework', 'chaykaFrameworkDeps', 'support', 'register',
                ]));

                // Plugin or Theme
                // this.template(this.templatePath('code/App.xphp'), this.destinationPath(vars.appClass + '.php'), vars);

                var appCode = util.readTpl('code/App.xphp', vars);

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

                util.write(vars.appClass + '.php', appCode);

                if(vars.appType === 'plugin'){
                    var initCode = util.readTpl(vars.initDep?'code/functions.dep.xphp':'code/functions.xphp', vars)
                        .replace('<?php', '<?php\n' + util.readTpl('configs/header-plugin.xphp', vars));
                    util.write(vars.appName + '.wpp.php', initCode);
                }else{  // theme or child theme

                    util.copy(
                        vars.initDep?'code/functions.dep.xphp':'code/functions.xphp',
                        'functions.php',
                        vars
                    );

                    util.copy(
                        vars.parentTheme?'configs/header-child-theme.xcss':'configs/header-theme.xcss',
                        'res/src/theme-header.css',
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
            var vars = promptAnswers;
            if(vars.wizard === 'update-configs'){
                // package.json
                var pckgUpdate = util.readTplJSON('configs/_package.json', vars);
                if (vars.gitRemoteRepo) {
                    pckgUpdate.repository = {
                        type: 'git',
                        url: vars.gitRemoteRepo
                    };
                }
                pckgUpdate = this._.omit(pckgUpdate, 'dependencies', 'devDependencies');
                var pckg = util.readJSON('package.json');
                util.extend(pckg, pckgUpdate);
                util.writeJSON('package.json', pckg);

                // bower
                var bowerUpdate = util.readTplJSON('configs/_bower.json', vars);
                bowerUpdate = this._.omit(bowerUpdate, 'dependencies', 'devDependencies', 'keywords', 'ignore');
                var bower = util.readJSON('bower.json');
                bower.keywords = vars.appKeywords.split(/,\s*/);
                util.extend(bower, bowerUpdate);
                util.writeJSON('bower.json', bower);

                // composer
                var composerUpdate = util.readTplJSON('configs/_composer.json', vars);
                composerUpdate = this._.omit(composerUpdate, 'require', 'requireDev', 'suggest', 'autoload');
                var composer = util.readJSON('composer.json');
                util.extend(composer, composerUpdate);
                var phpDeps = {};
                for(var dep in vars.chaykaFrameworkDeps){
                    var phpDep = framework[dep].packagist;
                    phpDeps[phpDep] = 'dev-master';
                }
                var depsField = vars.chaykaFramework === 'external' ? 'suggest':'require';
                util.extend(composer[depsField], phpDeps);
                util.writeJSON('composer.json', composer);

                // app headers
                if(vars.appType === 'plugin'){
                    var initCode = util.readDst(vars.appName + '.wpp.php')
                        .replace(/^\s*<\?php\s*\/\*\*(\s*\n\s*\*[^\n]*)*\s*\*\//, '<?php\n' + util.readTpl('configs/header-plugin.xphp', vars));
                    util.write(vars.appName + '.wpp.php', initCode);
                }else{  // theme or child theme
                    util.copy(
                        vars.parentTheme?'configs/header-child-theme.xcss':'configs/header-theme.xcss',
                        'res/src/theme-header.css',
                        vars
                    );
                }

            }
        },

        updateCode: function(){
            // var g = this;
            var vars = promptAnswers;
            if(vars.wizard === 'update-code'){
                var appFile = vars.appClass + '.php';
                var appCode = util.readDst(appFile);

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

                if(this.options.externalEmbeddings){
                    this.options.externalEmbeddings.forEach(function(item){
                        if(item.file === appFile){
                            switch(item.mode){
                                case 'html':
                                    appCode = util.insertAtHtmlComment(item.marker, appCode, item.insert, item.replace);
                                    break;
                                case 'curly':
                                    appCode = util.insertAtSlashStarComment(item.marker, appCode, item.insert, item.replace);
                                    break;
                                case 'bracket':
                                    appCode = util.insertBeforeClosingBracket(appCode, item.insert);
                                    break;
                            }
                        }
                    });
                }

                // this.log(appCode);

                util.write(appFile, appCode);
            }
        },

        initIdea: function(){
            var g = this;
            var vars = promptAnswers;
            if(vars.ideaInit){
                var configCode;
                var configPath = '.idea/' + vars.ideaProject + '.iml';
                if(!g.appExists || vars.wizard === 'init-idea'){
                    
                    configCode = util.readTpl('idea/ideaProject.iml');
                    if(vars.chaykaFramework === 'external'){
                        configCode = this.ensureIdeaPhpIncludePath(configCode, vars.chaykaFrameworkDeps);
                    }
                    util.write(configPath, configCode);
                    util.mkdir('.idea');
                    util.copy('idea/.name', '.idea/.name', vars);
                    util.copy('idea/deployment.xml', '.idea/deployment.xml', vars);
                    util.copy('idea/modules.xml', '.idea/modules.xml', vars);
                    util.copy('idea/php.xml', '.idea/php.xml');
                    if(vars.gitInit){
                        util.copy('idea/vcs.xml', '.idea/vcs.xml');
                    }
                }else if(vars.wizard === 'update-configs' && vars.chaykaFramework === 'external'){
                    configCode = util.readDst(configPath);
                    configCode = this.ensureIdeaPhpIncludePath(configCode, vars.chaykaFrameworkDeps);
                    util.write(configPath, configCode);
                }
            }
        },

        saveConfig: function(){
            delete promptAnswers.wizard;
            delete promptAnswers.ideaInit;
            this.config.set(promptAnswers);
        }
    },

    install: function() {
        var g = this;
        var vars = promptAnswers;
        if (!this.options['skip-install'] && !g.appExists) {
            this.installDependencies({
                skipInstall: this.options['skip-install']
            });

            shelljs.exec('composer install');
            // shelljs.exec('grunt');
            this.spawnCommand('grunt');
        }

        if (vars.gitInit && !util.pathExists('.git')) {
            shelljs.exec('git init');
            shelljs.exec('git add .');
            shelljs.exec('git commit -m "first commit"');
        }
        if (vars.gitRemoteRepo && util.pathExists('.git/config') && util.readDst('.git/config').indexOf(vars.gitRemoteRepo) > -1) {
            shelljs.exec('git remote add origin ' + vars.gitRemoteRepo);
            if (vars.gitPush) {
                shelljs.exec('git push -u origin master');
            }
        }

    }
});