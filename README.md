
Introduction
============

js_contracts offers very simple dynamic type checking combinators to be used
directly within your JavaScript programs/libraries or optionally as extensions
by defining Signatures which will be mixed into your existing
programs/libraries using Aspect Oriented Programming techniques. 
Due to the simplicity of the combinators one can insert even extensive type
checks with very minimal effort.  
Using Signatures to be mixed in one can opt to use Signatures while
development and then leaving them out when deploying. Library authors may want
to ship developer versions with Signature files and deployment versions
without type checking (which will additionally reduce source size). So
'dynamic' type checking is fully optional and the extra cycles needed to do
type checking can be omitted when deploying later.

Requirements
============

## Runtime

Libraries you must load to use js_contracts

- [js mylib](http://github.com/urso/js_mystdlib):  
  just some functions and AOP support used throughout js_contracts.

## Building API/Documentation

In order to build the documentation you will need:

- [jsdoc toolkit](http://code.google.com/p/jsdoc-toolkit/).
  It is also recommended to set the JSDOCDIR environment variable

- [jsdoc simple template](http://github.com/urso/jsdoc-simple):  
  just copy 'jsdoc-simple' directory to jsdoc toolkit's template directory

- run './mkdoc' shell command (needs *nix shell).

Usage
=====

To use contracts you can choose to use them directly and build predicate
functions which may return true/false or optionally throw an exception 
with typing description on type checking or alternatively provide a signature
being mixed into another(even the global namespace) namespace/object.

To create a predicate function from a signature description use one of 
these functions:

- Contracts.test(types...):  
  builds predicate function returning true/false when type checking

- Contracts.contract(types...):  
  builds predicate function which throws a ContractError exception on type
  error and true else.

When using contract descriptions directly it is often desirable to throw an
exception on type error and to check for types at the beginning of the
function. For example:

    function foo(x,str) {
        contract(number, string)(arguments);
        ...
    }

Also you can transform a Signature description to a String for printing with
**Contracts.signatureToString(&lt;signature&gt;)** or ask for a type description's
string representation by reading the 'description' field.  
For Example:

    string.description // -> "type string"

    or(maybe(string), number).description 
    // -> "(maybe(type string)) | (type number)"

    seq(number,number,string).description
    // -> "(type number) x (type number) x (type string)"
    
    proc(string, number, number).description
    // -> "(type string) x (type number) -> (type number)"

    proc(string, proc(string, number), number).description
    // -> "(type string) x ((type string) -> type number) -> type number"

    signatureToString({
        a: number,
        b: string,
        c: proc(string, number)
    })
    // -> "{ a: type number,
    //       b: type string,
    //       c: (type string) -> type number
    //     }"

To mix in a signature into a namespace/object/class use 
Contracts.addSignature(&lt;signature&gt;, &lt;object/namespace&gt;).

## Primitives

Supported primitive types are:  
any (will always type check successfully), bool, date, fun, number, object,
regex, string and undef. 

Using the functions **Contracts.inst** and **Contracts.record** one can add
new type primitives.

**Contracts.inst** will check if a given value is an instance of a given class
and **Contracts.record** is given an object description (an object with fields
set to their type descriptions), thus one can check on the structure of
given values.
For example:

    function Foo(...) {
    }

    foo = inst(Foo) 
    // -> new contract "foo" testing for a given value x:
    // x instanceof Foo
    
    callback_t = record({
        description: string,
        failure : fun,
        success: fun
    })
    // -> new contract "callback_t" testing for a given value x:
    // - x must have fields description, failure and success
    //   + description must be a string and failure/success 
    //   a function object.

## Testing For 'null'

Null pointer, the billion dollar mistake. All primitive contracts but
**Contracts.any** will fail, if a null value is passed in. If you still want
to use null in some locations you have to use the 
**Contracts.maybe(&lt;type&gt;)** modifier. For example

    maybe(string) // this contract will match only string and null

## Combining Primitives

and, or: logical and/or on test predicates to build more complex scenarios

seq: create tuple type

TODO: write some text and example

## (Higher Order) Functions (and backtracking type checks)

Contracts.proc

TODO: example and write sth about proc

- when using higher order functions:
    - type checks will be added automatically
    - added checks do remember complete types they were added for
    - when used with signatures even function name will be remembered
      so when error occurs later, one can tell easily where the
      functions was created/used.

## Signatures

Signature is just an object with fields for every symbols type checks should
be added to. Most often on wants to annotate functions/methods only.

TODO: 

For example:

    //import Contracts namespace ....
    for (var s in Contracts) this[s] = Contracts[s];

    var Obj = new function () {
        
        this.a = function (a, b) { 
            return a + b; 
        };
        
        this.b = function(a){
            return function(b){
                return a + b;
            }
        };
        
        this.c = function(a){
            return function (b){
                return function(c){
                    return a + b + c;
                }
            }
        }

    };

    var ObjSignature = {
     a: proc( number, number, /** -> */ number),  // num x num -> num
     b: proc( number, proc( number, number )),    // num -> num -> num
     c: proc( number, proc( number, proc( number, number))) // num -> num -> num -> num
    };

    // add signature
    addSignature(ObjSignature, Obj)

