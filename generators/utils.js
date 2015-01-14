'use strict';

var fs = require('fs');

module.exports = function(g){

	var utils = {
		mkdir: function(path){
			return g.mkdir(g.destinationPath(path));
		},

		pathExists: function(path){
			return fs.existsSync(g.destinationPath(path));
		},

	    readDirDst: function(path) {
	        return fs.readdirSync(g.destinationPath(path));
	    },

	    readDirTpl: function(path) {
	        return fs.readdirSync(g.templatePath(path));
	    },

	    readDst: function(file) {
	        return g.fs.read(g.destinationPath(file));
	    },

	    readTpl: function(file, context) {
	        var tpl = g.fs.read(g.templatePath(file));
	        return context ? g._.template(tpl, context) : tpl;
	    },

	    readDstOrTpl: function(dstFile, tplFile, context){
            return utils.pathExists(dstFile) ? utils.readDst(dstFile) : utils.readTpl(tplFile, context);
	    },

	    write: function(file, content){
	    	return g.fs.write(g.destinationPath(file), content);
	    },

	    append: function(file, content){
	    	var old = utils.readDst(file);
	    	return utils.write(file, old + content);
	    },

	    copy: function(tpl, dst, context){
	    	if(context){
	    		return g.template(g.templatePath(tpl), g.destinationPath(dst), context);
	    	}else{
		    	return g.fs.copy(g.templatePath(tpl), g.destinationPath(dst));
	    	}
	    },

	    readTplJSON: function(file, context) {
	        return JSON.parse(utils.readTpl(file, context));
	    },

	    readJSON: function(file) {
	        var json = g.fs.read(g.destinationPath(file));
	        return JSON.parse(json);
	    },

	    writeJSON: function(file, json) {
	        g.fs.write(g.destinationPath(file), JSON.stringify(json, null, 4));
	    },

	    insertAtHtmlComment: function(marker, containerCode, insertCode, replace){
	    	var re = new RegExp('(?:\\n)[\\s^\\n]*<!--\\s*chayka:\\s*' + marker.replace(/[\/\.]/, function(m){return '\\\\'+m;}) + '\\s*-->', 'g');
	        return containerCode.replace(re, function(match) {
	            return (insertCode ? '\n' + insertCode : '') + (replace ? '' : match);
	        });
	    },

	    insertAtSlashStarComment: function(marker, containerCode, insertCode, replace){
	    	var re = new RegExp('(?:\\n)[\\s^\\n]*\\/\\*\\s*chayka:\\s*' + marker.replace(/[\/\.]/, function(m){return '\\\\'+m;}) + '\\s*\\*\\/', 'g');
	        return containerCode.replace(re, function(match) {
	            return (insertCode ? '\n' + insertCode : '') + (replace ? '' : match);
	        });
	    },

        insertAtHashComment: function(marker, containerCode, insertCode, replace){
            var re = new RegExp('(?:\\n)[\\s^\\n]*#\\s*chayka:\\s*' + marker.replace(/[\/\.]/, function(m){return '\\\\'+m;}) + '', 'g');
            return containerCode.replace(re, function(match) {
                return (insertCode ? '\n' + insertCode : '') + (replace ? '' : match);
            });
        },

	    insertBeforeClosingBracket: function(containerCode, insertCode){
	        return containerCode.replace(/\}(?:[^}]*)\s*$/, insertCode + '}');
	    },

	    dasherize: function(name){
	        return g._.dasherize(name);   
	    },

	    dashify: function(name){
	        return g._.dasherize(name).replace(/^-/, '');   
	    },

	    slugify: function(name){
	        return g._.slugify(name);   
	    },

	    classify: function(name){
	        return g._.classify(name);   
	    },

	    camelize: function(name){
	        return g._.camelize(name);   
	    },

	    underscored: function(name){
	        return g._.underscored(name);   
	    },

	    humanize: function(name){
	        return g._.humanize(name);   
	    },

        capitalize: function(name){
            return g._.capitalize(name);   
        },

        decapitalize: function(name){
            return g._.decapitalize(name);   
        },

	    plural: function(name){
	    	return name.replace(/y$/, 'ie') + 's';
	    },

	    singular: function(name){
	    	return name.replace(/e?s$/, '').replace(/ie$/, 'y');
	    },

	    template: function(tpl, context){
	    	return g._.template(tpl, context);
	    },

	    strToArray: function(str){
	    	return str.split(/,\s+/);
	    },

	    extend: function(){
	    	return g._.extend.apply(g._, arguments);
	    },

	    checkRequired: function(value){
	        return !!value || 'This field is required';
	    },

        promptPair: function(invitaitonMsg, keyMsg, valueMsg, keyFilter, valueFilter, done){
        	var filters, keyFilters, valueFilters;
        	filters = keyFilters = valueFilters = ['-none-', 'dasherize', 'dashify', 'slugify', 'classify', 'camelize', 'underscored', 'humanize'];

        	if(g._.isArray(keyFilter)){
        		keyFilters = keyFilter;
        		keyFilter = keyFilters.shift();
        	}
			if(g._.isArray(valueFilter)){
        		valueFilters = valueFilter;
        		valueFilter = valueFilters.shift();
        	}

        	var a;
            var pairPrompts = [
                {
                    name: 'confirm',
                    type: 'confirm',
                    message: invitaitonMsg||' ',
                    when: function(answers){
                    	a = answers;
                    	return !!invitaitonMsg;
                    }
                },
                {
                	name: 'keyFilter',
                	message: keyFilter,
                	type: 'list',
                	choices: keyFilters,
                	default: function(){
                		return 0;
                	},
                	when: function(answers){
                		return (!invitaitonMsg || answers.confirm) && !!keyFilter && filters.indexOf(keyFilter) === -1;
                	}
                },
                {
                	name: 'valueFilter',
                	message: valueFilter,
                	type: 'list',
                	choices: valueFilters,
                	default: function(){
                		return 0;
                	},
                	when: function(answers){
                		return (!invitaitonMsg || answers.confirm) && !!valueFilter && filters.indexOf(valueFilter) === -1;
                	}
                },
                {
                    name: 'key',
                    message: keyMsg,
                    filter: function(value){
                    	switch(a.keyFilter || keyFilter){
                    		case 'dasherize':
                    			value = utils.dasherize(value);
                    			break;
                    		case 'dashify':
                    			value = utils.dashify(value);
                    			break;
                    		case 'slugify':
                    			value = utils.slugify(value);
                    			break;
                    		case 'classify':
                    			value = utils.classify(value);
                    			break;
                    		case 'camelize':
                    			value = utils.camelize(value);
                    			break;
                    		case 'underscored':
                    			value = utils.underscored(value);
                    			break;
                    		case 'humanize':
                    			value = utils.humanize(value);
                    			break;
                    	}
                        return value;
                    },
                    when: function (answers) {
                    	return !invitaitonMsg || answers.confirm;
                    }
                },
                {
                    name: 'value',
                    message: valueMsg,
                    when: function (answers) {
                    	return (!invitaitonMsg || answers.confirm) && answers.key;
                    },
                    filter: function(value){
                    	switch(a.valueFilter || valueFilter){
                    		case 'dasherize':
                    			value = utils.dasherize(value);
                    			break;
                    		case 'dashify':
                    			value = utils.dashify(value);
                    			break;
                    		case 'slugify':
                    			value = utils.slugify(value);
                    			break;
                    		case 'classify':
                    			value = utils.classify(value);
                    			break;
                    		case 'camelize':
                    			value = utils.camelize(value);
                    			break;
                    		case 'underscored':
                    			value = utils.underscored(value);
                    			break;
                    		case 'humanize':
                    			value = utils.humanize(value);
                    			break;
                    	}
                        return value;
                    },
                    default: function(answers){
                    	var value = '';
                    	switch(answers.valueFilter || valueFilter){
                    		case 'dasherize':
                    			value = utils.dasherize(answers.key);
                    			break;
                    		case 'slugify':
                    			value = utils.slugify(answers.key);
                    			break;
                    		case 'classify':
                    			value = utils.classify(answers.key);
                    			break;
                    		case 'camelize':
                    			value = utils.camelize(answers.key);
                    			break;
                    		case 'underscored':
                    			value = utils.underscored(answers.key);
                    			break;
                    		case 'humanize':
                    			value = utils.humanize(answers.key);
                    			break;
                    	}
                        return value;
                    },
                },
            ];

            g.prompt(pairPrompts, done);
        },

        promptPairs: function(invitaitonMsg, moreMsg, keyMsg, valueMsg, keyFilter, valueFilter, done){
            var pairs = {};
            var pairReady = function(pair){
                if(pair.key || pair.confirm){
                    pairs[pair.key] = pair.value;
                    if(pair.keyFilter){
                    	keyFilter = pair.keyFilter;
                    }
                    if(pair.valueFilter){
                    	valueFilter = pair.valueFilter;
                    }
                    utils.promptPair(moreMsg, keyMsg, valueMsg, keyFilter, valueFilter, pairReady);
                }else{
                    done(pairs);
                }
            };

            utils.promptPair(invitaitonMsg, keyMsg, valueMsg, keyFilter, valueFilter, pairReady);
        },

	};

	return utils;
};

