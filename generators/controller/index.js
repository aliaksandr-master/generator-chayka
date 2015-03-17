'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var utils = require('../utils'), util = null;
var promptAnswers = {};
// var shelljs = require('shelljs');
// var fs = require('fs');
// console.log(shelljs);
// var strings = require('yeoman-generator/underscore.strings');
module.exports = yeoman.generators.Base.extend({
    initializing: function() {
        this.pkg = require('../../package.json');
        util = utils(this);

        // this.Chayka = {
        //     options: util.readJSON('chayka.json')
        // };
    },
    prompting: function() {
        var done = this.async();
        var g = this;
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
                }, 
            ],
            default: 'controller'
        }, 
            /* controller */
        {
            name: 'controller',
            message: 'Controller name:',
            default: 'SomeController',
            when: function(answers) {
                return answers.wizard === 'controller';
            }
        }, 
            /* action */
        {
            name: 'controller',
            message: 'Select controller:',
            type: 'list',
            choices: function(){
                var files = util.readDirDst('app/controllers'); 
                var controllers = [];

                files.forEach(function(file){
                    controllers.push(file.replace('.php', ''));
                });

                return controllers;
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
                {name: 'View', value: 'view'},
                {name: 'Empty', value: 'empty'},
            ],
            when: function(answers) {
                return answers.wizard === 'action';
            }
        }, 
        ];

        var promptDone = function(answers) {
            if(answers.wizard === 'action'){
                answers.params = answers.params || {};
                answers.getParamsCode = '';
                answers.assignParamsCode = '';
                answers.declareVarsCode = '';
                answers.outputVarsCode = '';
            }
            if(answers.wizard === 'action' && !answers.blockParams){
                util.promptPairs(
                    'Generate params with default values?', 'One more param?', 
                    'Input param name:', 'Input param default value:', 
                    ['Select input param name format:', 'underscored', 'dashify', 'camelize'], null, 
                function(pairs){

                    util.extend(answers.params, pairs);
                    var getParamTpl = util.readTpl(answers.actionType === 'view' ? 'controllers/Action.getParam.xphp': 'controllers/Action.checkParam.xphp');
                    var assignParamTpl = util.readTpl(answers.actionType === 'view' ? 'controllers/Action.assign.xphp': 'controllers/Action.payload.xphp');
                    var declareVarTpl = util.readTpl('views/declareVar.xphtml');
                    var outputVarTpl = util.readTpl('views/outputVar.xphtml');

                    for(var key in answers.params){
                        var value = answers.params[key];
                        answers.getParamsCode += util.template(getParamTpl, {'paramName': key, 'defValue': value});
                        answers.assignParamsCode += util.template(assignParamTpl, {'paramName': key, 'defValue': value});
                        answers.declareVarsCode += util.template(declareVarTpl, {'paramName': key, 'defValue': value});
                        answers.outputVarsCode += util.template(outputVarTpl, {'paramName': key, 'defValue': value});
                    }
                    util.extend(promptAnswers, g.config.getAll(), answers);
                    // util.extend(g.Chayka.options, answers);
                    done();
                });

            }else{
                // util.extend(this.Chayka.options, answers);
                util.extend(promptAnswers, this.config.getAll(), answers);
                done();
            }
        }.bind(this);

        if(this.options.externalCall){
            // util.extend(vars, this.options.externalCall);
            // done();
            promptDone(this.options.externalCall);
        }else{
            this.log(yosay('Welcome to the divine ' + chalk.red('Chayka') + ' generator!'));
            this.prompt(prompts, promptDone);
        }
    },
    writing: {
        directories: function() {
            util.mkdir('app');
            util.mkdir('app/controllers');
            util.mkdir('app/helpers');
            util.mkdir('app/views');
        },

        controller: function() {
            // var vars = this.Chayka.options;
            var vars = promptAnswers;
            if(vars.wizard === 'controller'){
                vars.controller = util.classify(vars.controller).replace(/Controller$/, '');
                util.copy(
                    'controllers/Controller.xphp', 
                    'app/controllers/'+vars.controller + 'Controller.php', 
                    vars
                );
                util.mkdir('app/views/'+util.dashify(vars.controller));
                var controllers = this.config.get('controllers');
                if(!controllers){
                    controllers = {};                    
                }
                if(!controllers[vars.controller]){
                    controllers[vars.controller] = [];
                }
                this.config.set('controllers', controllers);
            }
        },

        action: function() {
            // var vars = this.Chayka.options;
            var vars = promptAnswers;
            if(vars.wizard === 'action'){

                vars.action = util.camelize(vars.action).replace(/Action$/, '');
                var actionCode;
                switch(vars.actionType){
                    case 'api':
                        actionCode = util.readTpl('controllers/Action.api.xphp', vars);
                        break;
                    case 'view':
                        actionCode = util.readTpl('controllers/Action.view.xphp', vars);
                        break;
                    case 'empty':
                        actionCode = util.readTpl('controllers/Action.empty.xphp', vars);
                        break;

                }

                actionCode = util.insertAtSlashStarComment('getParams', actionCode, vars.getParamsCode, true);
                actionCode = util.insertAtSlashStarComment('assignParams', actionCode, vars.assignParamsCode, true);

                vars.controller = util.classify(vars.controller).replace(/Controller$/, '');
                var controllerFile = 'app/controllers/' + vars.controller + 'Controller.php';
                var controllerCode = vars.controllerTpl || util.readDstOrTpl(controllerFile, 'controllers/Controller.xphp', vars);
                util.mkdir('app/views/'+util.dashify(vars.controller));

                if(!controllerCode.match(new RegExp('function\\s+' + vars.action))){
                   controllerCode = util.insertBeforeClosingBracket(controllerCode, actionCode);
                   util.write('app/controllers/'+vars.controller + 'Controller.php', controllerCode);
                }

                var dashController = util.dashify(vars.controller.replace(/Controller$/, ''));
                var dashAction = util.dashify(vars.action);

                var viewFile = 'app/views/' + dashController + '/' + dashAction + '.phtml';

                if(vars.actionType === 'view' && !util.pathExists(viewFile)){
                    var viewCode = util.readTpl('views/view.xphtml', vars);

                    viewCode = util.insertAtSlashStarComment('declareVars', viewCode, vars.declareVarsCode, true);
                    viewCode = util.insertAtHtmlComment('params', viewCode, vars.outputVarsCode, true);

                    util.write(viewFile, viewCode);

                    // util.copy(
                    //     'views/view.xphtml',
                    //     viewFile
                    // );         
                }

                var controllers = this.config.get('controllers');
                if(!controllers){
                    controllers = {};                    
                }
                if(!controllers[vars.controller]){
                    controllers[vars.controller] = [];
                }
                if(controllers[vars.controller].indexOf(dashAction) === -1){
                    controllers[vars.controller].push(dashAction);   
                }
                this.config.set('controllers', controllers);
            }
        },

    },

    install: function() {

    }
});