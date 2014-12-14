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
        // this.log(_);
        // Have Yeoman greet the user.
        this.log(yosay('Welcome to the divine ' + chalk.red('Chayka') + ' generator!'));
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
                return fs.readdirSync(g.destinationPath('app/controllers')); 
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
                var table = _.underscored(answers.model.replace(/Model$/, '').replace(/y$/, 'ie') + 's');
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
                var table = _.underscored(answers.model.replace(/Model$/, '')) + '_id';
                return table;
            },
            when: function(answers) {
                return answers.wizard === 'model';
            }
        }];

        this.prompt(prompts, function(props) {
            _.extend(this.Chayka.options, props);
            // this.log(this.Chayka.options);
            done();
        }.bind(this));
    },
    writing: {
        directories: function() {
            this.mkdir(this.destinationPath('app'));
            this.mkdir(this.destinationPath('app/controllers'));
            this.mkdir(this.destinationPath('app/helpers'));
            this.mkdir(this.destinationPath('app/models'));
            this.mkdir(this.destinationPath('app/views'));
        },

        controller: function() {
            var vars = this.Chayka.options;
            if(vars.wizard === 'controller'){
                vars.controller = this._.classify(vars.controller).replace(/Controller$/, '');
                this.template(
                    this.templatePath('controllers/Controller.xphp'), 
                    this.destinationPath('app/controllers/'+vars.controller + 'Controller.php'), 
                    vars
                );
                this.mkdir(this.destinationPath('app/views/'+this.dasherizeName(vars.controller)));
            }
        },

        action: function() {
            var vars = this.Chayka.options;
            if(vars.wizard === 'action'){
                vars.action = this._.camelize(vars.action).replace(/Action$/, '');
                var actionCode = this._.template(this.fs.read(this.templatePath(vars.actionType === 'view' ?
                    'controllers/viewAction.xphp':
                    'controllers/apiAction.xphp'
                )), vars);
                var controllerCode = this.fs.read(this.destinationPath('app/controllers/' + vars.controllerFile));

                if(!controllerCode.match(new RegExp('function\\s+' + vars.action))){
                   controllerCode = controllerCode.replace(/}\s*$/, actionCode + '\n}');
                   this.fs.write(this.destinationPath('app/controllers/'+vars.controllerFile), controllerCode);
                }

                var dashController = this.dasherizeName(vars.controllerFile.replace(/\Controller.php$/, ''));
                var dashAction = this.dasherizeName(vars.action);

                var viewFile = this.destinationPath('app/views/') + dashController + '/' + dashAction + '.phtml';

                if(vars.actionType === 'view' && !fs.existsSync(viewFile)){
                    this.log('view:' +viewFile);
                    this.fs.copy(
                        this.templatePath('views/view.xphtml'),
                        viewFile
                    );         
                }
            }
        },

        model: function() {
            var vars = this.Chayka.options;
            if(vars.wizard === 'model'){
                vars.model = this._.classify(vars.model).replace(/Model$/, '');
                this.template(
                    this.templatePath('models/Model.xphp'), 
                    this.destinationPath('app/models/'+vars.model + 'Model.php'), 
                    vars
                );
                this.mkdir(this.destinationPath('app/sql'));
                this.template(
                    this.templatePath('sql/model.xsql'), 
                    this.destinationPath('app/sql/'+vars.dbTable + '.sql'), 
                    vars
                );
            }
        },

    },
    install: function() {

    }
});