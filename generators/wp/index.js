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

        this.generateOptionsFormField = function(){
            var prompts = [
                {
                    name: 'fieldType',
                    type: 'list',
                    message: 'Generate field?',
                    default: 'input',
                    choices: [
                        {name: 'input', value: 'input'},
                        {name: 'select', value: 'select'},
                        {name: 'textarea', value: 'textarea'},
                        {name: 'no', value: ''},
                    ]
                },
                {
                    name: 'fieldLabel',
                    message: 'Field label:',
                    validate: this.checkRequired
                },
                {
                    name: 'fieldName',
                    message: 'Field name:',
                    validate: this.checkRequired,
                    default: function(answers){
                        return g._.camelize(answers.fieldLabel.toLowerCase());
                    }
                },
                {
                    name: 'fieldClass',
                    type: 'list',
                    message: 'Field class',
                    default: 'fullsize',
                    choices: [
                        'fullsize', 'stretch',
                    ]
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
                        return answers.fieldClass === 'stretch';
                    }
                },
            ];
            var fieldCode = '';
            this.prompt(prompts, function(answers) {
                fieldCode = g._.template(g.fs.read(g.templatePath('views/admin/input.xphtml')), answers);
                g.log(fieldCode);
                done();
            });
            return fieldCode;
        };

        this.generateOptionsFormField();

        this.Chayka = {
            options: this.readJSON('chayka.json')
        };
    },
    prompting: function() {
        var done = this.async();
        var _ = this._;
        var g = this;
        // Have Yeoman greet the user.
        this.log(yosay('Welcome to the divine ' + chalk.red('Chayka') + ' generator!'));
        var prompts = [{
            name: 'helpers',
            message: 'Please select helpers you need:',
            type: 'checkbox',
            choices: function(){
                return [
                    {
                        name: 'EmailHelper',
                        value: 'email',
                        disabled: fs.existsSync(g.destinationPath('app/helpers/EmailHelper.php'))
                    }, {
                        name: 'NlsHelper',
                        value: 'nls',
                        disabled: fs.existsSync(g.destinationPath('app/helpers/NlsHelper.php'))
                    }, {
                        name: 'OptionHelper',
                        value: 'option',
                        disabled: fs.existsSync(g.destinationPath('app/helpers/OptionHelper.php'))
                    }, 
                ];
            },
            default: 'plugin'
        }, {
            name: 'parentTheme',
            message: 'Parent theme name, if omitted simple (non-child) theme will be created',
            when: function(answers) {
                return answers.appType === 'child-theme';
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

        helpers: function() {
            var vars = this.Chayka.options;
            vars.phpAppClass = vars.appType === 'plugin' ? 'Plugin':'Theme'; 

            if(vars.helpers.indexOf('email') >= 0){
                this.template(
                    this.templatePath('helpers/EmailHelper.xphp'), 
                    this.destinationPath('app/helpers/EmailHelper.php'), 
                    vars
                );

                this.mkdir(this.destinationPath('app/views'));
                this.mkdir(this.destinationPath('app/views/email'));

                this.fs.copy(
                    this.templatePath('views/email/template.xphtml'), 
                    this.destinationPath('app/views/email/template.phtml')
                );
            }

            if(vars.helpers.indexOf('nls') >= 0){
                this.template(
                    this.templatePath('helpers/NlsHelper.xphp'), 
                    this.destinationPath('app/helpers/NlsHelper.php'), 
                    vars
                );

                this.mkdir(this.destinationPath('app/nls'));

                this.fs.copy(
                    this.templatePath('nls/main._.xphp'), 
                    this.destinationPath('app/nls/main._.php')
                );
            }

            if(vars.helpers.indexOf('option') >= 0){
                this.template(
                    this.templatePath('helpers/OptionHelper.xphp'), 
                    this.destinationPath('app/helpers/OptionHelper.php'), 
                    vars
                );
            }

        },

    },
    install: function() {
        
    }
});