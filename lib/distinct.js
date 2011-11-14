(function() {
  var distinct;

  if (typeof exports !== "undefined" && exports !== null) {
    distinct = exports;
  } else {
    distinct = this.distinct = {};
  }

  /**
  * Select from the given object using simple / or // selectors. There
  * are no parent selectors.
  
  * @param {Object} object The object to select from
  * @param {String} selector The selector to use. Must not be null.
  * @param {boolean} [checkCircular] If set to true, this will check for circular references
  * @param {boolean} [debug] If set to true, this will output debug statements
  */

  distinct.select = function(object, selector, checkCircular, debug) {
    var circularList, context, index, newContext, nextIndex, nextIsSelectAll, part, value, _i, _j, _len, _len2;
    if (!(selector != null)) throw new Error('Selector cannot be null');
    context = [object];
    nextIsSelectAll = false;
    if (selector.length > 0 && selector.charAt(0) === '/') {
      if (selector.length > 1 && selector.charAt(1) === '/') {
        nextIsSelectAll = true;
        index = 2;
      } else {
        index = 1;
      }
    } else {
      index = 0;
    }
    if (checkCircular) circularList = [object];
    while (index < selector.length) {
      nextIndex = selector.indexOf('/', index + 1);
      if (nextIndex === -1) nextIndex = selector.length;
      part = selector.substring(index, nextIndex);
      if (debug) console.log('Index: ' + index + ', Part: ' + part);
      index = nextIndex + 1;
      if (part === '') {
        if (nextIsSelectAll) {
          throw new Error('/// is not allowed, and cant end with /');
        }
        nextIsSelectAll = true;
      } else if (nextIsSelectAll) {
        nextIsSelectAll = false;
        newContext = [];
        for (_i = 0, _len = context.length; _i < _len; _i++) {
          value = context[_i];
          distinct._selectAll(value, part, newContext, circularList);
        }
        context = newContext;
      } else {
        newContext = [];
        for (_j = 0, _len2 = context.length; _j < _len2; _j++) {
          object = context[_j];
          if (object === Object(object)) {
            if (circularList != null) {
              distinct._checkCircular(object[part], circularList);
              circularList.push(object[part]);
            }
            newContext.push(object[part]);
          }
        }
        context = newContext;
      }
    }
    return context;
  };

  distinct._selectAll = function(object, name, results, circularList) {
    var key, value, _results;
    if (!(object != null)) return;
    _results = [];
    for (key in object) {
      value = object[key];
      if (key === name) {
        if ((circularList != null) && value === Object(value)) {
          distinct._checkCircular(value, circularList);
          circularList.push(value);
        }
        _results.push(results.push(value));
      } else if (value != null) {
        _results.push(distinct._selectAll(value, name, results));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  distinct._checkCircular = function(object, circularList) {
    var prevObject, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = circularList.length; _i < _len; _i++) {
      prevObject = circularList[_i];
      if (object === prevObject) {
        throw new Error('Circular reference found');
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  /**
  * Set a value for the given path. This only supports
  * single selectors (i.e. '/')
  * 
  * @param {Object} object The object
  * @param {String} path The path
  * @param {Object} value The value
  * @returns {boolean} Returns true if set, false otherwise
  */

  distinct.set = function(object, path, value) {
    var lastPiece, lastSlash, piece, _i, _len, _ref;
    lastSlash = path.lastIndexOf('/');
    lastPiece = path.substring(lastSlash + 1);
    _ref = path.substring(0, lastSlash).split('/');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      piece = _ref[_i];
      object = object[piece];
      if (!(object != null)) return false;
    }
    object[lastPiece] = value;
    return true;
  };

  /**
  * Remove a value for the given path. This only supports
  * single selectors (i.e. '/')
  * 
  * @param {Object} object The object
  * @param {String} path The path
  * @returns {boolean} Returns true if removed, false otherwise
  */

  distinct.remove = function(object, path) {
    var lastPiece, lastSlash, piece, _i, _len, _ref;
    lastSlash = path.lastIndexOf('/');
    lastPiece = path.substring(lastSlash + 1);
    _ref = path.substring(0, lastSlash).split('/');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      piece = _ref[_i];
      object = object[piece];
      if (!(object != null)) return false;
    }
    if (object.hasOwnProperty(lastPiece)) {
      delete object[lastPiece];
      return true;
    }
    return false;
  };

  /**
  * Return the difference between two objects. The results are returned
  * in an array. Each array value has four properties:
  * 
  * path - The simple selector path for the change
  * diffType - 'add', 'delete', 'change'
  * depth - how far down the tree (0 is top)
  * oldValue - The old value (only present on specific change, not up the tree changes)
  * newValue - The new value (only present on specific change, not up the tree changes)
  * 
  * @param {Object} oldObject The old object
  * @param {Object} newObject The new object
  * @param {boolean} [changesUpTheTree] If true, this will mark 'change' for everything
  *   above something that was changed/added/deleted below it
  */

  distinct.diff = function(oldObject, newObject, changesUpTheTree) {
    var results;
    if (!(oldObject != null) || !(newObject != null)) {
      throw new Error('oldObject or newObject can\'t be null');
    }
    results = [];
    distinct._diff(oldObject, newObject, changesUpTheTree, '', 0, results);
    results.sort(function(a, b) {
      if (a.depth > b.depth) return 1;
      if (a.depth < b.depth) return -1;
      if (a.path > b.path) return 1;
      if (a.path < b.path) return -1;
      return 0;
    });
    return results;
  };

  distinct._diff = function(oldObject, newObject, changesUpTheTree, selectorPrefix, depth, results) {
    var key, path, somethingChanged, value;
    somethingChanged = false;
    for (key in oldObject) {
      value = oldObject[key];
      path = selectorPrefix + '/' + key;
      if (!newObject.hasOwnProperty(key)) {
        results.push({
          path: path,
          diffType: 'delete',
          depth: depth
        });
        somethingChanged = true;
      } else if (newObject[key] === Object(newObject[key])) {
        if (oldObject[key] === Object(oldObject[key])) {
          if (!JsTraverse._diff(oldObject[key], newObject[key], changesUpTheTree, path, depth + 1, results && changesUpTheTree)) {
            results.push({
              path: path,
              diffType: 'change',
              depth: depth,
              oldValue: oldObject[key],
              newValue: newObject[key]
            });
            somethingChanged = true;
          }
        } else {
          results.push({
            path: path,
            diffType: 'change',
            depth: depth,
            oldValue: oldObject[key],
            newValue: newObject[key]
          });
          somethingChanged = true;
        }
      } else if (newObject[key] !== oldObject[key]) {
        results.push({
          path: path,
          diffType: 'change',
          depth: depth,
          oldValue: oldObject[key],
          newValue: newObject[key]
        });
        somethingChanged = true;
      }
    }
    for (key in newObject) {
      value = newObject[key];
      if (!oldObject.hasOwnProperty(key)) {
        results.push({
          path: selectorPrefix + '/' + key,
          diffType: 'add',
          depth: depth
        });
        somethingChanged = true;
      }
    }
    return somethingChanged;
  };

  /**
  * Apply a diff set to the given object. Note, this will skip any diff
  * objects that represent up-tree changes.
  * 
  * @param {Object} object The object
  * @param {Array} diffArray The array to apply
  * @param {Object} [eventObject] If specified, trigger() is called for
  *   each diff application with the first parameter as diffType + ':' +
  *   path and the second parameter as the diff object
  */

  distinct.applyDiff = function(object, diffArray, eventObject) {
    var diff, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = diffArray.length; _i < _len; _i++) {
      diff = diffArray[_i];
      switch (diff.diffType) {
        case 'add':
          if (distinct.set(object, diff.path, diff.newValue && (eventObject != null))) {
            _results.push(eventObject.trigger('add:' + diff.path, diff));
          } else {
            _results.push(void 0);
          }
          break;
        case 'delete':
          if (distinct.remove(object, diff.path && (eventObject != null))) {
            _results.push(eventObject.trigger('delete:' + diff.path, diff));
          } else {
            _results.push(void 0);
          }
          break;
        default:
          if (diff.hasOwnProperty('newValue')) {
            if (distinct.set(object, diff.path, diff.newValue && (eventObject != null))) {
              _results.push(eventObject.trigger('change:' + diff.path, diff));
            } else {
              _results.push(void 0);
            }
          } else {
            _results.push(void 0);
          }
      }
    }
    return _results;
  };

}).call(this);
