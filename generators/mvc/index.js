'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var utils = require('../utils'), util = null;
// var shelljs = require('shelljs');
// var fs = require('fs');
// console.log(shelljs);
// var strings = require('yeoman-generator/underscore.strings');
module.exports = yeoman.generators.Base.extend({
    initializing: function() {
        this.pkg = require('../../package.json');
        util = utils(this);

        this.Chayka = {
            options: util.readJSON('chayka.json')
        };
    },
    prompting: function() {
        var done = this.async();
        // this.log(_);
        // Have Yeoman greet the user.
        var prompts = [{
            name: 'wizard',
            message: 'Please select wizard',
            type: 'list',
            choices: [
                {
                    name: 'Add ' + chalk.green('Controller'),
                    value: 'controller'
                }, {
                    name: 'Add ' + chalk.green('Action'),
                    value: 'action'
                }, {
                    name: 'Add ' + chalk.green('Model'),
                    value: 'model'
                }, 
            ],
            default: 'controller'
        }, {
            name: 'controller',
            message: 'Controller name:',
            default: 'SomeController',
            when: function(answers) {
                return answers.wizard === 'controller';
            }
        }, {
            name: 'controllerFile',
            message: 'Select controller:',
            type: 'list',
            choices: function(){
                return util.readDirDst('app/controllers'); 
            },
            when: function(answers) {
                return answers.wizard === 'action';
            }
        }, {
            name: 'action',
            message: 'Action name:',
            type: 'input',
            default: 'someAction',
            when: function(answers) {
                return answers.wizard === 'action';
            }
        }, {
            name: 'actionType',
            message: 'Action type:',
            type: 'list',
            default: 'view',
            choices: [
                {name: 'API', value: 'api'},
                {name: 'View', value: 'view'}
            ],
            when: function(answers) {
                return answers.wizard === 'action';
            }
        }, {
            name: 'actionDummy',
            message: 'Put some dummy handy code?',
            type: 'confirm',
            when: function(answers) {
                return answers.wizard === 'action';
            }
        }, {
            name: 'model',
            message: 'Model name:',
            type: 'input',
            default: 'DummyModel',
            when: function(answers) {
                return answers.wizard === 'model';
            }
        }, {
            name: 'dbTable',
            message: 'DB table name:',
            type: 'input',
            default: function(answers){
                var table = util.underscored(answers.model.replace(/Model$/, '').replace(/y$/, 'ie') + 's');
                return table;
            },
            when: function(answers) {
                return answers.wizard === 'model';
            }
        }, {
            name: 'dbIdColumn',
            message: 'DB table id column:',
            type: 'input',
            default: function(answers){
                var table = util.underscored(answers.model.replace(/Model$/, '')) + '_id';
                return table;
            },
            when: function(answers) {
                return answers.wizard === 'model';
            }
        }];
        var vars = this.Chayka.options;
        if(this.options.externalCall){
            util.extend(vars, this.options.externalCall);
            done();
        }else{
            this.log(yosay('Welcome to the divine ' + chalk.red('Chayka') + ' generator!'));
            this.prompt(prompts, function(props) {
                util.extend(this.Chayka.options, props);
                // this.log(this.Chayka.options);
                done();
            }.bind(this));
        }
    },
    writing: {
        directories: function() {
            util.mkdir('app');
            util.mkdir('app/controllers');
            util.mkdir('app/helpers');
            util.mkdir('app/models');
            util.mkdir('app/views');
        },

        controller: function() {
            var vars = this.Chayka.options;
            if(vars.wizard === 'controller'){
                vars.controller = util.classify(vars.controller).replace(/Controller$/, '');
                util.copy(
                    'controllers/Controller.xphp', 
                    'app/controllers/'+vars.controller + 'Controller.php', 
                    vars
                );
                util.mkdir('app/views/'+this.dasherizeName(vars.controller));
            }
        },

        action: function() {
            var vars = this.Chayka.options;
            if(vars.wizard === 'action'){
                vars.action = util.camelize(vars.action).replace(/Action$/, '');
                var actionCode = util.readTpl(
                    vars.actionDummy?
                        (vars.actionType === 'view' ? 'controllers/Action.view.xphp': 'controllers/Action.api.xphp'):
                        'controllers/Action.empty.xphp', 
                    vars);
                // var actionCode = this._.template(this.fs.read(this.templatePath(vars.actionDummy?
                //     (vars.actionType === 'view' ? 'controllers/Action.view.xphp': 'controllers/Action.api.xphp'):
                //     'controllers/Action.empty.xphp'
                // )), vars);
                var controllerCode = util.readDst('app/controllers/' + vars.controllerFile);
                // var controllerCode = this.fs.read(this.destinationPath('app/controllers/' + vars.controllerFile));

                if(!controllerCode.match(new RegExp('function\\s+' + vars.action))){
                   controllerCode = util.insertBeforeClosingBracket(controllerCode, actionCode);
                   // controllerCode = controllerCode.replace(/}\s*$/, actionCode + '\n}');
                   util.write('app/controllers/'+vars.controllerFile, controllerCode);
                }

                var dashController = util.dasherize(vars.controllerFile.replace(/Controller.php$/, ''));
                var dashAction = util.dasherize(vars.action);

                var viewFile = 'app/views/' + dashController + '/' + dashAction + '.phtml';

                if(vars.actionType === 'view' && !util.pathExists(viewFile)){
                    this.log('view:' +viewFile);
                    util.copy(
                        'views/view.xphtml',
                        viewFile
                    );         
                }
            }
        },

        model: function() {
            var vars = this.Chayka.options;
            if(vars.wizard === 'model'){
                vars.model = util.classify(vars.model).replace(/Model$/, '');
                util.copy(
                    'models/Model.xphp', 
                    'app/models/'+vars.model + 'Model.php', 
                    vars
                );
                util.mkdir('app/sql');
                util.copy(
                    'sql/model.xsql', 
                    'app/sql/'+vars.dbTable + '.sql', 
                    vars
                );
            }
        },

    },
    install: function() {

    }
});