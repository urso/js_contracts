
//import package contracts
for(var s in Contracts) {
    this[s] = Contracts[s];
}

function mk(tests, opts) {
    var validPass = (opts && opts.validPass) ? opts.validPass : $const(true),
        validFail = (opts && opts.validFail) ? opts.validFail : $const(true),
        fnPass = (opts && opts.fnPass) ? opts.fnPass : function () {},
        fnFail = (opts && opts.fnFail) ? opts.fnFail : function () {};

    function makePred(fn, t, tValid, callback) {
        return ( function(c) {
            var values = Array.prototype.slice.call(arguments, 1);
            c.guard( tValid.apply(this, values) );

            var tfn = test(fn);
            var result = tfn.apply(fn, [values]);
            callback(c, fn, values[0], result);
            c.assert( result === t );
        });
    }

    for (var i = 0; i < tests.length; i++) {
        var tst = tests[i],
            fn = tst[0],
            passing = tst[1],
            failing = tst.length > 2 && tst[2] ? tst[2] : null;

        if(passing && passing.length > 0) {
            passing = [arbChoose.apply(this, passing)];
            declare(fn.description + ' must match', passing, makePred(fn, true, validPass, fnPass));
        }

        if(failing && failing.length > 0) {
            failing = [arbChoose.apply(this, failing)];
            declare(fn.description + ' must mismatch', failing, makePred(fn, false, validFail, fnFail));
        }
    }
}

function arbMultiple(primitives) {
    return {
        arb: function(size) {
            var len = genvalue(arbRange(2, Math.max(2, size)), size);
            var chooser = choose.apply(this, primitives);
            var argConfig = new Array(len);
            for (var i = 0; i < len; i++) {
                argConfig[i] = chooser();
            }
            return argConfig;
        }
    }
}

var arbEmptyFn = arbConst(function(){});

var primitives = [
    [any, [arbInt, arbDate, arbBool, arbNull, arbUndef, arbString, arbArray(arbChoose(arbInt, arbBool, arbDate))],
          []]

  , [bool, [arbBool], 
           [arbInt, arbDate, arbNull, arbUndef, arbString, arbArray(arbChoose(arbInt, arbDate))]]
  
  , [date, [arbDate], 
           [arbBool, arbInt, arbNull, arbUndef, arbString, arbArray(arbChoose(arbInt, arbBool))]]

  , [fun, [arbEmptyFn], 
          [arbBool, arbInt, arbNull, arbUndef, arbDate, arbString, arbArray(arbChoose(arbInt, arbBool))]]

  , [number, [arbChoose(arbInt, arbFloatUnit)],
             [arbBool, arbNull, arbUndef, arbDate, arbString, arbArray(arbBool, arbDate)]]

  , [object, [arbChoose(arbConst({}))],
             [arbNull, arbBool, arbInt, arbDate, arbString, arbFloatUnit, arbArray(arbBool, arbInt)]]

  , [undef, [arbUndef],
            [arbNull, arbBool, arbInt, arbDate, arbFloatUnit, arbString, arbArray(arbBool, arbInt)]]

  , [string, [arbString],
             [arbNull, arbBool, arbInt, arbDate, arbFloatUnit, arbArray(arbBool, arbInt)]]
];

mk(primitives);

//test 'not'
mk(primitives.map(function(x){
    return [not(x[0]), x[2], x[1]];
}));

//test 'array'
mk(primitives.map(function(x){
    return [array(x[0]),
            x[1].map(arbArray),
            x[2].concat(x[2].map(arbArray))];
}), { validFail: function (a) {
                     return !(a instanceof Array) || a.length > 0;
                 },
      fnFail: function(c, t, values, ret) {
          if(values instanceof Array) c.collect(values.length);
          else c.collect(typeof values);
      },
      fnPass: function(c, t, values, ret) {
          c.collect(values.length);
      }
    }
  );

//test 'maybe'
mk(primitives.map(function(x) {
    return [maybe(x[0]),
            x[1].map(arbNullOr),
            x[2] && x[2].length > 0 ? [arbChoose.apply(this, x[2])] : [] ];
}), {validFail: function (x) { return x !== null; }});

//test 'or'
declare('or must match', [arbMultiple(primitives), justSize],
        function(c,ps, size) {
            var typ = or.apply(this, ps.map($aref(0)));
            var generator = choose.apply(this, ps.map($aref(1)))();
            var value = generator.map(genvalue.rcurry(size));

            c.collect(typ.description);

            c.noteArg(typ.description);
            c.noteArg(generator);
            c.noteArg(value);

            var result = test(typ)(value);
            c.noteArg(result);
            c.assert( result === true );
        });

declare('or must mismatch', [arbMultiple(primitives.slice(1)), justSize],
        function(c, ps, size){
            var typ = or.apply(this, ps.map($aref(0)));
            var generators = ps.map($aref(2)).foldl(function(g,a){
                return g.intersection(a);
            });
            c.guard(generators.length > 0);

            var generator = choose.apply(this, generators)();
            var value = genvalue(generator, size);

            c.collect(typ.description);
            c.noteArg(generator);
            c.noteArg(value);

            var result = test(typ)([value]);
            c.assert(result === false);
        });

declare('and must match', [arbMultiple(primitives), justSize],
        function(c, ps, size){
            var typ = and.apply(this, ps.map($aref(0)));
            var generators = ps.map($aref(1)).foldl(function(g,a){
                return g.intersection(a);
            });
            c.guard(generators.length > 0);
            var generator = choose.apply(this, generators)();
            var value = genvalue(generator, size);

            c.collect(typ.description);
            c.noteArg(generator);
            c.noteArg(value);

            var result = test(typ)([value]);
            c.assert(result === true);
        });

declare('and must mismatch', [arbMultiple(primitives), justSize],
        function(c, ps, size) {
            var typ = and.apply(this, ps.map($aref(0)));
            var generators = ps.map($aref(2)).foldl(function(g,a){
                return g.union(a);
            });
            c.guard(generators.length > 0);
            var generator = choose.apply(this, generators)();
            var value = genvalue(generator, size);

            c.collect(typ.description);
            var result = test(typ)([value]);
            c.assert(result === false);
        });

declare('product type must match', [arbMultiple(primitives), justSize],
        function(c, ps, size) {
            var typ = seq.apply(this, ps.map($aref(0)));
            var generators = ps.map($aref(1));
            var values     = generators.map(function(g){
                var generator = choose.apply(this, g)();
                return genvalue(generator, size);
            });

            c.collect(typ.description);
            var result = test(typ)(values);
            c.assert(result === true);
        });

declare('product type must not match', [arbMultiple(primitives.slice(1)), justSize],
        function(c, ps, size) {
            var typ = seq.apply(this, ps.map($aref(0)));
            var generatorIndices = ps.map(function(){
                return genvalue(arbBool, size) ? 1 : 2;
            });
            c.guard(!generatorIndices.every(function (i){ return i == 1; }));

            var generators = ps.map(function(x,i){
                return x[generatorIndices[i]];
            });

            var values = generators.map(function(g){
                var generator = choose.apply(this, g)();
                return genvalue(generator, size);
            });

            c.collect(typ.description);

            var result = test(typ)(values);
            c.assert(result === false);

        });

