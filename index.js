/**
 * swatk6/appi
 * @version v0.1.0
 * @author Andras Kemeny
 * 
 * An application API baseclass.
 * 
 * LICENSE: MIT
 * (c) Andras Kemeny, subpardaemon@gmail.com
 */

var swatk6em = require('@swatk6/emitter'),
    swatk6ev = require('@swatk6/event');

/**
 * Return a new APPI instance.
 * @constructor
 * @param {String} role one of the swatk6_appi.ROLE_* constants
 * @param {swatk6_appi} [trunk=null] if the trunk is already created, specify it here
 * @returns {swatk6_appi}
 */
function swatk6_appi(role,trunk) {
    swatk6em.call(this);
    if (typeof trunk==='undefined') {
	trunk = null;
    }
    this._partSetup(role,trunk);
}
swatk6_appi.prototype = Object.create(swatk6em.prototype);
swatk6_appi.prototype.constructor = swatk6_appi;
swatk6_appi.ROLE_TRUNK = 'trunk';
swatk6_appi.ROLE_COMMS = 'comms';
swatk6_appi.ROLE_UI = 'ui';
swatk6_appi.ROLE_BACKEND = 'backend';
swatk6_appi.ROLE_USER = 'user';
swatk6_appi.ROLE_CLIENTS = 'clients';
swatk6_appi.EVENT_MODULE_ADDED = 'moduleadd';
swatk6_appi.EVENT_MODULE_BEFORE_REMOVE = 'moduleremovebefore';
swatk6_appi.EVENT_MODULE_REMOVED = 'moduleremoved';
swatk6_appi.EVENT_VAR_WRITE = 'varwrite';
swatk6_appi.EVENT_BEFORE_SUSPEND = 'beforesuspend';
swatk6_appi.EVENT_AFTER_WAKE = 'afterwake';
swatk6_appi.EVENT_COMMAND_FROM_UI = 'commandfromui';
swatk6_appi.EVENT_COMMAND_FROM_BACKEND = 'commandfrombackend';
//TODO extend constants

swatk6_appi.prototype._partSetup = function(role,trunkObject) {
    this._logger = null;
    this.role = role;
    if (this.role===swatk6_appi.ROLE_TRUNK) {
	trunkObject = this;
	this.modules = {};
    }
    this.trunk = trunkObject;
    this.state = {};
    this.config = {};
    this.initialized = false;
};
/**
 * Attach a @swatk6/logger instance to this APPI instance.
 * @param {@swatk6/logger} logger
 * @returns {swatk6_appi}
 */
swatk6_appi.prototype.addLogger = function(logger) {
    this._logger = logger;
    return this;
};
/**
 * @private
 * @returns {swatk6_appi}
 */
swatk6_appi.prototype._shutdown = function() {
    this.modules = {};
    return this;
};
/**
 * Return true if this APPI instance is the trunk.
 * @returns {Boolean}
 */
swatk6_appi.prototype.isTrunk = function() {
    return (this.trunk!==null && !this.hasParent());
};
/**
 * Get the reference to the trunk APPI instance.
 * @returns {swatk6_appi}
 */
swatk6_appi.prototype.getTrunk = function() {
    if (this.isTrunk()) {
	return this;
    }
    else if (this.hasParent()===false) {
	return null;
    }
    else {
	return this.getParent().getTrunk();
    }
};
/**
 * Get the reference to an APPI module that provides the functionality required in role.
 * @param {String} role one of the swatk6_appi.ROLE_* constants
 * @returns {swatk6_appi}
 */
swatk6_appi.prototype.getModule = function(role) {
    if (role===swatk6_appi.ROLE_TRUNK) {
	return this.getTrunk();
    } else {
	if (typeof this.modules[role]!=='undefined') {
	    return this.modules[role];
	} else {
	    if (!this.hasParent()) {
		return null;
	    } else {
		return this.getParent().getModule(role);
	    }
	}
    }
};
/**
 * Add an APPI instance to this one as a child, in the specified role.
 * 
 * Broadcasts a global event:
 * - type: swatk6_appi.EVENT_MODULE_ADDED
 * - module: the added APPI instance
 * - role: the role of the added module
 * - parent: the current APPI instance
 * 
 * @throws {Error} on trying to replace an existing module
 * @param {swatk6_appi} modul the APPI instance to add
 * @param {String} role one of the swatk6_appi.ROLE_* constants
 * @returns {swatk6_appi}
 */
swatk6_appi.prototype.addModule = function(modul,role) {
    if (typeof role==='undefined') {
	role = modul.role;
    }
    if (role===swatk6_appi.ROLE_TRUNK) {
	throw new Error('trunk cannot be replaced');
    }
    if (typeof this.modules[role]==='undefined') {
	this.modules[role] = modul;
	this.addChild(modul);
	var bre = new swatk6ev(swatk6_appi.EVENT_MODULE_ADDED,{module:modul,role:role,parent:this});
	this.getTrunk().fireGlobal(bre);
    } else {
	throw new Error('module already defined in trunk');
    }
    return this;
};
/**
 * Remove a module designated by modul (as an instance or a string as a role).
 * 
 * Broadcasts a global event:
 * - type: swatk6_appi.EVENT_MODULE_BEFORE_REMOVE
 * - module: the APPI instance to be removed
 * - parent: the current APPI instance
 * 
 * Broadcasts a global event:
 * - type: swatk6_appi.EVENT_MODULE_REMOVED
 * - module: the APPI instance that has been removed
 * - parent: the current APPI instance
 * 
 * @param {(swatk6_appi|String)} modul the APPI instance to remove, or a role string
 * @returns {swatk6_appi}
 */
swatk6_appi.prototype.removeModule = function(modul) {
    if (typeof modul==='string') {
	modul = this.getModule(modul);
    }
    if (modul!==null) {
	if (typeof this.modules[role]==='undefined') {
	    if (!this.hasParent()) {
		throw new Error('module cannot be found');
	    } else {
		return this.getParent().removeModule(modul);
	    }
	} else {
	    var bre = new swatk6ev(swatk6_appi.EVENT_MODULE_BEFORE_REMOVE,{module:modul,parent:this});
	    this.getTrunk().fireGlobal(bre);
	    delete this.modules[role];
	    this.removeChild(modul);
	    modul.shutdown();
	    var are = new swatk6ev(swatk6_appi.EVENT_MODULE_REMOVED,{module:modul,parent:this});
	    this.getTrunk().fireGlobal(are);
	    return this;
	}
    }
};
/**
 * Fire (emit) an event on this APPI instance and its descendants.
 * @param {swatk6_event} evt the event object to "fire" (emit)
 * @returns {swatk6_appi}
 */
swatk6_appi.prototype.fireLocal = function(evt) {
    evt.setPropagation(swatk6ev.PROPAGATES_LOCAL|swatk6ev.PROPAGATES_DOWN);
    this.emitEvent(evt);
    return this;
};
/**
 * Fire (emit) an event on the trunk APPI instance and all its modules (including this one).
 * @param {swatk6_event} evt the event object to "fire" (emit)
 * @returns {swatk6_appi}
 */
swatk6_appi.prototype.fireGlobal = function(evt) {
    var trunk = this.getTrunk();
    if (trunk===null) {
	return this.fireLocal(evt);
    }
    evt.setPropagation(swatk6ev.PROPAGATES_LOCAL|swatk6ev.PROPAGATES_DOWN);
    trunk.emitEvent(evt);
    return this;
};
/**
 * Execute an action on an APPI instance.
 * 
 * You can either override this method in your extension, or use the default functionality: the actDescr.action or actDescr must be a valid instance method.
 * 
 * It returns null on an unsuccessful invocation, or returns the result of the action instance method, which may be a {Promise}!
 * 
 * @param {(String|Object)} actDescr either a string for the action name, or a plain object {action:<action_name>,params:<params_object>}
 * @param {Object} [actParam={}] optional parameters for the action, if actDescr is a string
 * @returns {*}
 */
swatk6_appi.prototype.action = function(actDescr,actParam) {
    if (typeof actDescr==='string') {
	if (typeof actParam==='undefined') {
	    actParam = {};
	}
	actDescr = {'action':actDescr,'params':actParam};
    }
    if (typeof this[actDescr.action]==='function') {
	return this[actDescr.action].call(this,actDescr);
    }
    return null;
};
/**
 * Reads a variable that this instance holds.
 * 
 * If there is an instance method called .get_<varname>, then that is executed and its return value is returned;
 * If there is no such method, then it tries to return the 'varname' key from this instance's state object.
 * 
 * @param {String} varname
 * @returns {*}
 */
swatk6_appi.prototype.read = function(varname) {
    if (typeof this['get_'+varname]==='function') {
	return this['get_'+varname].call(this,varname);
    }
    if (typeof this.state[varname]!=='undefined') {
	return this.state[varname];
    }
    return null;
};
/**
 * Sets a variable that this instance holds.
 * 
 * If there is an instance method called .set_<varname>, then that is executed;
 * Otherwise it sets the 'varname' key in this instance's state object to varvalue.
 * 
 * @param {String} varname
 * @param {*} varvalue
 * @returns {swatk6_appi}
 */
swatk6_appi.prototype.write = function(varname,varvalue) {
    if (typeof this['set_'+varname]==='function') {
	this['set_'+varname].call(this,varname,varvalue);
    } else {
	var ov = (typeof this.state[varname]==='undefined') ? undefined : this.state[varname];
	this.state[varname] = varvalue;
	var evt = new swatk6ev(swatk6_appi.EVENT_VAR_WRITE,{module:this,varName:varname,newValue:varvalue,oldValue:ov});
	this.fireLocal(evt);
    }
    return this;
};
/**
 * Returns the current state of this instance.
 * @returns {Object}
 */
swatk6_appi.prototype.getState = function() {
    return this.state;
};
/**
 * Sets the current state of this instance.
 * @param {Object} newState
 * @returns {swatk6_appi}
 */
swatk6_appi.prototype.setState = function(newState) {
    this.state = newState;
    return this;
};
/**
 * Configure the current instance and any children thereof.
 * 
 * If this is the trunk instance, it looks for the 'trunk' or 'app' key in the given config object, 
 * and uses the object under that key to set this instance's config property. It will also transmit
 * the whole config to its immediate children, if their role matches a key in config.
 * 
 * If this is an instance that provides a specific role, then the config entry for that role is
 * given to this instance and it sets up its config object.
 * 
 * @param {Object} config
 * @returns {swatk6_appi}
 */
swatk6_appi.prototype.configure = function(config) {
    if (this.isTrunk()) {
	var ok = Object.keys(config);
	for(var i=0;i<ok.length;i++) {
	    if (ok[i]==='trunk'||ok[i]==='app') {
		var ck = Object.keys(config[ok[i]]);
		for(var j=0;j<ck.length;++j) {
		    this.config[ck[j]] = config[ok[i]][j];
		}
	    } else {
		var mo = this.getModule(ok[i]);
		if (mo!==null) {
		    mo.configure(config[ok[i]]);
		}
	    }
	}
    } else {
	var ok = Object.keys(config);
	for(var i=0;i<ok.length;i++) {
	    this.config[ok[i]] = config[ok[i]];
	}
    }
    return this;
};
/**
 * Get the configuration for a particular role.
 * @param {String} role one of the swatk6_appi.ROLE_* constants
 * @returns {Object}
 */
swatk6_appi.prototype.getConfig = function(role) {
    if (role===this.role) {
	return this.config;
    }
    var mod = this.getModule(role);
    if (mod!==null) {
	return mod.getConfig();
    }
    return null;
};
/**
 * Run the initialization for this APPI instance.
 * 
 * Best practice: run this only after you have built the application's APPI modules and connected them, and configured them.
 * It runs the .initModule() instance method internally.
 * It can only be run once in this object's lifetime.
 * 
 * @returns {swatk6_appi}
 */
swatk6_appi.prototype.init = function() {
    if (this.initialized===false) {
	if (this.isTrunk()) {
	    this.initModule();
	    this.callOnChildren('init',{},null,this.getAllChildren());
	    this.initTrunk();
	} else {
	    this.initModule();
	}
    }
    this.initialized = true;
    return this;
};
/**
 * This is the actual initialization method; please override this.
 * 
 * If this is the trunk instance, this is run before initTrunk.
 * 
 * @private
 */
swatk6_appi.prototype.initModule = function() {
    //you need to override this.
    //if you are the trunk, then this is called before all children modules are initialized.
};
/**
 * This is the actual initialization method for the trunk; please override this.
 * 
 * This is only run if this is the trunk instance.
 * 
 * @private
 */
swatk6_appi.prototype.initTrunk = function() {
    //only putin here stuff if this is the actual trunk object.
};
/**
 * Runs the shutdown for an APPI instance.
 * 
 * Internally, it calls .shutdownModule() instance method, then:
 * - if it's the trunk, it calls shutdown on all children;
 * - if it's the trunk, it calls .shutdownTrunk();
 * - it calls the @swatk6/emitter .shutdow() method to release family ties;
 * - it calls ._shutdown() here as well.
 * 
 * @returns {swatk6_appi}
 */
swatk6_appi.prototype.shutdown = function() {
    this.shutdownModule();
    if (this.isTrunk()) {
	this.callOnChildren('shutdown',{},null,this.getAllChildren());
	this.shutdownTrunk();
    }
    swatk6em.prototype.shutdown.call(this);
    this._shutdown();
    this.initialized = false;
    return this;
};
/**
 * This is the actual shutdown method; please override this.
 * 
 * If this is the trunk instance, this is run before shutdownTrunk.
 * 
 * @private
 */
swatk6_appi.prototype.shutdownModule = function() {
    //override this
};
/**
 * This is the actual shutdown method for the trunk; please override this.
 * 
 * This is only run if this is the trunk instance.
 * 
 * @private
 */
swatk6_appi.prototype.shutdownTrunk = function() {
    //override this
};
/**
 * Suspend the operations of this APPI instance.
 * 
 * The usual strategy for this is to inspect some internal state, do some cleanup, dock current operations and return an object representing the suspension state.
 * If this is the trunk instance, it's responsible to transmit the suspend notice to all components.
 * The trunk instance will yield a return object whose keys are the roles (including 'trunk') and the values the gathered suspension data.
 * 
 * The actual tasks to do (which should commit data to the current .state property) are in the ._beforeSuspend() instance method.
 * 
 * Broadcasts a global event:
 * - type: swatk6_appi.EVENT_BEFORE_SUSPEND
 * 
 * @param {Object} [currentData={}] only for recursive usage!
 * @returns {Object}
 */
swatk6_appi.prototype.suspend = function(currentData) {
    if (this.isTrunk()) {
	this.fireGlobal(new swatk6ev(swatk6_appi.EVENT_BEFORE_SUSPEND));
	var xd = this.callOnChildren('suspend',[{}],null,this.getAllChildren());
	this._beforeSuspend();
	xd['trunk'] = this.getState();
	return xd;
    } else {
	if (typeof currentData==='undefined') {
	    currentData = {};
	}
	this._beforeSuspend();
	currentData[this.role] = this.getState();
	return currentData;
    }
};
/**
 * Override this.
 * @private
 * @returns {undefined}
 */
swatk6_appi.prototype._beforeSuspend = function() {
    //please override
    //this should prepare this.state for suspending
};
/**
 * Wake up the operations of this APPI instance, possibly after a suspend.
 * 
 * The usual strategy for this is to set the state data from the wakeData[role], then use the ._afterWake() instance method to do some logic and wake up the instance.
 * If this is the trunk instance, it's responsible to transmit the wake notice and data to all components.
 * 
 * The actual tasks to do (which should use data from the current .state property) are in the ._afterWake() instance method.
 * 
 * Broadcasts a global event:
 * - type: swatk6_appi.EVENT_AFTER_WAKE
 * 
 * @param {Object} wakeData the wakeup data, grouped by 'role' keys
 * @returns {swatk6_appi}
 */
swatk6_appi.prototype.wake = function(wakeData) {
    if (this.isTrunk()) {
	this.callOnChildren('wake',[wakeData],null,this.getAllChildren());
	this.setState(wakeData['trunk']);
	this._afterWake();
	this.fireGlobal(new swatk6ev(swatk6_appi.EVENT_AFTER_WAKE));
    } else {
	if (typeof wakeData[this.role]!=='undefined') {
	    this.setState(wakeData[this.role]);
	    this._afterWake();
	}
    }
    return this;
};
/**
 * Override this.
 * @private
 * @returns {undefined}
 */
swatk6_appi.prototype._afterWake = function() {
    //please override
    //this do cleanup after state is reinstated
};
/*
 * ----------------------------------------------------------------------------
 * CONVENIENCE METHODS
 * ----------------------------------------------------------------------------
 */
/**
 * Returns a reference to the swatk6_appi.ROLE_BACKEND APPI instance or throws an error if there is none.
 * @throws {Error} Throws an exception if an APPI instance with the given role is not found.
 * @returns {swatk6_appi} 
 */
swatk6_appi.prototype.backend = function() {
    var m = this.getModule(swatk6_appi.ROLE_BACKEND);
    if (m===null) {
	throw new Error("module shortcut to "+swatk6_appi.ROLE_BACKEND+" failed");
    }
    return m;
};
/**
 * Returns a reference to the swatk6_appi.ROLE_UI APPI instance or throws an error if there is none.
 * @throws {Error} Throws an exception if an APPI instance with the given role is not found.
 * @returns {swatk6_appi} 
 */
swatk6_appi.prototype.ui = function() {
    var m = this.getModule(swatk6_appi.ROLE_UI);
    if (m===null) {
	throw new Error("module shortcut to "+swatk6_appi.ROLE_UI+" failed");
    }
    return m;
};
/**
 * Returns a reference to the swatk6_appi.ROLE_USER APPI instance or throws an error if there is none.
 * @throws {Error} Throws an exception if an APPI instance with the given role is not found.
 * @returns {swatk6_appi} 
 */
swatk6_appi.prototype.user = function() {
    var m = this.getModule(swatk6_appi.ROLE_USER);
    if (m===null) {
	throw new Error("module shortcut to "+swatk6_appi.ROLE_USER+" failed");
    }
    return m;
};
/**
 * Returns a reference to the swatk6_appi.ROLE_CLIENTS APPI instance or throws an error if there is none.
 * @throws {Error} Throws an exception if an APPI instance with the given role is not found.
 * @returns {swatk6_appi} 
 */
swatk6_appi.prototype.clients = function() {
    var m = this.getModule(swatk6_appi.ROLE_CLIENTS);
    if (m===null) {
	throw new Error("module shortcut to "+swatk6_appi.ROLE_CLIENTS+" failed");
    }
    return m;
};
/**
 * Returns a reference to the swatk6_appi.ROLE_COMMS APPI instance or throws an error if there is none.
 * @throws {Error} Throws an exception if an APPI instance with the given role is not found.
 * @returns {swatk6_appi} 
 */
swatk6_appi.prototype.comms = function() {
    var m = this.getModule(swatk6_appi.ROLE_COMMS);
    if (m===null) {
	throw new Error("module shortcut to "+swatk6_appi.ROLE_COMMS+" failed");
    }
    return m;
};
/**
 * Creates a @swatk6/packet based on the arguments.
 * Requires an operational ROLE_COMMS APPI instance.
 * @param {String} cmd the command of the packet
 * @param {Object} data the payload of the packet
 * @returns {swatk6_packet}
 */
swatk6_appi.prototype.makePacket = function(cmd,data) {
    if (typeof data === 'undefined') {
	data = null;
    }
    return this.comms().action('getWG6Packet',{command:cmd,payload:data});
};
/**
 * Makes a request to the backend and returns a Promise.
 * Requires an operational ROLE_BACKEND APPI instance.
 * @param {String} command
 * @param {Object} payload
 * @returns {Promise}
 */
swatk6_appi.prototype.request = function(command,payload) {
    if (typeof command!=='string') {
	payload = command.payload;
	command = command.command;
    }
    return this.backend().action('sendRequest',this.makePacket(command,payload));
};
/**
 * Logging abstractor, for @swatk6/logger; uses console.log if the logger is not set.
 * It prepends all logged items with "APPI:<role>".
 * @param {String} level
 * @param {...*} log message and items to log
 */
swatk6_appi.prototype.log = function(level) {
    var params = new Array(arguments.length);
    for(var i = 0; i < params.length; ++i) {
        params[i] = arguments[i];
    }
    params[0] = 'APPI:'+this.role;
    if (this._logger!==null) {
        this._logger[level].apply(this,params);
    } else {
        console.log.apply(this,params);
    }
};


module.exports = swatk6_appi;
