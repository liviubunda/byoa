'use strict';

var _ = require('lodash'),
    Scope = require('../src/scope');

describe('Scope', function() {
   it('can be constructed and used as an object', function() {
       var scope = new Scope();
       scope.aProperty = 1;
       expect(scope.aProperty).toBe(1);
   });

    describe('digest', function() {

        var scope;

        beforeEach(function() {
            scope = new Scope();
        });

        it('calls the listener function of a watch on first $digest', function() {
            var watchFn = function() { return 'wat';},
                listenerFn = jasmine.createSpy();

            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(listenerFn).toHaveBeenCalled();
        });

        it('calls the watch function with the scope as the argument', function() {
            var watchFn = jasmine.createSpy(),
                listenerFn = function() {};

            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(watchFn).toHaveBeenCalledWith(scope);
        });

        it('calls the listener function when the watched value changes', function() {
            scope.someValue = 'a';
            scope.counter = 0;

            scope.$watch(
                function(scope) {return scope.someValue;},
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            expect(scope.counter).toBe(0);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.someValue = 'b';

            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('calls the listener when watch value is first undefined', function() {
            scope.counter = 0;

            scope.$watch(
                function(scope) { return scope.someValue; },
                function(newValue, oldValue, scope) { scope.counter++;}
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('calls listener with new value as old value the first time', function() {
            var oldValueGiven;

            scope.someValue = 123;

            scope.$watch(
                function(scope) { return scope.someValue; },
                function(newValue, oldValue, scope) { oldValueGiven = oldValue; }
            );

            scope.$digest();
            expect(oldValueGiven).toBe(123);
        });

        it('may have watchers that omit the listener function', function() {
            var watchFn = jasmine.createSpy().and.returnValue('something');
            scope.$watch(watchFn);
            scope.$digest();
            expect(watchFn).toHaveBeenCalled();
        });

        it('triggers chained watchers in the same digest', function(){
            scope.name = 'Jane';

            scope.$watch(
                function(scope) { return scope.nameUpper; },
                function(newValue, oldValue, scope) {
                    if (newValue) {
                        scope.initial = newValue.substring(0,1) + '.';
                    }
                }
            );

            scope.$watch(
                function(scope) { return scope.name; },
                function(newValue, oldValue, scope) {
                    if (newValue) {
                        scope.nameUpper = newValue.toUpperCase();
                    }
                }
            );

            scope.$digest();
            expect(scope.initial).toBe('J.');

            scope.name = 'Bob';
            scope.$digest();
            expect(scope.initial).toBe('B.');
            
        });

        it('gives up on the watches after 10 iterations', function() {
            scope.counterA = 0;
            scope.counterB = 0;

            scope.$watch(
                function(scope) { return scope.counterA; },
                function(newValue, oldValue, scope) {
                    scope.counterB++;
                }
            );

            scope.$watch(
                function(scope) { return scope.counterB; },
                function(newValue, oldValue, scope) {
                    scope.counterA++;
                }
            );

            expect(function() {scope.$digest();}).toThrow();
        });

        it('ends the digest when the last watch is clean', function() {
            var watchExecutions = 0;

            scope.array = _.range(100);

            _.times(100, function(i) {
                scope.$watch(
                    function(scope) {
                        watchExecutions++;
                        return scope.array[i];
                    },
                    function(newValue, oldValue, scope) {}
                );
            });

            scope.$digest();
            expect(watchExecutions).toBe(200);

            scope.array[0] = 420;
            scope.$digest();
            expect(watchExecutions).toBe(301);
        });

        it('does not end digest so that new watches are not run', function() {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.$watch(
                        function(scope) { return scope.aValue; },
                        function(newValue, oldValue, scope) {
                            scope.counter++;
                        }
                    );
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('compares based on value if enabled', function() {
            scope.aValue = [1, 2, 3];
            scope.counter = 0;

            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                },
                true
            );
            
            scope.$digest();
            expect(scope.counter).toBe(1);
            
            scope.aValue.push(4);
            scope.$digest();
            expect(scope.counter).toBe(2);
        });
        
        it('correctly handles NaNs', function() {
            scope.number = 0/0;
            scope.counter = 0;
            
            scope.$watch(
                function() { return scope.number; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            
            scope.$digest();
            expect(scope.counter).toBe(1);
            
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('catches exceptions in watch functions and continues', function() {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function(scope) {throw 'Error';},
                function(newValue, oldValue, scope) {}
            );

            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('catches exception in listener functions and continues', function() {
            scope.counter = 0;
            scope.aValue = 'abc';

            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    throw 'Error';
                }
            );

            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('allows destroying a $watch with a removal function', function() {
            scope.aValue = 'abc';
            scope.counter = 0;

            var destroyWatch = scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue = 'def';
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.aValue = 'ghi';
            destroyWatch();
            scope.$digest();
            expect(scope.counter).toBe(2);
        });
        
        it('allows destroying a $watch during a digest', function() {
            scope.aValue = 'abc';
            
            var watchCalls = [];
            
            scope.$watch(
                function(scope) {
                    watchCalls.push('first');
                    return scope.aValue;
                }
            );
            
            var destroyWatch = scope.$watch(
                function(scope) {
                    watchCalls.push('second');
                    destroyWatch();
                }
            );
            
            scope.$watch(
                function(scope) {
                    watchCalls.push('third');
                    return scope.aValue;
                }
            );
            
            scope.$digest();
            expect(watchCalls).toEqual(['first', 'second', 'third', 'first', 'third']);
        });
    });
});

































