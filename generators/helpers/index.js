'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
// var shelljs = require('shelljs');
// var fs = require('fs');
var utils = require('../utils'), util = null;
var promptAnswers = {};
// console.log(shelljs);
// var strings = require('yeoman-generator/underscore.strings');
module.exports = yeoman.generators.Base.extend({
    initializing: function() {
        this.pkg = require('../../package.json');
        util = utils(this);
        this.config.defaults({
            'helpers': [],
        });

        // this.Chayka = {
        //     options: util.readJSON('chayka.json')
        // };
    },
    prompting: function() {
        var done = this.async();
        // var _ = this._;
        // var g = this;
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
                        disabled: util.pathExists('app/helpers/EmailHelper.php')
                        // disabled: fs.existsSync(g.destinationPath('app/helpers/EmailHelper.php'))
                    }, {
                        name: 'NlsHelper',
                        value: 'nls',
                        disabled: util.pathExists('app/helpers/NlsHelper.php')
                    }, {
                        name: 'OptionHelper',
                        value: 'option',
                        disabled: util.pathExists('app/helpers/OptionHelper.php')
                    }, 
                ];
            },
            default: 'plugin'
        }];

        this.prompt(prompts, function(answers) {
            util.extend(promptAnswers, this.config.getAll(), answers);
            // util.extend(this.Chayka.options, props);
            // _.extend(this.Chayka.options, props);
            // this.log(this.Chayka.options);

            done();
        }.bind(this));
    },
    writing: {
        app: function() {
            // this.writeJSON('chayka.json', this.Chayka.options);
        },

        directories: function() {
            util.mkdir('app');
            util.mkdir('app/helpers');
        },

        helpers: function() {
            var vars = promptAnswers;
            var helpers = this.config.get('helpers');
            vars.phpAppClass = vars.appType === 'plugin' ? 'Plugin':'Theme'; 

            if(vars.helpers.indexOf('email') >= 0){
                util.copy(
                    'helpers/EmailHelper.xphp', 
                    'app/helpers/EmailHelper.php', 
                    vars
                );

                util.mkdir('app/views');
                util.mkdir('app/views/email');

                util.copy(
                    'views/email/template.xphtml', 
                    'app/views/email/template.phtml'
                );

                if(helpers.indexOf('email') === -1){
                    helpers.push('email');
                }
            }

            if(vars.helpers.indexOf('nls') >= 0){
                util.copy(
                    'helpers/NlsHelper.xphp', 
                    'app/helpers/NlsHelper.php', 
                    vars
                );

                util.mkdir('app/nls');

                util.copy(
                    'nls/main._.xphp', 
                    'app/nls/main._.php'
                );
                if(helpers.indexOf('nls') === -1){
                    helpers.push('nls');
                }
            }

            if(vars.helpers.indexOf('option') >= 0){
                util.copy(
                    'helpers/OptionHelper.xphp', 
                    'app/helpers/OptionHelper.php', 
                    vars
                );
                if(helpers.indexOf('option') === -1){
                    helpers.push('option');
                }
            }

            this.config.set('helpers', helpers);
        },

    },
    install: function() {

    }
});