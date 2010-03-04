
load('../../js_mystdlib/src/fun.js')
load('../../js_mystdlib/src/aop.js')
load('../src/contract.js')
load('../../qc.js/src/qc.js')
load('tests.js');

runAllProps(new Config(100,1000, 0), new RhinoListener())

