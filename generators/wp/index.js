'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
// var shelljs = require('shelljs');
// var fs = require('fs');
var utils = require('../utils'), util = null;
var promptAnswers = {};
// console.log(utils);
// var strings = require('yeoman-generator/underscore.strings');
module.exports = yeoman.generators.Base.extend({
    initializing: function() {
        var done = this.async();
        this.pkg = require('../../package.json');
        var g = this;
        util = utils(g);

        /**
         * Generate form field code using answers from inquirer API
         * @param {'metabox'|'console-page'|'widget'} mode
         * @param callback
         * @returns {string}
         */
        this.generateFormField = function(mode, callback){
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
                        {name: 'textarea', value: 'textarea'}
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
                        return util.camelize(answers.fieldLabel.toLowerCase());
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
                        'fullsize', 'stretch'
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
                        'width90'
                    ],
                    when: function(answers){
                        if(answers.fieldClass === 'fullsize'){
                            answers.labelClass = '';
                        }
                        return !!answers.fieldType && answers.fieldClass === 'stretch';
                    }
                }
            ];

            var fieldCode = '';

            g.prompt(fieldPrompts, function(answers) {
                fieldCode = '';
                switch(answers.fieldType){
                    case 'input':
                        fieldCode = util.readTpl('views/' + mode + '/input.xphtml', answers);
                        callback(fieldCode, answers);
                        break;
                    case 'textarea':
                        fieldCode = util.readTpl('views/' + mode + '/textarea.xphtml', answers);
                        callback(fieldCode, answers);
                        break;
                    case 'select':
                        util.promptPairs('Generate options?', 'One more option?', 'Option label:', 'Option value:', null, 'slugify', function(pairs){
                            answers.fieldOptions = g._.invert(pairs);
                            fieldCode = util.readTpl('views/' + mode + '/select.xphtml', answers);
                            
                            if(mode !== 'admin'){
                                var optionsCode = '';
                                var optionsTpl = util.readTpl('views/' + mode + '/select.options.xphtml');
                                for(var label in pairs){
                                    var value = pairs[label];
                                    optionsCode += util.template(optionsTpl, {label: label, value: value});
                                }
                                fieldCode = util.insertAtSlashStarComment('options', fieldCode, optionsCode, true);
                            }

                            callback(fieldCode, answers);
                        });
                        break;
                    default:
                        callback(fieldCode, answers);
                }
            });
            return fieldCode;
        };

        /**
         * Generate form fields code using answers from inquirer API
         * @param mode
         * @param callback
         */
        this.generateFormFields = function(mode, callback){
            var fieldsCode = '';
            var fields = [];
            var fieldReady = function(fieldCode, field){
                if(fieldCode){
                    fieldsCode += fieldCode;
                    fields.push(field);
                    g.generateFormField(mode, fieldReady);
                }else{
                    callback(fieldsCode, fields);
                }
            };

            g.generateFormField(mode, fieldReady);
        };

        done();
    },

    prompting: function() {
        var done = this.async();
        // var _ = this._;
        var g = this;
        var vars = this.config.getAll();

        // Have Yeoman greet the user.
        this.log(yosay('Welcome to the divine ' + chalk.red('Chayka') + ' generator!'));
        var prompts = [{
            name: 'mechanism',
            message: 'Please select mechanism you need to generate:',
            type: 'list',
            choices: function(){
                return [
                    {
                        name: 'Console Page',
                        value: 'console-page'
                    }, {
                        name: 'Metabox',
                        value: 'metabox'
                    }, {
                        name: 'Sidebar Widget',
                        value: 'sidebar-widget'
                    }, {
                        name: 'Shortcode',
                        value: 'shortcode'
                    }
                ];
            },
            default: ''
        }, 
            /* Console Pages */
        {
            name: 'existing',
            message: 'Update existing or create new one?',
            type: 'list',
            choices: function(answers){
                var existingFolder,
                    choices = [
                        {
                            name: '-= new =-',
                            value: ''
                        }
                    ],
                    files = [];
                switch(answers.mechanism){
                    case 'console-page':
                        existingFolder = 'app/views/admin';
                        break;
                    case 'metabox':
                        existingFolder = 'app/views/metabox';
                        break;
                    case 'sidebar-widget':
                        existingFolder = 'app/views/sidebar';
                        break;
                }
                if(util.pathExists(existingFolder)) {
                    files = util.readDirDst(existingFolder) || [];
                }
                files.forEach(function(file){
                    choices.push({
                        name: file.replace(/\.phtml$/, ''),
                        value: existingFolder + '/' + file
                    });
                });

                return choices;
            },
            default: function(){
                return '';
            },
            when: function(answers) {
                return answers.mechanism !== 'shortcode';
            }
        }, {
            name: 'pageTitle',
            message: 'Console Page Title',
            validate: util.checkRequired,
            when: function(answers) {
                return answers.mechanism === 'console-page' && !answers.existing;
            }
        }, {
            name: 'pageSlug',
            message: 'Console Page Slug',
            default: function(answers){
                return util.slugify(answers.pageTitle);
            },
            when: function(answers) {
                return answers.mechanism === 'console-page' && !answers.existing;
            }
        }, {
            name: 'pageParent',
            message: 'Parent console page slug, if omitted simple (non-subpage) page will be created',
            when: function(answers) {
                return answers.mechanism === 'console-page' && !answers.existing;
            }
        }, {
            name: 'pageMenuPosition',
            message: 'The position in the menu order the page should appear:',
            type: 'list',
            choices: [
                {value: '5', name:'5 - below Posts'},
                {value: '10', name:'10 - below Media'},
                {value: '15', name:'15 - below Links'},
                {value: '20', name:'20 - below Pages'},
                {value: '25', name:'25 - below Comments'},
                {value: '60', name:'60 - below first separator'},
                {value: '65', name:'65 - below Plugins'},
                {value: '70', name:'70 - below Users'},
                {value: '75', name:'75 - below Tools'},
                {value: '80', name:'80 - below Settings'},
                {value: '100', name:'100 - below second separator'}
            ],
            default: function(){
                return '80';
            },
            when: function(answers) {
                return answers.mechanism === 'console-page' && !answers.pageParent && !answers.existing;
            }
        }, {
            name: 'pageIconUrl',
            message: 'The url to the icon to be used for this menu or the name of the icon from the iconfont\n' + 
                    chalk.cyan('https://developer.wordpress.org/resource/dashicons/#wordpress') + '\n',
            default: function(){
                return 'dashicons-admin-generic';
            },
            when: function(answers) {
                return answers.mechanism === 'console-page' && !answers.pageParent && !answers.existing;
            }
        },

            /* Metaboxes */
        {
            name: 'metaboxTitle',
            message: 'Metabox Title',
            validate: util.checkRequired,
            when: function(answers) {
                return answers.mechanism === 'metabox' && !answers.existing;
            }
        }, {
            name: 'metaboxSlug',
            message: 'Metabox Slug',
            default: function(answers){
                return util.slugify(answers.metaboxTitle);
            },
            when: function(answers) {
                return answers.mechanism === 'metabox' && !answers.existing;
            }
        }, {
            name: 'metaboxContext',
            message: 'Metabox Context:',
            type: 'list',
            choices: ['normal', 'advanced', 'side'],
            when: function(answers) {
                return answers.mechanism === 'metabox' && !answers.existing;
            }
        }, {
            name: 'metaboxPriority',
            message: 'Metabox Priority:',
            type: 'list',
            choices: ['high', 'core', 'default', 'low'],
            when: function(answers) {
                return answers.mechanism === 'metabox' && !answers.existing;
            }
        }, {
            name: 'metaboxPostTypes',
            message: 'Space separated Metabox Post Types (screens), if omited, will be used for all types:',
            when: function(answers) {
                return answers.mechanism === 'metabox' && !answers.existing;
            }
        }, 
            /* Sidebar Widgets */
        {
            name: 'sidebarWidgetTitle',
            message: 'Sidebar Widget Title',
            validate: util.checkRequired,
            when: function(answers) {
                return answers.mechanism === 'sidebar-widget' && !answers.existing;
            }
        }, {
            name: 'sidebarWidgetId',
            message: 'Sidebar Widget ID',
            default: function(answers){
                return util.slugify(answers.sidebarWidgetTitle);
            },
            when: function(answers) {
                return answers.mechanism === 'sidebar-widget' && !answers.existing;
            }
        }, {
            name: 'sidebarWidgetClassname',
            message: 'Sidebar Widget Classname:',
            default: function(answers){
                return util.classify(answers.sidebarWidgetTitle) + 'Widget';
            },
            when: function(answers) {
                return answers.mechanism === 'sidebar-widget' && !answers.existing;
            }
        }, {
            name: 'sidebarWidgetDescription',
            message: 'Sidebar Widget Description:',
            default: function(answers){
                return answers.sidebarWidgetTitle + ' widget by ' + vars.appName + ' ' + vars.appType;
            },
            when: function(answers) {
                return answers.mechanism === 'sidebar-widget' && !answers.existing;
            }
        },
            /* Shortcodes */
        {
            name: 'shortcode',
            message: 'Shortcode name ' + chalk.reset.gray('(underscored)') + ':',
            filter: function(value){
                return util.underscored(value);
            },
            when: function(answers) {
                return answers.mechanism === 'shortcode';
            }
        },
        {
            name: 'isContainer',
            message: 'Need enclosing tag?:',
            type: 'confirm',
            default: function(){
                return false;
            },
            when: function(answers) {
                return answers.mechanism === 'shortcode';
            }
        }
        ];
        try{
            this.prompt(prompts, function(answers) {
                    g.log('prompt ended');
                if(answers.mechanism === 'console-page'){
                    // this.generateOptionsFormFields(function(fieldsCode, fields){
                    this.generateFormFields('admin', function(fieldsCode, fields){
                        g.log('fields generated');
                        answers.fields = fields;
                        answers.fieldsCode = fieldsCode;
        
                        // util.extend(g.Chayka.options, answers);
                        util.extend(promptAnswers, vars, answers);
                        done();
                    });
                }else if(answers.mechanism === 'metabox'){
                    // this.generateMetaboxFormFields(function(fieldsCode, fields){
                    this.generateFormFields('metabox', function(fieldsCode, fields){
                        answers.fields = fields;
                        answers.fieldsCode = fieldsCode;
                        g.log('fields generated');
        
                        // util.extend(g.Chayka.options, answers);
                        util.extend(promptAnswers, vars, answers);
                        g.log('fields generated');
                        done();
                    });
                }else if(answers.mechanism === 'sidebar-widget'){
                    // this.generateSidebarWidgetFormFields(function(fieldsCode, fields){
                    this.generateFormFields('sidebar', function(fieldsCode, fields){
                        answers.fields = fields;
                        answers.fieldsCode = fieldsCode;
        
                        // util.extend(g.Chayka.options, answers);
                        util.extend(promptAnswers, vars, answers);
                        done();
                    });
                }else{
                    util.extend(promptAnswers, vars, answers);
                    // _.extend(this.Chayka.options, answers);
                    done();
                }
            }.bind(this));

        }catch(e){
            g.log(e.stack);
        }
    },
    writing: {
        app: function() {

        },

        directories: function() {
            this.mkdir(this.destinationPath('app'));
            this.mkdir(this.destinationPath('app/helpers'));
        },

        consolePage: function() {
            // var vars = this.Chayka.options;
            var vars = promptAnswers, viewCode;
            // var g = this;
            if(vars.mechanism === 'console-page'){
                if(!vars.existing) {
                    var addPageCode = util.readTpl(vars.pageParent ?
                        'code/addConsoleSubPage.xphp' :
                        'code/addConsolePage.xphp', vars);

                    var appFile = vars.appType === 'plugin' ? 'Plugin.php' : 'Theme.php';

                    var appCode = util.readDst(appFile);

                    if (appCode.indexOf('registerConsolePages') > -1) {
                        /* chayka: registerConsolePages */
                        appCode = util.insertAtSlashStarComment('registerConsolePages', appCode, addPageCode);
                        util.write(appFile, appCode);
                    } else {
                        this.composeWith('chayka',
                            {
                                options: {
                                    'externalCall': 'enable-console-pages',
                                    'externalEmbeddings': [{
                                        'file': appFile,
                                        'marker': 'registerConsolePages',
                                        'mode': 'curly',
                                        'insert': addPageCode
                                    }]
                                }
                            }
                        );
                    }

                    // controller
                    util.mkdir('app/controllers');

                    var controllerFile = 'app/controllers/AdminController.php';

                    // if(!util.pathExists(controllerFile)){
                    //     util.copy('controllers/AdminController.xphp', controllerFile, vars);
                    // }

                    // action
                    this.composeWith('chayka:controller',
                        {
                            options: {
                                'externalCall': {
                                    wizard: 'action',
                                    action: vars.pageSlug,
                                    actionType: 'empty',
                                    actionParams: false,
                                    blockParams: true,
                                    controller: 'AdminController',
                                    controllerTpl: util.readTpl('controllers/AdminController.xphp', vars)
                                }
                            }
                        }
                    );

                    // view
                    var viewFile = 'app/views/admin/' + vars.pageSlug + '.phtml';
                    viewCode = util.readDstOrTpl(viewFile, 'views/admin/index.xphtml', vars);
                    viewCode = util.insertAtHtmlComment('fields', viewCode, vars.fieldsCode);
                    util.write(viewFile, viewCode);

                    // config
                    var consolePages = this.config.get('consolePages');
                    if (!consolePages) {
                        consolePages = [];
                    }
                    if (consolePages.indexOf(vars.pageSlug) === -1) {
                        consolePages.push(vars.pageSlug);
                    }
                    this.config.set('consolePages', consolePages);
                }else{
                    viewCode = util.readDst(vars.existing);
                    viewCode = util.insertAtHtmlComment('fields', viewCode, vars.fieldsCode);
                    util.write(vars.existing, viewCode);
                }
            }

        },

        metabox: function() {
            // var vars = this.Chayka.options;
            var vars = promptAnswers, viewCode;
            if(vars.mechanism === 'metabox'){
                if(!vars.existing) {
                    vars.metaboxScreens = vars.metaboxPostTypes ?
                    'array("' + vars.metaboxPostTypes.split(/[\s,]+/).join('", "') + '")' :
                        'null';
                    var addMetaboxCode = util.readTpl('code/addMetaBox.xphp', vars);
                    var appFile = vars.appType === 'plugin' ? 'Plugin.php' : 'Theme.php';
                    var appCode = util.readDst(appFile);

                    if (appCode.indexOf('registerMetaBoxes') > -1) {
                        /* chayka: registerMetaBoxes */
                        appCode = util.insertAtSlashStarComment('registerMetaBoxes', appCode, addMetaboxCode);
                        util.write(appFile, appCode);
                    } else {
                        this.composeWith('chayka',
                            {
                                options: {
                                    'externalCall': 'enable-metaboxes',
                                    'externalEmbeddings': [{
                                        'file': appFile,
                                        'marker': 'registerMetaBoxes',
                                        'mode': 'curly',
                                        'insert': addMetaboxCode
                                    }]
                                }
                            }
                        );
                    }

                    // controller
                    util.mkdir('app/controllers');

                    var controllerFile = 'app/controllers/MetaboxController.php';

                    if (!util.pathExists(controllerFile)) {
                        util.copy('controllers/MetaboxController.xphp', controllerFile, vars);
                    }

                    // action
                    this.composeWith('chayka:controller',
                        {
                            options: {
                                'externalCall': {
                                    wizard: 'action',
                                    action: vars.metaboxSlug,
                                    actionType: 'empty',
                                    actionParams: false,
                                    blockParams: true,
                                    controller: 'MetaboxController',
                                    controllerTpl: util.readTpl('controllers/MetaboxController.xphp', vars)
                                }
                            }
                        }
                    );

                    // view
                    var viewFile = 'app/views/metabox/' + vars.metaboxSlug + '.phtml';
                    viewCode = util.readDstOrTpl(viewFile, 'views/metabox/index.xphtml', vars);
                    viewCode = util.insertAtHtmlComment('fields', viewCode, vars.fieldsCode);
                    util.write(viewFile, viewCode);

                    // config
                    var metaboxes = this.config.get('metaboxes');
                    if (!metaboxes) {
                        metaboxes = [];
                    }
                    if (metaboxes.indexOf(vars.metaboxSlug) === -1) {
                        metaboxes.push(vars.metaboxSlug);
                    }
                    this.config.set('metaboxes', metaboxes);
                }else{
                    viewCode = util.readDst(vars.existing);
                    viewCode = util.insertAtHtmlComment('fields', viewCode, vars.fieldsCode);
                    util.write(vars.existing, viewCode);
                }
            }

        },

        sidebarWidget: function() {
            // var vars = this.Chayka.options;
            var vars = promptAnswers, formCode, viewCode;
            if(vars.mechanism === 'sidebar-widget'){
                // 5. declare view vars
                var declareCode = '';
                var declareTpl = util.readTpl('views/declareVar.xphtml');
                vars.fields.forEach(function(field){
                    declareCode += util.template(declareTpl, field);
                });

                // 5.a output view vars
                var outputCode = '';
                var outputTpl = util.readTpl('views/outputVar.xphtml');
                vars.fields.forEach(function(field){
                    outputCode += util.template(outputTpl, field);
                });

                if(!vars.existing) {
                    // 1. add require Sidebar.php
                    var functionsFile = vars.appType === 'plugin' ? vars.appName + '.wpp.php' : 'functions.php';
                    var functionsCode = util.readDst(functionsFile);
                    var requireCode = util.readTpl('code/requireSidebar.xphp');
                    if (functionsCode.indexOf('Sidebar.php') === -1) { // check if require Sidebar.php already exists
                        if (vars.initDep) {
                            functionsCode = util.insertBeforeClosingBracket(functionsCode, requireCode);
                        } else {
                            functionsCode += requireCode.trim() + '\n';
                        }
                    }
                    util.write(functionsFile, functionsCode);

                    // 2. add SidbarWidget
                    var widgetClassCode = util.readTpl('code/SidebarWidget.xphp', vars);

                    // 3. ensure Sidebar.php
                    var sidebarFile = 'Sidebar.php';
                    var sidebarCode = '';
                    if (util.pathExists(sidebarFile)) {
                        sidebarCode = util.readDst(sidebarFile);
                    } else {
                        sidebarCode = util.readTpl('code/Sidebar.xphp', vars);
                    }

                    sidebarCode += widgetClassCode;

                    util.write(sidebarFile, sidebarCode);

                    // 4. ensure views dir
                    util.mkdir('app/views');
                    util.mkdir('app/views/sidebar');
                    util.mkdir('app/views/sidebar/' + vars.sidebarWidgetId);

                    // 6. add form
                    formCode = util.readTpl('views/sidebar/form.xphtml');
                    formCode = util.insertAtHtmlComment('fields', formCode, vars.fieldsCode);
                    formCode = util.insertAtSlashStarComment('declareVars', formCode, declareCode);
                    util.write('app/views/sidebar/' + vars.sidebarWidgetId + '/form.phtml', formCode);

                    // 6. add view
                    viewCode = util.readTpl('views/sidebar/widget.xphtml');
                    viewCode = util.insertAtHtmlComment('fields', viewCode, outputCode);
                    viewCode = util.insertAtSlashStarComment('declareVars', viewCode, declareCode);
                    util.write('app/views/sidebar/' + vars.sidebarWidgetId + '/widget.phtml', viewCode);


                    // 7. update config
                    var widgets = this.config.get('widgets');
                    if (!widgets) {
                        widgets = [];
                    }
                    if (widgets.indexOf(vars.sidebarWidgetId) === -1) {
                        widgets.push(vars.sidebarWidgetId);
                    }
                    this.config.set('widgets', widgets);
                }else{
                    // 6. add form
                    formCode = util.readDst(vars.existing + '/form.phtml');
                    formCode = util.insertAtHtmlComment('fields', formCode, vars.fieldsCode);
                    formCode = util.insertAtSlashStarComment('declareVars', formCode, declareCode);
                    util.write(vars.existing + '/form.phtml', formCode);

                    // 6. add view
                    viewCode = util.readDst(vars.existing + '/widget.phtml');
                    viewCode = util.insertAtHtmlComment('fields', viewCode, outputCode);
                    viewCode = util.insertAtSlashStarComment('declareVars', viewCode, declareCode);
                    util.write(vars.existing + '/widget.phtml', viewCode);
                }
            }
        },

        shortcode: function(){
            // var vars = this.Chayka.options;
            var vars = promptAnswers;
            // var g = this;
            if(vars.mechanism === 'shortcode'){

                var registerCode = util.readTpl('code/addShortcode.xphp', vars);

                var appFile = vars.appType === 'plugin'?'Plugin.php':'Theme.php';

                var appCode = util.readDst(appFile);

                if(appCode.indexOf('registerShortcodes') > -1 ){
                    appCode = util.insertAtSlashStarComment('registerShortcodes', appCode, registerCode);
                    util.write(appFile, appCode);
                }else{
                    this.composeWith('chayka', 
                        {
                            options: {
                                'externalCall': 'enable-shortcodes',
                                'externalEmbeddings': [
                                    {
                                        'file': appFile,
                                        'marker': 'registerShortcodes',
                                        'mode': 'curly',
                                        'insert': registerCode
                                    }
                                ]
                            }
                        }
                    );
                }

                this.composeWith('chayka:controller', 
                    {
                        options: {
                            'externalCall': {
                                wizard: 'action',
                                action: vars.shortcode,
                                actionType: 'view',
                                controller: 'ShortcodeController',
                                params: vars.isContainer?{content:''}:{}
                            }
                        }
                    }
                );

                var shortcodes = this.config.get('shortcodes');
                if(!shortcodes){
                    shortcodes = [];                    
                }
                if(shortcodes.indexOf(vars.shortcode) === -1){
                    shortcodes.push(vars.shortcode);   
                }
                this.config.set('shortcodes', shortcodes);
            }
        }

    },

    install: function() {

    }
});