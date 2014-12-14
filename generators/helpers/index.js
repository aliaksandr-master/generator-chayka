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