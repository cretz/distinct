
fs = require 'fs'
path = require 'path'
{ spawn, exec } = require 'child_process'
minify = require 'minifyjs'

run = (cmd, args, cb) ->
  proc = spawn cmd, args
  proc.stderr.on 'data', (buffer) -> console.log buffer.toString()
  proc.stdout.on 'data', (buffer) -> console.log buffer.toString()
  proc.on 'exit', (status) ->
    process.exit(1) if status != 0
    cb() if typeof cb is 'function'

compile = (cb) ->
  run 'coffee', ['-o', 'lib', '-c', 'src'], -> 
    console.log 'Compiled successfully'
    cb() if typeof cb is 'function'
    
test = (cb) ->
  run 'coffee', ['-o', 'lib', '-c', 'src', 'test'], ->
    run 'node', ['lib/distinct.test.js'], -> 
      console.log 'Test completed successfully'
      cb() if typeof cb is 'function'
    
task 'clean', 'clean lib folder', ->
  fs.rmdirSync 'lib'
  fs.mkdirSync 'lib', 511

task 'compile', 'compile JS', ->
  invoke 'clean'
  compile ->

task 'test', 'test', ->
  invoke 'clean'
  test ->

task 'build', 'run tests and compile', ->
  test -> compile -> 
    minify.minify fs.readFileSync('lib/distinct.js', 'utf8'), engine: 'gcc', (error, code) ->
      if error?
        console.log 'Error: ' + error
      else
        fs.writeFileSync 'lib/distinct.min.js', code
        console.log 'Minification complete'
