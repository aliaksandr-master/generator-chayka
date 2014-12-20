'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
// var shelljs = require('shelljs');
var fs = require('fs');
// console.log(shelljs);
// var strings = require('yeoman-generator/underscore.strings');
module.exports = yeoman.generators.Base.extend({
    initializing: function() {
        var done = this.async();
        this.pkg = require('../../package.json');
        var g = this;

        this.readJSON = function(file) {
            var json = g.fs.read(g.destinationPath(file));
            return JSON.parse(json);
        };

        this.writeJSON = function(file, json) {
            g.fs.write(g.destinationPath(file), JSON.stringify(json, null, 4));
        };

        this.dasherizeName = function(name){
            return this._.dasherize(name).replace(/^-/, '');   
        };

        this.checkRequired = function(value){
            return !!value || 'This field is required';
        };

        this.generateOptionsFormField = function(done){
            var prompts = [
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
                    validate: this.checkRequired,
                    when: function(answers){
                        return !!answers.fieldType;
                    }
                },
                {
                    name: 'fieldName',
                    message: 'Field name:',
                    validate: this.checkRequired,
                    default: function(answers){
                        return g._.camelize(answers.fieldLabel.toLowerCase());
                    },
                    when: function(answers){
                        return !!answers.fieldType;
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
                        return !!answers.fieldType;
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
            this.prompt(prompts, function(answers) {
                fieldCode = '';
                switch(answers.fieldType){
                    case 'input':
                        fieldCode = g._.template(g.fs.read(g.templatePath('views/admin/input.xphtml')), answers);
                        break;
                    case 'select':
                        fieldCode = g._.template(g.fs.read(g.templatePath('views/admin/select.xphtml')), answers);
                        break;
                    case 'textarea':
                        fieldCode = g._.template(g.fs.read(g.templatePath('views/admin/textarea.xphtml')), answers);
                        break;

                }
                done(fieldCode);
            });
            return fieldCode;
        };

        this.generateOptionsFormFields = function(done){
            var fields = '';
            var fieldReady = function(fieldCode){
                if(fieldCode){
                    fields += fieldCode;
                    g.generateOptionsFormField(fieldReady);
                }else{
                    done(fields);
                }
            };

            g.generateOptionsFormField(fieldReady);
        };


        this.Chayka = {
            options: this.readJSON('chayka.json')
        };
        done();
    },
    prompting: function() {
        var done = this.async();
        var _ = this._;
        var g = this;
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
            validate: this.checkRequired,
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
        }];

        this.prompt(prompts, function(answers) {
            if(answers.mechanism === 'console-page'){
                this.generateOptionsFormFields(function(fieldsCode){
                    answers.fields = fieldsCode;
    
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
            // this.writeJSON('chayka.json', this.Chayka.options);
        },

        directories: function() {
            this.mkdir(this.destinationPath('app'));
            this.mkdir(this.destinationPath('app/helpers'));
        },

        consolePage: function() {
            var vars = this.Chayka.options;
            var g = this;
            if(vars.mechanism === 'console-page'){
                this.composeWith('chayka', 
                    {
                        options: {
                            'externalCall': 'enable-console-pages',
                        }
                    }
                );
                var addPageCode = g._.template(g.fs.read(g.templatePath(vars.pageParent?
                    'code/addConsoleSubPage.xphp':
                    'code/addConsolePage.xphp')), vars);
                var appFile = g.destinationPath(vars.appType === 'plugin'?'Plugin.php':'Theme.php');
                var appCode = g.fs.read(appFile);

                /* chayka: registerConsolePages */
                appCode = appCode.replace(/(?:\n)\s*\/\*\s*chayka:\s*registerConsolePages\s*\*\//, function(match){
                    return '\n'+addPageCode + match;
                });

                g.fs.write(appFile, appCode);


                // controller
                this.mkdir(this.destinationPath('app/controllers'));

                var controllerFile = g.destinationPath('app/controllers/AdminController.php');

                if(!fs.existsSync(controllerFile)){
                    this.template(g.templatePath('controllers/AdminController.xphp'), controllerFile, vars);
                }

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
                var viewFile = g.destinationPath('app/views/admin/' + vars.pageSlug + '.phtml');
                var viewCode = fs.existsSync(viewFile)?
                    g.fs.read(viewFile):
                    g._.template(g.fs.read(g.templatePath('views/admin/index.xphtml')), vars);

                viewCode = viewCode.replace(/(?:\n)\s*<!--\s*fields\s*-->/g, function(match){
                    return '\n'+vars.fields + match;
                });
                g.fs.write(viewFile, viewCode);
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
            }
        },

        sidebarWidget: function() {
            var vars = this.Chayka.options;
            if(vars.mechanism === 'sidebar-widget'){
                this.composeWith('chayka', 
                    {
                        options: {
                            'externalCall': 'enable-sidebar-widgets',
                        }
                    }
                );
            }
        },

        // helpers: function() {
        //     var vars = this.Chayka.options;
        //     vars.phpAppClass = vars.appType === 'plugin' ? 'Plugin':'Theme'; 

        //     if(vars.helpers.indexOf('email') >= 0){
        //         this.template(
        //             this.templatePath('helpers/EmailHelper.xphp'), 
        //             this.destinationPath('app/helpers/EmailHelper.php'), 
        //             vars
        //         );

        //         this.mkdir(this.destinationPath('app/views'));
        //         this.mkdir(this.destinationPath('app/views/email'));

        //         this.fs.copy(
        //             this.templatePath('views/email/template.xphtml'), 
        //             this.destinationPath('app/views/email/template.phtml')
        //         );
        //     }

        //     if(vars.helpers.indexOf('nls') >= 0){
        //         this.template(
        //             this.templatePath('helpers/NlsHelper.xphp'), 
        //             this.destinationPath('app/helpers/NlsHelper.php'), 
        //             vars
        //         );

        //         this.mkdir(this.destinationPath('app/nls'));

        //         this.fs.copy(
        //             this.templatePath('nls/main._.xphp'), 
        //             this.destinationPath('app/nls/main._.php')
        //         );
        //     }

        //     if(vars.helpers.indexOf('option') >= 0){
        //         this.template(
        //             this.templatePath('helpers/OptionHelper.xphp'), 
        //             this.destinationPath('app/helpers/OptionHelper.php'), 
        //             vars
        //         );
        //     }

        // },

    },
    install: function() {
        
    }
});