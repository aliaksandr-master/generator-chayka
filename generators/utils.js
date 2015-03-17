'use strict';

var fs = require('fs');

module.exports = function(g){

	var utils = {

		/**
		 * Create directory (destination relative)
		 *
		 * @param {string} path
		 * @returns {*}
		 */
		mkdir: function(path){
			return g.mkdir(g.destinationPath(path));
		},

		/**
		 * Check if path exists (destination relative)
		 *
		 * @param {string} path
		 * @returns {boolean}
		 */
		pathExists: function(path){
			return fs.existsSync(g.destinationPath(path));
		},

		/**
		 * Read destination directory contents
		 *
		 * @param path
		 * @returns {[]}
		 */
		readDirDst: function(path) {
	        return fs.readdirSync(g.destinationPath(path));
	    },

		/**
		 * Read templates directory contents
		 *
		 * @param path
		 * @returns {[]}
		 */
	    readDirTpl: function(path) {
	        return fs.readdirSync(g.templatePath(path));
	    },

		/**
		 * Read file from destination
		 *
		 * @param {string} file
		 * @returns {string}
		 */
	    readDst: function(file) {
	        return g.fs.read(g.destinationPath(file));
	    },

		/**
		 * Read file from templates,
		 * if context provided performs template var substitution
		 *
		 * @param {string} file
		 * @param [context]
		 * @returns {string} context
		 */
	    readTpl: function(file, context) {
	        var tpl = g.fs.read(g.templatePath(file));
	        return context ? g._.template(tpl, context) : tpl;
	    },

		/**
		 * Read destination file, if it does not exist,
		 * read template and substitute context
		 *
		 * @param {string} dstFile
		 * @param {string} tplFile
		 * @param {{}} context
		 * @returns {string}
		 */
		readDstOrTpl: function(dstFile, tplFile, context){
            return utils.pathExists(dstFile) ? utils.readDst(dstFile) : utils.readTpl(tplFile, context);
	    },

		/**
		 * Write to destination file
		 *
		 * @param {string} file
		 * @param {string} content
		 * @returns {*}
		 */
		write: function(file, content){
	    	return g.fs.write(g.destinationPath(file), content);
	    },

		/**
		 * Append content to existing destination file
		 *
		 * @param file
		 * @param content
		 * @returns {*}
		 */
		append: function(file, content){
	    	var old = utils.readDst(file);
	    	return utils.write(file, old + content);
	    },

		/**
		 * Copy file from templates to destination,
		 * if context specified perform template substitution
		 *
		 * @param {string} tpl
		 * @param {string} dst
		 * @param {{}} [context]
		 * @returns {*}
		 */
		copy: function(tpl, dst, context){
	    	if(context){
	    		return g.template(g.templatePath(tpl), g.destinationPath(dst), context);
	    	}else{
		    	return g.fs.copy(g.templatePath(tpl), g.destinationPath(dst));
	    	}
	    },

		/**
		 * Read json file from templates,
		 * if context specified perform template substitution
		 *
		 * @param {string} file
		 * @param {{}} context
		 * @returns {{}}
		 */
		readTplJSON: function(file, context) {
	        return JSON.parse(utils.readTpl(file, context));
	    },

		/**
		 * Read json file from destination
		 *
		 * @param {string} file
		 * @returns {{}}
		 */
		readJSON: function(file) {
	        var json = g.fs.read(g.destinationPath(file));
	        return JSON.parse(json);
	    },

		/**
		 * Write json object to destination file
		 *
		 * @param file
		 * @param json
		 */
		writeJSON: function(file, json) {
	        g.fs.write(g.destinationPath(file), JSON.stringify(json, null, 4));
	    },

		/**
		 * Insert code fragment into existing code at position defined by HTML comment
		 * <!-- chayka:__marker__ -->
		 *
		 * @param {string} marker
		 * @param {string} containerCode
		 * @param {string} insertCode
		 * @param {boolean} [replace]
		 * @returns {string}
		 */
		insertAtHtmlComment: function(marker, containerCode, insertCode, replace){
	    	var re = new RegExp('(?:\\n)[\\s^\\n]*<!--\\s*chayka:\\s*' + marker.replace(/[\/\.]/, function(m){return '\\\\'+m;}) + '\\s*-->', 'g');
	        return containerCode.replace(re, function(match) {
	            return (insertCode ? '\n' + insertCode : '') + (replace ? '' : match);
	        });
	    },

		/**
		 * Insert code fragment into existing code at position defined by slash star comment
		 * /* chayka:__marker__ *'/
		 *
		 * @param {string} marker
		 * @param {string} containerCode
		 * @param {string} insertCode
		 * @param {boolean} [replace]
		 * @returns {string}
		 */
	    insertAtSlashStarComment: function(marker, containerCode, insertCode, replace){
	    	var re = new RegExp('(?:\\n)[\\s^\\n]*\\/\\*\\s*chayka:\\s*' + marker.replace(/[\/\.]/, function(m){return '\\\\'+m;}) + '\\s*\\*\\/', 'g');
	        return containerCode.replace(re, function(match) {
	            return (insertCode ? '\n' + insertCode : '') + (replace ? '' : match);
	        });
	    },

		/**
		 * Insert code fragment into existing code at position defined by hash comment
		 * # chayka:__marker__
		 *
		 * @param {string} marker
		 * @param {string} containerCode
		 * @param {string} insertCode
		 * @param {boolean} replace
		 * @returns {string}
		 */
        insertAtHashComment: function(marker, containerCode, insertCode, replace){
            var re = new RegExp('(?:\\n)[\\s^\\n]*#\\s*chayka:\\s*' + marker.replace(/[\/\.]/, function(m){return '\\\\'+m;}) + '', 'g');
            return containerCode.replace(re, function(match) {
                return (insertCode ? '\n' + insertCode : '') + (replace ? '' : match);
            });
        },

		/**
		 * Insert code fragment into existing code before last closing bracket '}'
		 * /* chayka:__marker__ *'/
		 *
		 * @param {string} containerCode
		 * @param {string} insertCode
		 * @returns {string}
		 */
	    insertBeforeClosingBracket: function(containerCode, insertCode){
	        return containerCode.replace(/}(?:[^}]*)\s*$/, insertCode + '}');
	    },

		/**
		 * Some text -> -some-text
		 *
		 * @param {string} name
		 * @returns {string}
		 */
		dasherize: function(name){
	        return g._.dasherize(name);   
	    },

		/**
		 * Some text -> some-text
		 *
		 * @param {string} name
		 * @returns {string}
		 */
	    dashify: function(name){
	        return g._.dasherize(name).replace(/^-/, '');   
	    },

		/**
		 * Some text -> some-text
		 *
		 * @param {string} name
		 * @returns {string}
		 */
	    slugify: function(name){
	        return g._.slugify(name);   
	    },

		/**
		 * Some text -> SomeText
		 *
		 * @param {string} name
		 * @returns {string}
		 */
	    classify: function(name){
	        return g._.classify(name);   
	    },

		/**
		 * some text -> someText
		 *
		 * @param {string} name
		 * @returns {string}
		 */
	    camelize: function(name){
	        return g._.camelize(name);   
	    },

		/**
		 * Some text -> some_text
		 *
		 * @param {string} name
		 * @returns {string}
		 */
		underscored: function(name){
	        return g._.underscored(name);   
	    },

		/**
		 * some-text -> Some text
		 *
		 * @param {string} name
		 * @returns {string}
		 */
		humanize: function(name){
	        return g._.humanize(name);   
	    },

		/**
		 * some-text -> Some Text
		 *
		 * @param {string} name
		 * @returns {string}
		 */
		capitalize: function(name){
            return g._.capitalize(name);   
        },

		/**
		 * Some text -> some text
		 *
		 * @param {string} name
		 * @returns {string}
		 */
        decapitalize: function(name){
            return g._.decapitalize(name);   
        },

		/**
		 * Dummy -> Dummies
		 * Cat -> Cats
		 * Bitch -> Bitchs !
		 *
		 * @param {string} name
		 * @returns {string}
		 */
		plural: function(name){
	    	return name.replace(/y$/, 'ie') + 's';
	    },

		/**
		 * Dummies -> Dummy
		 * Cats -> Cat
		 * Bitches -> Bitch
		 *
		 * @param {string} name
		 * @returns {string}
		 */
	    singular: function(name){
	    	return name.replace(/e?s$/, '').replace(/ie$/, 'y');
	    },

		/**
		 * Template function, alia to lodash _.template()
		 *
		 * @param {string} tpl
		 * @param {{}} [context]
		 * @returns {string|function}
		 */
		template: function(tpl, context){
	    	return g._.template(tpl, context);
	    },

		/**
		 * str.split(/,\s+/);
		 *
		 * @param {string} str
		 * @returns {*|Array}
		 */
		strToArray: function(str){
	    	return str.split(/,\s+/);
	    },

		/**
		 * Alias to lodash _.extend()
		 * @returns {*}
		 */
	    extend: function(){
	    	return g._.extend.apply(g._, arguments);
	    },

		/**
		 * Required field check for inquirer API
		 *
		 * @param value
		 * @returns {boolean|string}
		 */
		checkRequired: function(value){
	        return !!value || 'This field is required';
	    },

		/**
		 * key => value pair inquirer prompting
		 *
		 * @param {string} invitationMsg
		 * @param {string} keyMsg
		 * @param {string} valueMsg
		 * @param {string} keyFilter
		 * @param {string} valueFilter
		 * @param {function} done
		 */
        promptPair: function(invitationMsg, keyMsg, valueMsg, keyFilter, valueFilter, done){
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
                    message: invitationMsg||' ',
                    when: function(answers){
                    	a = answers;
                    	return !!invitationMsg;
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
                		return (!invitationMsg || answers.confirm) && !!keyFilter && filters.indexOf(keyFilter) === -1;
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
                		return (!invitationMsg || answers.confirm) && !!valueFilter && filters.indexOf(valueFilter) === -1;
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
                    	return !invitationMsg || answers.confirm;
                    }
                },
                {
                    name: 'value',
                    message: valueMsg,
                    when: function (answers) {
                    	return (!invitationMsg || answers.confirm) && answers.key;
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
                    }
                }
            ];

            g.prompt(pairPrompts, done);
        },

		/**
		 * Looped key => value pair inquirer prompting
		 * @param {string} invitationMsg
		 * @param {string} moreMsg
		 * @param {string} keyMsg
		 * @param {string} valueMsg
		 * @param {string} keyFilter
		 * @param {string} valueFilter
		 * @param {function} done
		 */
		promptPairs: function(invitationMsg, moreMsg, keyMsg, valueMsg, keyFilter, valueFilter, done){
            var pairs = {};
			/**
			 * @param {{
			 * 	keyFilter: {string},
			 * 	valueFilter: {string}
			 * }} pair
			 */
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

            utils.promptPair(invitationMsg, keyMsg, valueMsg, keyFilter, valueFilter, pairReady);
        }

	};

	return utils;
};

