// var hook = require('./hook.user')
// console.hooks.hookfunc(console, "log")

obj = {
    keyA: "As",
    KeyB: 1231213123,
    Key: "3",
    func: () => {
        return "123231"
    },
    func2: (res) => {
        return res + 1
    }
}

console.hooks.hookValueViaObject("objx", obj, "Key" )

// obj = console.hooks.hookValueViaProxy("objx", obj)
obj.keyA
obj.Key
obj.KeyB = "1231"

// console.hooks.hookValueViaGetSet("objx",obj, "Key")
obj.keyA = "12312"
obj.Key = "B"
obj.Key = "C"

console.log(obj.func())

console.hooks.hookfunc(obj, "func", function (res) {
    let [ret, originalFunction, arguments, env] = res;
    return "114514"
})
console.log(obj.func())

/*
setInterval(function () {
    console.log("debugger!");
    debugger
}, 123);

setInterval(()=> {
    debugger
}, 123)

console.hooks.hookfunc(obj, "func2", ()=>{}, (res)=>{
    let [originalFunction, arguments, t] = res;
    var handler = arguments[0];
    console.log(handler)
    return [123]
})

obj.func2(12);

function re(){ Function["constructor"]("return () => {debugger}")["call"]("action")}

setInterval(re, 123);

function a() {
    function b() {
        function c() {
            console.log(12)
            console.log(console.hooks.dumpstack())
        }
        c()
    }
    b()
}
a()
*/