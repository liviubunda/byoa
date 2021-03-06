'use strict';

var _ = require('lodash');

function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
}

Scope.prototype.$watch = function(watchFn, listenerFn, valueEq) {
    var self = this,
        watcher = {
            watchFn: watchFn,
            listenerFn: listenerFn || function() {},
            valueEq: !!valueEq,
            last: initWatchVal
        };
    this.$$watchers.unshift(watcher);
    this.$$lastDirtyWatch = null;

    return function() {
        var index = self.$$watchers.indexOf(watcher);
        if (index >= 0) {
            self.$$watchers.splice(index, 1);
        }
    };
};

Scope.prototype.$$areEqual = function(newValue, oldValue, valueEq) {
    if (valueEq) {
        return _.isEqual(newValue, oldValue);
    }
    else {
        return newValue === oldValue ||
            (typeof newValue === 'number' && typeof oldValue === 'number' &&
             isNaN(newValue) && isNaN(oldValue));
    }
};

Scope.prototype.$$digestOnce = function() {
    var self = this,
        newValue, oldValue, dirty = false;

    _.forEachRight(this.$$watchers, function(watcher) {
        try {
            newValue = watcher.watchFn(self);
            oldValue = watcher.last;
            if (!self.$$areEqual(newValue, oldValue, watcher.valueEq)) {
                self.$$lastDirtyWatch = watcher;
                watcher.last = watcher.valueEq ? _.cloneDeep(newValue) : newValue;
                watcher.listenerFn(newValue, oldValue === initWatchVal ? newValue : oldValue, self);
                dirty = true;
            } else if (self.$$lastDirtyWatch === watcher) {
                return false;
            }
        }
        catch(error) {
            console.error(error);
        }
    });

    return dirty;
};

Scope.prototype.$digest = function() {
    var ttl = 10,
        dirty;

    this.$$lastDirtyWatch = null;

    do {
        dirty = this.$$digestOnce();

        if (dirty && !(ttl--)) {
            throw '10 digest iterations reached';
        }
    } while (dirty);
};

function initWatchVal() { }

module.exports = Scope;






















