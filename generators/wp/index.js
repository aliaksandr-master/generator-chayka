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
            default: function(answers){
                return g._.camelize(answers.fieldLabel.toLowerCase());
            },
            when: function(answers) {
                return answers.mechanism === 'console-page';
            }
        }, {
            name: 'pageName',
            message: 'Console Page ID',
            default: function(answers){
                return g._.camelize(answers.pageTitle.toLowerCase());
            },
            when: function(answers) {
                return answers.mechanism === 'console-page';
            }
        }, {
            name: 'parentPage',
            message: 'Parent console page name, if omitted simple (non-subpage) page will be created',
            when: function(answers) {
                return answers.appType === 'console-page';
            }
        }];

        this.prompt(prompts, function(props) {
            _.extend(this.Chayka.options, props);
            this.log(this.Chayka.options);

            done();
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