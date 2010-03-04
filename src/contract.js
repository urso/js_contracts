
/**
 * @fileOverview Contracts Module for dynamic runtime type checking 
 *
 * depends on: file.js. aop.js
 */

/**
 * @namespace
 */
var Contracts = new function () {

    /**
     * ErrorClass of namespace Contracts which is thrown when a type error is
     * detected.
     *
     * @param {String} description input String describing the error for
     *                 reporting
     * @param {Array}  arg Array of arguments the error is created for
     *
     * @class
     */
    this.ContractError = function (description, arg) {
        /** @field */
        this.description = description;

        /** @field */
        this.arg = arg;

        return this;
    };

    this.ContractError.prototype.run = function () { 
        return this; 
    };

    /**
     * Contract class holding a contracts type description as String to be
     * shown on request or when an error is thrown and a predicate input
     * arguments are tested with.
     *
     * @param {Predicate} test the type testing predicate
     * @param {String} description type description
     *
     * @class
     */
    this.Contract = function (test, description) {
        /** 
         * type testing predicate.
         * @field 
         */
        this.test = test;

        /** 
         * type description
         * @field 
         * */
        this.description = description;
        
        /**
         * Tests the given arguments and throws error if type mismatch is found
         *
         * @param arg Array of arguments to test
         * @return the Contract element itself or a new ContractError(not
         *         thrown) element on error
         */
        this.run = function (arg) {
            return test(arg) ? this : new Contracts.ContractError(description, arg);
        };

        return this;
    };
        
    /**
     * matches any input value.
     *
     * @constant
     */
    this.any = new this.Contract(function () { 
            return true; 
        }, "any");
    
    /**
     * tests if contract matched a given type.
     *
     * @param c contract application result
     * @return true if contract test was successful
     */
    this.success = function (c) {
        return c instanceof Contracts.Contract;
    };
    
    /**
     * tests if contract did not matched a given type.
     *
     * @param c contract application result
     * @return true if contract test was not successful
     */
    this.failure = function (c) {
        return c instanceof Contracts.ContractError;
    };
    
    var Contract = this.Contract;
    function mkCheckT(x) {
        return new Contract(function (arg) { 
                return arg !== null && typeof arg === x; 
            }, "type " + x);
    }
    
    /**
     * contract testing if input argument is instance of a given class.
     * @param {Class} x the class inputs must be instance of
     * @return new contract
     */
    this.inst = function (x) {
        return new this.Contract(function (arg) { 
                return arg instanceof x; 
            }, "instance of " + x.name);
    };
    
    function description_join(cs, word) {
        if (!cs || cs.length === 0) {
            return "";
        }
        
        var msg = cs[0].description;
        for (var i = 1; i < cs.length; i++) {
            msg += word + cs[i].description;
        }
        return msg;
    }
    
    function mk_recorddescription(R) {
        var msg = "{";
        var fields = [];
        for (var f in R) {
            fields.push(f);
        }
        msg += fields[0] + ": " + R[fields[0]].description;
        for (var i = 1; i < fields.length; i++) {
            msg += ",\n " + fields[i] + ": " + R[fields[i]].description;
        }
        return msg + "\n}";
    }
    
    /**
     * is the conjunctive contract combinator.
     *
     * @param tsts... list of contracts
     * @return new conjunctive contract (all input contracts must success)
     */
    this.and = function (/* tsts */) {
        var tsts = arguments;
        function test(arg) {
            var t;
            for (var i = 0; i < tsts.length; i++) {
                t = tsts[i].run(arg);
                if (Contracts.failure(t)) {
                    return false;
                }
            }
            return true;
        }
        
        return new Contract(test, "(" + description_join(tsts, ") & (") + ")");
    };
    
    /**
     * is the disjunctive contract combinator.
     *
     * @param tsts... list of contracts
     * @return new disjunctive contract (just one of the given contracts must
     *                                   match successfully)
     */
    this.or = function (/* tsts */) {
        var tsts = arguments;
        function test(arg) {
            var t;
            for (var i = 0; i < tsts.length; i++) {
                t = tsts[i].run(arg);
                if (Contracts.success(t)) {
                    return true;
                }
            }
            return false;
        }
        
        return new Contracts.Contract(test, "(" + description_join(tsts, ") | (") + ")");
    };
    
    /**
     * inverts success and failure of a contract.
     *
     * @param tst a contract to create the complement for
     * @return new complement contract of input contract
     */
    this.not = function (tst) {
        function test(arg) {
            var t = tst.run(arg);
            return Contracts.failure(t);
        }
        return new Contract(test, "not(" + tst.description + ")");
    };
    
    /**
     * creates contract from given one which will match null successfully.
     *
     * @param tst input contract for case input is not null @return new
     * contract using input contract if input value is not null
     */
    this.maybe = function (tst) {
        function test(arg) {
            return arg === null || 
                   Contracts.success(tst.run(arg));
        }
        return new Contracts.Contract(test, "maybe(" + tst.description + ")");
    };

    /**
     * ad hoc polymorphic array contract.
     *
     * @param t type every array element must have
     * @return new contract testing each element in a given array with t.
     */
    this.array = function (t) {
        var any = this.any;
        var tst = t || any;
        var test;
        if (tst === any) {
            test = function (arg) { 
                return arg instanceof Array; 
            };
        } else {
            test = function (arg) {
                if (!(arg instanceof Array)) {
                    return false;
                }
                    
                var t;
                for (var i = 0; i < arg.length; i++) {
                    t = tst.run(arg[i]);
                    if (Contracts.failure(t))  {
                        return false;
                    }
                }
                return true;
            };
        }
            
        return new Contract(test, "[" + tst.description + "]");
    };
        
    /**
     * creates a product type contract.<br/>
     * for example seq(string,number) creates a 
     * contract for arguments list [string,number].
     *
     * @param contracts... input contracts to build product type contract from
     * @return new product type contract.
     */
    this.seq = function () {
        var cs = arguments.length === 1 && arguments[0] instanceof Array ?
        arguments[0] : arguments;
            
        if (cs.length === 1) {
            return cs[0];
        }
    
        function test(arg) {
            if (cs.length !== arg.length) {
                return false;
            }
            for (var i = 0; i < arg.length; i++) {
                if (Contracts.failure(cs[i].run(arg[i]))) {
                    return false;
                }
            }
            return true;
        }
            
        return new Contracts.Contract(test, "(" + description_join(cs, ") x (") + ")");
    };
        
    /**
     * create a contract testing function by building a product type contract
     * from given contracts.
     *
     * @param contracts... input contracts to build product type contract from
     * @return testing function wich throws ContractError if given arguments
     *         don't match given contracts else true.
     */
    this.contract = function () {
        var Cs = Contracts.seq.apply(this, arguments);
        return function (arg) {
            var t = Cs.run(arg);
            if (Contracts.success(t)) {
                return true;
            }
            throw t;
        };
    };
        
    /**
     * create a contract testing function by building a product type contract
     * from given contracts
     *
     * @param contract... input contract to build a product type contract from
     * @return testing function which will return true if given arguments
     *         match and false else.
     */
    this.test = function () {
        var Cs = Contracts.seq.apply(this, arguments);
        return function () {
            var arg = arguments[0].length === 1 ? arguments[0][0] : arguments[0];
            return Contracts.success(Cs.run(arg));
        };
    };
        
    /**
     * record creates a contract from a given Object with each field in the
     * object having a type description. When testing the contract the input
     * is tested for each field in the type pattern object. If the testing
     * object has a missing field or a type mismatch in any field is found the
     * contract will fail.
     *
     * @param {Object} R object with field type description.
     * @return a new contract testing the structure of its values
     */
    this.record = function (R) {
        function test(arg) {
            if (!(arg instanceof Object)) {
                return arg;
            }
                
            for (var field in arg) {
                if (arg[field] === undefined || 
                    Contracts.failure(R[field].run(arg[field]))) 
                {
                    return false;
                }
            }
            return true;
        }
        return new Contracts.Contract(test, mk_recorddescription(R));
    };
    
    /**
     * Class for describing function/method contracts with input and output
     * contracts.
     *
     * DON'T USE THIS CLASS DIRECTLY. USE FUNCTION "proc" INSTEAD.
     *
     * @class
     * @private
     */
    this.ProcContract = function (input, ret) {
        this.input = input;
        this.ret = ret;
        this.description = input.description + " -> " + ret.description;
        return this;
    };
    
    /**
     * Describe the signature of a function. The last function argument is used to
     * be the functions return value type.
     *
     * @param types... list of type descriptions. Last one is the function's
     *                 return type.
     *
     * @return type description for functions
     */
    this.proc = function () {
        var input = new Array(arguments.length);
        for (var i = 0; i < arguments.length; i++) {
            input[i] = arguments[i];
        }
        var ret = input.pop();
        
        return new Contracts.ProcContract(Contracts.seq(input), ret);
    };
    
    /**
     * String type matching contract.
     * @constant
     */
    this.string = mkCheckT('string');

    /**
     * Number type matching contract.
     * @constant
     */
    this.number = mkCheckT('number');

    /**
     * Boolean type matching contract.
     * @constant
     */
    this.bool   = mkCheckT('boolean');

    /**
     * Date type matching contract.
     * @constant
     */
    this.date   = this.inst(Date);

    /**
     * RegExp type matching contract.
     * @constant
     */
    this.regex  = this.inst(RegExp);

    /**
     * Function type matching contract (no testing of input or output to function)
     * @constant
     */
    this.fun    = mkCheckT('function');

    /**
     * contract matching any object.
     * @constant
     */
    this.object = this.and(mkCheckT('object'),
                           this.not(this.array(this.any)),
                           this.not(this.date));

    /**
     * contract matching "undefined".
     * @constant
     */
    this.undef   = mkCheckT('undefined');
    
    function mk_testFnContract(signature, symb) {
        return function (proceed, args) {
            if (!Contracts.test(signature.input)(args)) {
                throw new Error("input type mismatch in " + symb + 
                                ": " + signature.input.description);
            }
            
            var ret = proceed.apply(this, args);
            if (signature.ret instanceof Contracts.ProcContract) {
                if (typeof ret !== 'function') {
                    throw new Error("output type mismatch in " + symb + 
                                    ": " + signature.ret.description +
                                    "\nbut returned value is no function: " + ret);
                } else if (!ret.$sigFn) { //add signature contract if function has non yet
                    var retTstFn = mk_testFnContract(signature.ret, symb + "->anonym");
                    var fn = function () {
                        return retTstFn(ret, arguments);
                    };
                    fn.$sigFn = true;
                    return fn;
                }
            } else if (!Contracts.test(signature.ret)(ret)) {
                throw new Error("output type mismatch in " + symb + 
                                ": " + signature.ret.description +
                                "\nbut returned" + ret);
            }
            
            return ret;
        };
    }
    
    /**
     * Adds a Signature to a given Object/Namespace/Class.  The signature
     * itself is an object with every field having a type description for each
     * method/field to annotate in the input object.  Fields
     * (variables/constants) are tested with the given contract and methods
     * are overwritten using AOP to do type checking first when called.
     *
     * @param {Object} sig signature to add to object
     * @param {Object} obj the object to annotate
     *
     * @throws Error if a symbol in sig is not found in obj or a field/constant
     *               in object has a wrong type.
     */
    this.addSignature = function (sig, obj) {
        Contracts.contract(Contracts.object, Contracts.object)(arguments);
    
        for (var symb in sig) {
            if (obj[symb] === 'undefined') {
                throw new Error("signature symbol " + symb + "not found in object");
            }
        
            //check if signature and objects symbol
            //type match
            
            if (typeof obj[symb] === 'function' && sig[symb] instanceof Contracts.ProcContract) {
                var fn = mk_testFnContract(sig[symb], symb);
                fn.$sigFn = true;
                
                AOP.around(obj, symb, fn);
            } else if (!Contracts.test(sig[symb])(obj[symb])) {
                throw new Error("Signature type mismatch for " + symb);
            }
        }
    };
    
    /**
     * creates a String from a given Signature.
     *
     * @param S the signature to create String for
     * @return description String
     *
     * @function
     */
    this.signatureToString = mk_recorddescription;

    return this;
};

