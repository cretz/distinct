if exports?
  distinct = exports
else
  distinct = @distinct = { }

###*
* Select from the given object using simple / or // selectors. There
* are no parent selectors.

* @param {Object} object The object to select from
* @param {String} selector The selector to use. Must not be null.
* @param {boolean} [checkCircular] If set to true, this will check for circular references
* @param {boolean} [debug] If set to true, this will output debug statements
###  
distinct.select = (object, selector, checkCircular, debug) ->
  if not selector? then throw new Error 'Selector cannot be null'
  context = [ object ]
  nextIsSelectAll = false
  if selector.length > 0 and selector.charAt(0) is '/' 
    if selector.length > 1 and selector.charAt(1) is '/'
      nextIsSelectAll = true
      index = 2
    else
     index = 1
  else
    index = 0
  if checkCircular
    circularList = [ object ]
  while index < selector.length
    nextIndex = selector.indexOf '/', index + 1
    if nextIndex is -1 then nextIndex = selector.length
    part = selector.substring index, nextIndex
    if debug then console.log 'Index: ' + index + ', Part: ' + part
    index = nextIndex + 1
    if part is ''
      if nextIsSelectAll
        throw new Error '/// is not allowed, and cant end with /'
      nextIsSelectAll = true
    else if nextIsSelectAll
      nextIsSelectAll = false
      newContext = []
      for value in context
        distinct._selectAll value, part, newContext, circularList
      context = newContext
    else 
      newContext = []
      for object in context
        if object is Object object
          if circularList?
            distinct._checkCircular object[part], circularList
            circularList.push object[part]
          newContext.push object[part]
      context = newContext
  return context
    
# // selector
# get all values throughout the tree with the given name
# and populate results with array of value
distinct._selectAll = (object, name, results, circularList) ->
  return if not object?
  for key, value of object
    if key is name
      if circularList? and value is Object value
        distinct._checkCircular value, circularList
        circularList.push value  
      results.push value
    else if value?
      distinct._selectAll(value, name, results)
      
# check the circular reference
distinct._checkCircular = (object, circularList) ->
  for prevObject in circularList
    if object is prevObject
      throw new Error 'Circular reference found'
      
###*
* Set a value for the given path. This only supports
* single selectors (i.e. '/')
* 
* @param {Object} object The object
* @param {String} path The path
* @param {Object} value The value
* @returns {boolean} Returns true if set, false otherwise
###
distinct.set = (object, path, value) ->
  lastSlash = path.lastIndexOf '/'
  lastPiece = path.substring lastSlash + 1
  for piece in path.substring(0, lastSlash).split('/')
    object = object[piece]
    if not object? then return false
  object[lastPiece] = value
  return true
      
###*
* Remove a value for the given path. This only supports
* single selectors (i.e. '/')
* 
* @param {Object} object The object
* @param {String} path The path
* @returns {boolean} Returns true if removed, false otherwise
###
distinct.remove = (object, path) ->
  lastSlash = path.lastIndexOf '/'
  lastPiece = path.substring lastSlash + 1
  for piece in path.substring(0, lastSlash).split('/')
    object = object[piece]
    if not object? then return false
  if object.hasOwnProperty lastPiece
    delete object[lastPiece]
    return true
  return false

###*
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
###
distinct.diff = (oldObject, newObject, changesUpTheTree) ->
  if not oldObject? or not newObject? then throw new Error 'oldObject or newObject can\'t be null'
  results = []
  distinct._diff oldObject, newObject, changesUpTheTree, '', 0, results
  results.sort (a, b) ->
    if a.depth > b.depth then return 1
    if a.depth < b.depth then return -1
    if a.path > b.path then return 1
    if a.path < b.path then return -1
    return 0
  return results
  
distinct._diff = (oldObject, newObject, changesUpTheTree, selectorPrefix, depth, results) ->
  somethingChanged = false
  for key, value of oldObject
    path = selectorPrefix + '/' + key
    if not newObject.hasOwnProperty key
      results.push
        path: path,
        diffType: 'delete',
        depth: depth
      somethingChanged = true
    else if newObject[key] is Object newObject[key]
      if oldObject[key] is Object oldObject[key]
        if not JsTraverse._diff oldObject[key], newObject[key], changesUpTheTree, path, depth + 1, results and changesUpTheTree
          results.push
            path: path,
            diffType: 'change',
            depth: depth,
            oldValue: oldObject[key],
            newValue: newObject[key]
          somethingChanged = true
      else
        results.push
          path: path,
          diffType: 'change',
          depth: depth,
          oldValue: oldObject[key],
          newValue: newObject[key]
        somethingChanged = true
    else if newObject[key] isnt oldObject[key]
      results.push
        path: path,
        diffType: 'change',
        depth: depth,
        oldValue: oldObject[key],
        newValue: newObject[key]
      somethingChanged = true
  for key, value of newObject
    if not oldObject.hasOwnProperty key
      results.push
        path: selectorPrefix + '/' + key,
        diffType: 'add',
        depth: depth
      somethingChanged = true
  return somethingChanged

###*
* Apply a diff set to the given object. Note, this will skip any diff
* objects that represent up-tree changes.
* 
* @param {Object} object The object
* @param {Array} diffArray The array to apply
* @param {Object} [eventObject] If specified, trigger() is called for
*   each diff application with the first parameter as diffType + ':' +
*   path and the second parameter as the diff object
###
distinct.applyDiff = (object, diffArray, eventObject) ->
  for diff in diffArray
    switch diff.diffType
      when 'add'
        if distinct.set object, diff.path, diff.newValue and eventObject?
          eventObject.trigger 'add:' + diff.path, diff
      when 'delete'
        if distinct.remove object, diff.path and eventObject?
          eventObject.trigger 'delete:' + diff.path, diff
      else
        # don't want the non-direct changes
        if diff.hasOwnProperty 'newValue'
          if distinct.set object, diff.path, diff.newValue and eventObject?
            eventObject.trigger 'change:' + diff.path, diff 
