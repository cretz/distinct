testObject = 
  topObjectOne:
    subObject: 'blahOne'
  topObjectTwo:
    subObject: 'blahTwo'
  topObjectThree:
    subObject:
      subObject: 'blahThree'
  topObjectFour:
    subObjectFour:
      subObject: 'blahFour'

testObjectCircular =
  testOne:
    subObject: 'blah'
testObjectCircular.testOne.subObject = testObjectCircular.testOne

util = require 'util'    
assert = require 'assert'
distinct = require '../lib/distinct.js'

# ------------
# select tests
# ------------

# test root selector
assert.strictEqual distinct.select(testObject, '/')[0], testObject

# test all selector
selected = distinct.select(testObject, '//subObject')
assert.strictEqual selected.length, 4
assert.strictEqual selected[0], 'blahOne'
assert.strictEqual selected[1], 'blahTwo'
assert.strictEqual selected[2], testObject.topObjectThree.subObject
assert.strictEqual selected[3], 'blahFour'

# test simple sub select
assert.strictEqual distinct.select(testObject, '/topObjectOne/subObject')[0], 'blahOne' 

# test circular
# FIXME
# distinct.select testObjectCircular, '//blah', true

