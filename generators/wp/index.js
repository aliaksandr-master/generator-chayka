'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
// var shelljs = require('shelljs');
// var fs = require('fs');
var utils = require('../utils'), util = null;
// console.log(utils);
// var strings = require('yeoman-generator/underscore.strings');
module.exports = yeoman.generators.Base.extend({
    initializing: function() {
        var done = this.async();
        this.pkg = require('../../package.json');
        var g = this;
        util = utils(g);

        this.generateFormField = function(done, mode){
            var fieldPrompts = [
                {
                    name: 'fieldType',
                    type: 'list',
                    message: 'Generate field?',
                    default: 'input',
                    choices: [
                        {name: '-no-', value: ''},
                        {name: 'input', value: 'input'},
                        {name: 'select', value: 'select'},
                        {name: 'textarea', value: 'textarea'},
                    ]
                },
                {
                    name: 'fieldLabel',
                    message: 'Field label:',
                    validate: util.checkRequired,
                    when: function(answers){
                        return !!answers.fieldType;
                    }
                },
                {
                    name: 'fieldName',
                    message: 'Field name:',
                    validate: util.checkRequired,
                    default: function(answers){
                        return g._.camelize(answers.fieldLabel.toLowerCase());
                    },
                    when: function(answers){
                        return !!answers.fieldType;
                    }
                },
                {
                    name: 'fieldDefault',
                    message: 'Field default value:',
                    when: function(answers){
                        return !!answers.fieldType && mode !== 'metabox';
                    }
                },
                {
                    name: 'fieldClass',
                    type: 'list',
                    message: 'Field class',
                    default: 'fullsize',
                    choices: [
                        'fullsize', 'stretch',
                    ],
                    when: function(answers){
                        return !!answers.fieldType && mode !== 'sidebar';
                    }
                },
                {
                    name: 'labelClass',
                    type: 'list',
                    message: 'Label class',
                    default: 'width50',
                    choices: [
                        'width10', 
                        'width20', 
                        'width30', 
                        'width40', 
                        'width50', 
                        'width60', 
                        'width70', 
                        'width80', 
                        'width90', 
                    ],
                    when: function(answers){
                        if(answers.fieldClass === 'fullsize'){
                            answers.labelClass = '';
                        }
                        return !!answers.fieldType && answers.fieldClass === 'stretch';
                    }
                },
            ];

            var fieldCode = '';

            this.prompt(fieldPrompts, function(answers) {
                fieldCode = '';
                switch(answers.fieldType){
                    case 'input':
                        fieldCode = util.readTpl('views/' + mode + '/input.xphtml', answers);
                        // fieldCode = g._.template(g.fs.read(g.templatePath('views/' + mode + '/input.xphtml')), answers);
                        break;
                    case 'select':
                        fieldCode = util.readTpl('views/' + mode + '/select.xphtml', answers);
                        // fieldCode = g._.template(g.fs.read(g.templatePath('views/' + mode + '/select.xphtml')), answers);
                        break;
                    case 'textarea':
                        fieldCode = util.readTpl('views/' + mode + '/textarea.xphtml', answers);
                        // fieldCode = g._.template(g.fs.read(g.templatePath('views/' + mode + '/textarea.xphtml')), answers);
                        break;

                }
                done(fieldCode, answers);
            });
            return fieldCode;
        };

        this.generateOptionsFormFields = function(done){
            var fieldsCode = '';
            var fields = [];
            var fieldReady = function(fieldCode, field){
                if(fieldCode){
                    fieldsCode += fieldCode;
                    fields.push(field);
                    g.generateFormField(fieldReady, 'admin');
                }else{
                    done(fieldsCode, fields);
                }
            };

            g.generateFormField(fieldReady, 'admin');
        };

        this.generateMetaboxFormFields = function(done){
            var fieldsCode = '';
            var fields = [];
            var fieldReady = function(fieldCode, field){
                if(fieldCode){
                    fieldsCode += fieldCode;
                    fields.push(field);
                    g.generateFormField(fieldReady, 'metabox');
                }else{
                    done(fieldsCode, fields);
                }
            };

            g.generateFormField(fieldReady, 'metabox');
        };

        this.generateSidebarWidgetFormFields = function(done){
            var fieldsCode = '';
            var fields = [];
            var fieldReady = function(fieldCode, field){
                if(fieldCode){
                    fieldsCode += fieldCode;
                    fields.push(field);
                    g.generateFormField(fieldReady, 'sidebar');
                }else{
                    done(fieldsCode, fields);
                }
            };

            g.generateFormField(fieldReady, 'sidebar');
        };

        this.Chayka = {
            options: util.readJSON('chayka.json')
        };

        done();
    },
    prompting: function() {
        var done = this.async();
        var _ = this._;
        var g = this;
        var vars = this.Chayka.options;

        // Have Yeoman greet the user.
        this.log(yosay('Welcome to the divine ' + chalk.red('Chayka') + ' generator!'));
        var prompts = [{
            name: 'mechanism',
            message: 'Please select mechanism you need to generate:',
            type: 'list',
            choices: function(){
                return [
                    {
                        name: 'Metabox',
                        value: 'metabox',
                    }, {
                        name: 'Console Page',
                        value: 'console-page',
                    }, {
                        name: 'Sidebar Widget',
                        value: 'sidebar-widget',
                    }, {
                        name: 'Shortcode',
                        value: 'shortcode',
                    }, {
                        name: 'Custom Post Type',
                        value: 'post-type',
                    }, {
                        name: 'Taxonomy',
                        value: 'taxonomy',
                    }, 
                ];
            },
            default: ''
        }, {
            name: 'pageTitle',
            message: 'Console Page Title',
            validate: util.checkRequired,
            when: function(answers) {
                return answers.mechanism === 'console-page';
            }
        }, {
            name: 'pageSlug',
            message: 'Console Page Slug',
            default: function(answers){
                return g._.slugify(answers.pageTitle);
            },
            when: function(answers) {
                return answers.mechanism === 'console-page';
            }
        }, {
            name: 'pageParent',
            message: 'Parent console page slug, if omitted simple (non-subpage) page will be created',
            when: function(answers) {
                return answers.mechanism === 'console-page';
            }
        }, {
            name: 'metaboxTitle',
            message: 'Metabox Title',
            validate: util.checkRequired,
            when: function(answers) {
                return answers.mechanism === 'metabox';
            }
        }, {
            name: 'metaboxSlug',
            message: 'Metabox Slug',
            default: function(answers){
                return g._.slugify(answers.metaboxTitle);
            },
            when: function(answers) {
                return answers.mechanism === 'metabox';
            }
        }, {
            name: 'metaboxContext',
            message: 'Metabox Context:',
            type: 'list',
            choices: ['normal', 'advanced', 'side'],
            when: function(answers) {
                return answers.mechanism === 'metabox';
            }
        }, {
            name: 'metaboxPriority',
            message: 'Metabox Priority:',
            type: 'list',
            choices: ['high', 'core', 'default', 'low'],
            when: function(answers) {
                return answers.mechanism === 'metabox';
            }
        }, {
            name: 'metaboxPostTypes',
            message: 'Space separated Metabox Post Types (screens), if omited, will be used for all types:',
            when: function(answers) {
                return answers.mechanism === 'metabox';
            }
        }, {
            name: 'sidebarWidgetTitle',
            message: 'Sidebar Widget Title',
            validate: util.checkRequired,
            when: function(answers) {
                return answers.mechanism === 'sidebar-widget';
            }
        }, {
            name: 'sidebarWidgetId',
            message: 'Sidebar Widget ID',
            default: function(answers){
                return g._.slugify(answers.sidebarWidgetTitle);
            },
            when: function(answers) {
                return answers.mechanism === 'sidebar-widget';
            }
        }, {
            name: 'sidebarWidgetClassname',
            message: 'Sidebar Widget Classname:',
            default: function(answers){
                return g._.classify(answers.sidebarWidgetTitle) + 'Widget';
            },
            when: function(answers) {
                return answers.mechanism === 'sidebar-widget';
            }
        }, {
            name: 'sidebarWidgetDescription',
            message: 'Sidebar Widget Description:',
            default: function(answers){
                return answers.sidebarWidgetTitle + ' widget by ' + vars.appName + ' ' + vars.appType;
            },
            when: function(answers) {
                return answers.mechanism === 'sidebar-widget';
            }
        }];

        this.prompt(prompts, function(answers) {
            if(answers.mechanism === 'console-page'){
                this.generateOptionsFormFields(function(fieldsCode, fields){
                    answers.fields = fields;
                    answers.fieldsCode = fieldsCode;
    
                    _.extend(g.Chayka.options, answers);
                    done();
                });
            }else if(answers.mechanism === 'metabox'){
                this.generateMetaboxFormFields(function(fieldsCode, fields){
                    answers.fields = fields;
                    answers.fieldsCode = fieldsCode;
    
                    _.extend(g.Chayka.options, answers);
                    done();
                });
            }else if(answers.mechanism === 'sidebar-widget'){
                this.generateSidebarWidgetFormFields(function(fieldsCode, fields){
                    answers.fields = fields;
                    answers.fieldsCode = fieldsCode;
    
                    _.extend(g.Chayka.options, answers);
                    done();
                });
            }else{
                _.extend(this.Chayka.options, answers);
                done();
            }
        }.bind(this));
    },
    writing: {
        app: function() {

        },

        directories: function() {
            this.mkdir(this.destinationPath('app'));
            this.mkdir(this.destinationPath('app/helpers'));
        },

        consolePage: function() {
            var vars = this.Chayka.options;
            // var g = this;
            if(vars.mechanism === 'console-page'){
                this.composeWith('chayka', 
                    {
                        options: {
                            'externalCall': 'enable-console-pages',
                        }
                    }
                );
                var appPageCode = util.readTpl(vars.pageParent?
                    'code/addConsoleSubPage.xphp':
                    'code/addConsolePage.xphp', vars);
                // var addPageCode = g._.template(g.fs.read(g.templatePath(vars.pageParent?
                //     'code/addConsoleSubPage.xphp':
                //     'code/addConsolePage.xphp')), vars);
                var appFile = vars.appType === 'plugin'?'Plugin.php':'Theme.php';
                // var appFile = g.destinationPath(vars.appType === 'plugin'?'Plugin.php':'Theme.php');
                var appCode = util.readDst(appFile);
                // var appCode = g.fs.read(appFile);

                /* chayka: registerConsolePages */
                appCode = util.insertAtSlashStarComment('registerConsolePages', appCode, appPageCode);
                // appCode = appCode.replace(/(?:\n)\s*\/\*\s*chayka:\s*registerConsolePages\s*\*\//, function(match){
                //     return '\n' + addPageCode + match;
                // });

                util.write(appFile, appCode);
                // g.fs.write(appFile, appCode);


                // controller
                util.mkdir('app/controllers');
                // this.mkdir(this.destinationPath('app/controllers'));

                var controllerFile = 'app/controllers/AdminController.php';
                // var controllerFile = g.destinationPath('app/controllers/AdminController.php');

                if(!util.pathExists(controllerFile)){
                    util.copy('controllers/AdminController.xphp', controllerFile, vars);
                }
                // if(!fs.existsSync(controllerFile)){
                //     this.template(g.templatePath('controllers/AdminController.xphp'), controllerFile, vars);
                // }

                // action
                this.composeWith('chayka:mvc', 
                    {
                        options: {
                            'externalCall': {
                                wizard: 'action',
                                action: vars.pageSlug,
                                actionType: 'api',
                                actionDummy: false,
                                controllerFile: 'AdminController.php',
                            },
                        }
                    }
                );

                // view
                var viewFile = 'app/views/admin/' + vars.pageSlug + '.phtml';
                // var viewFile = g.destinationPath('app/views/admin/' + vars.pageSlug + '.phtml');
                var viewCode = util.pathExists(viewFile)?
                    util.readDst(viewFile):
                    util.readTpl('views/admin/index.xphtml', vars);
                // var viewCode = fs.existsSync(viewFile)?
                //     g.fs.read(viewFile):
                //     g._.template(g.fs.read(g.templatePath('views/admin/index.xphtml')), vars);

                viewCode = util.insertAtHtmlComment('fields', viewCode, vars.fieldsCode);
                // viewCode = viewCode.replace(/(?:\n)\s*<!--\s*fields\s*-->/g, function(match){
                //     return '\n'+vars.fieldsCode + match;
                // });
                util.write(viewFile, viewCode);
                // g.fs.write(viewFile, viewCode);
            }
        },

        metabox: function() {
            var vars = this.Chayka.options;
            if(vars.mechanism === 'metabox'){
                this.composeWith('chayka', 
                    {
                        options: {
                            'externalCall': 'enable-metaboxes',
                        }
                    }
                );
                vars.metaboxScreens = vars.metaboxPostTypes?
                    'array("' + vars.metaboxPostTypes.split(/[\s,]+/).join('", "') + '")':
                    'null';
                var addMetaboxCode = util.readTpl('code/addMetaBox.xphp', vars);
                var appFile = vars.appType === 'plugin'?'Plugin.php':'Theme.php';
                var appCode = util.readDst(appFile);
                // var addMetaboxCode = g._.template(g.fs.read(g.templatePath('code/addMetaBox.xphp')), vars);
                // var appFile = g.destinationPath(vars.appType === 'plugin'?'Plugin.php':'Theme.php');
                // var appCode = g.fs.read(appFile);

                /* chayka: registerMetaBoxes */
                appCode = util.insertAtSlashStarComment('registerMetaBoxes', appCode, addMetaboxCode);
                // appCode = appCode.replace(/(?:\n)\s*\/\*\s*chayka:\s*registerMetaBoxes\s*\*\//, function(match){
                //     return '\n' + addMetaboxCode + match;
                // });

                util.write(appFile, appCode);
                // g.fs.write(appFile, appCode);


                // controller
                util.mkdir('app/controllers');
                // this.mkdir(this.destinationPath('app/controllers'));

                var controllerFile = 'app/controllers/MetaboxController.php';
                // var controllerFile = g.destinationPath('app/controllers/MetaboxController.php');

                if(!util.pathExists(controllerFile)){
                    util.copy('controllers/MetaboxController.xphp', controllerFile, vars);
                }
                // if(!fs.existsSync(controllerFile)){
                //     this.template(g.templatePath('controllers/MetaboxController.xphp'), controllerFile, vars);
                // }

                // action
                this.composeWith('chayka:mvc', 
                    {
                        options: {
                            'externalCall': {
                                wizard: 'action',
                                action: vars.metaboxSlug,
                                actionType: 'api',
                                actionDummy: false,
                                controllerFile: 'MetaboxController.php',
                            },
                        }
                    }
                );

                // view
                var viewFile = 'app/views/metabox/' + vars.metaboxSlug + '.phtml';
                var viewCode = util.pathExists(viewFile)?
                    util.readDst(viewFile):
                    util.readTpl('views/metabox/index.xphtml', vars);

                viewCode = util.insertAtHtmlComment('fields', viewCode, vars.fieldsCode);
                utils.write(viewFile, viewCode);
                // var viewFile = g.destinationPath('app/views/metabox/' + vars.metaboxSlug + '.phtml');
                // var viewCode = fs.existsSync(viewFile)?
                //     g.fs.read(viewFile):
                //     g._.template(g.fs.read(g.templatePath('views/metabox/index.xphtml')), vars);

                // viewCode = viewCode.replace(/(?:\n)\s*<!--\s*fields\s*-->/g, function(match){
                //     return '\n'+vars.fieldsCode + match;
                // });
                // g.fs.write(viewFile, viewCode);
            }
        },

        sidebarWidget: function() {
            var vars = this.Chayka.options;
            if(vars.mechanism === 'sidebar-widget'){
                // 1. add require Sidebar.php
                var functionsFile = vars.appType === 'plugin' ? vars.appName + '.wpp.php':'functions.php';
                var functionsCode = util.readDst(functionsFile);
                var requireCode = util.readTpl('code/requireSidebar.xphp');
                if(functionsCode.indexOf('Sidebar.php') === -1){ // check if require Sidebar.php already exists
                    if(vars.initDep){
                        functionsCode = util.insertBeforeClosingBracket(functionsCode, requireCode);
                    }else{
                        functionsCode += requireCode.trim() + '\n';
                    }
                }
                util.write(functionsFile, functionsCode);
                // var functionsFile = g.destinationPath( vars.appType === 'plugin' ? vars.appName + '.wpp.php':'functions.php');
                // var functionsCode = g.fs.read(functionsFile);
                // var requireCode = g.fs.read(g.templatePath('code/requireSidebar.xphp'));
                // if(functionsCode.indexOf('Sidebar.php') === -1){ // check if require Sidebar.php already exists
                //     if(vars.initDep){
                //         functionsCode = functionsCode.replace(/}\s*$/, requireCode + '\n}');
                //     }else{
                //         functionsCode += requireCode.trim() + '\n';
                //     }
                // }
                // g.fs.write(functionsFile, functionsCode);

                // 2. add SidbarWidget
                var widgetClassCode = util.readTpl('code/SidebarWidget.xphp', vars);
                // var widgetClassCode = g._.template(g.fs.read(g.templatePath('code/SidebarWidget.xphp')), vars);

                // 3. ensure Sidebar.php
                var sidebarFile = 'Sidebar.php';
                var sidebarCode = '';
                if(util.pathExists(sidebarFile)){
                    sidebarCode = util.readDst(sidebarFile);
                }else{
                    sidebarCode = util.readTpl('code/Sidebar.xphp', vars);
                }

                sidebarCode += widgetClassCode;

                util.write(sidebarFile, sidebarCode);
                // var sidebarFile = g.destinationPath('Sidebar.php');
                // var sidebarCode = '';
                // if(fs.existsSync(sidebarFile)){
                //     sidebarCode = g.fs.read(sidebarFile);
                // }else{
                //     sidebarCode = g._.template(g.fs.read(g.templatePath('code/Sidebar.xphp')), vars);
                // }

                // sidebarCode += widgetClassCode;

                // g.fs.write(sidebarFile, sidebarCode);

                // 4. ensure views dir
                util.mkdir('app/views');
                util.mkdir('app/views/sidebar');
                util.mkdir('app/views/sidebar/' + vars.sidebarWidgetId);
                // g.mkdir(g.destinationPath('app/views'));
                // g.mkdir(g.destinationPath('app/views/sidebar'));
                // g.mkdir(g.destinationPath('app/views/sidebar/' + vars.sidebarWidgetId));

                // 5. declare view vars
                var declareCode = '';
                var declareTpl = util.readTpl('views/sidebar/declareVars.xphtml');
                vars.fields.forEach(function(field){
                    declareCode += util.template(declareTpl, field);
                });
                // var declareTpl = g.fs.read(g.templatePath('views/sidebar/declareVars.xphtml'));
                // vars.fields.forEach(function(field){
                //     declareCode += g._.template(declareTpl, field);
                // });

                // 6. add form
                var formCode = util.readTpl('views/sidebar/form.xphtml');
                // var formCode = g.fs.read(g.templatePath('views/sidebar/form.xphtml'));
                formCode = util.insertAtHtmlComment('fields', formCode, vars.fieldsCode);
                formCode = util.insertAtSlashStarComment('declareVars', formCode, declareCode);
                // formCode = formCode.replace(/(?:\n)\s*<!--\s*fields\s*-->/g, function(match){
                //     return '\n'+vars.fieldsCode + match;
                // }).replace(/(?:\n)\s*\/\*\s*chayka:\s*declareVars\s*\*\//, function(match){
                //     return (declareCode?'\n'+declareCode:'') + match;
                // });
                util.write('app/views/sidebar/' + vars.sidebarWidgetId + '/form.phtml', formCode);
                // g.fs.write(g.destinationPath('app/views/sidebar/' + vars.sidebarWidgetId + '/form.phtml'), formCode);

                // 6. add view
                var viewCode = util.readTpl('views/sidebar/widget.xphtml');
                // var viewCode = g.fs.read(g.templatePath('views/sidebar/widget.xphtml'));
                viewCode = util.insertAtSlashStarComment('declareVars', viewCode, declareCode);
                // viewCode = viewCode.replace(/(?:\n)\s*\/\*\s*chayka:\s*declareVars\s*\*\//, function(match){
                //     return (declareCode?'\n'+declareCode:'') + match;
                // });
                util.write('app/views/sidebar/' + vars.sidebarWidgetId + '/widget.phtml', viewCode);
                // g.fs.write(g.destinationPath('app/views/sidebar/' + vars.sidebarWidgetId + '/widget.phtml'), viewCode);
            }
        },


    },
    install: function() {
        
    }
});