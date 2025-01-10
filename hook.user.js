// ==UserScript==
// @name         ConsoleHook
// @namespace    http://tampermonkey.net/
// @version      2025-01-10
// @description  utils of hook javascript function and value changes for js reverse engineering
// @author       @Esonhugh
// @match        http://*
// @match        https://*
// @include        http://*
// @include        https://*
// @icon         https://blog.eson.ninja/img/reol.png
// @grant        none
// @license     MIT
// @run-at document-start
// ==/UserScript==

(function () {
  console.hooks = {
    // settings
    settings: {
      // trigger debugger if hook is caught
      autoDebug: false,
      // don't let page jump to other place
      blockPageJump: false,
      // log prefix
      prefix: "[EHOOKS] ", // u can filter all this things with this tag
      // init with eventListener added
      checkEventListnerAdded: false,
      // init with cookie change listener
      checkCookieChange: false,
      // init with localstorage get set
      checkLocalStorageGetSet: false,
      // anti dead loop debugger in script
      antiDeadLoopDebugger: true,

      // hidden too many default debug logs if you don't need it
      hiddenlog: false,
    },

    rawlog: function (...data) {
      if (this.settings.hiddenlog) {
        return; // don't print
      }
      return console.debug(...data);
    },

    log: console.warn,

    debugger: function () {
      // traped in debug
      if (this.settings.autoDebug) {
        // dump the real stack for u
        this.dumpstack();
        debugger;
      }
    },

    hooked: {},

    dumpstack(print = true) {
      var err = new Error();
      ret = err.stack
        .split("\n")
        .slice(2) // delete Error and dumpstack self
        .reverse()
        .concat(`${this.settings.prefix}Stack Dump -> STACK TOP`)
        .reverse()
        // add StackDump message at top
        .join("\n");
      if (print) {
        this.log(ret);
      }
      return ret;
    },

    dumpHooked() {
      for (var i in this.hooked) {
        this.log(`${i}: `, this.hooked[i]);
      }
    },

    hookfunc: function (
      object,
      functionName,
      posthook = () => {},
      prehook = () => {}
    ) {
      (function (originalFunction) {
        object[functionName] = function () {
          // hook logic
          // 1. Allow Check
          var args = prehook([originalFunction, arguments, this]);
          var realargs = arguments;
          if (args) {
            realargs = args;
          } else {
            realargs = arguments;
          }
          // 2. Execute old function
          var returnValue = originalFunction.apply(this, realargs);
          console.hooks.rawlog(
            `${console.hooks.settings.prefix}Hook function trap-> func[${functionName}]`,
            "args->",
            realargs,
            "ret->",
            returnValue
          );
          console.hooks.debugger();
          // 3. Post hook change values
          var newReturn = posthook([
            returnValue,
            originalFunction,
            realargs,
            this,
          ]);
          if (newReturn) {
            return newReturn;
          }
          return returnValue;
        };
        object[functionName].toString = function () {
          console.hooks.rawlog(
            `${console.hooks.settings.prefix}Found hook toString check!`,
            originalFunction
          );
          console.hooks.debugger();
          return originalFunction.toString();
        };
        console.hooks.hooked[functionName] = originalFunction;
      })(object[functionName]);
      this.rawlog(
        `${console.hooks.settings.prefix}Hook function`,
        functionName,
        "success!"
      );
    },

    unhookfunc: function (object, functionName) {
      object[functionName] = console.hooks.hooked[functionName];
      this.rawlog(
        `${console.hooks.settings.prefix}unHook function`,
        functionName,
        "success!"
      );
    },

    hookCookie: function () {
      try {
        var cookieDesc =
          Object.getOwnPropertyDescriptor(Document.prototype, "cookie") ||
          Object.getOwnPropertyDescriptor(HTMLDocument.prototype, "cookie");
        if (cookieDesc && cookieDesc.configurable) {
          this.hooked["Cookie"] = document.cookie;
          Object.defineProperty(document, "cookie", {
            set: function (val) {
              console.hooks.rawlog(
                `${console.hooks.settings.prefix}Hook捕获到cookie设置->`,
                val
              );
              console.hooks.debugger();
              console.hooks.hooked["Cookie"] = val;
              return val;
            },
            get: function () {
              return (console.hooks.hooked["Cookie"] = "");
            },
            configurable: true,
          });
        } else {
          var org = document.__lookupSetter__("cookie");
          document.__defineSetter__("cookie", function (cookie) {
            console.hooks.rawlog(
              `${console.hooks.settings.prefix}Cookie Set as`,
              cookie
            );
            console.hooks.debugger();
            org = cookie;
          });
          document.__defineGetter__("cookie", function () {
            console.hooks.rawlog(
              `${console.hooks.settings.prefix}Cookie Got`,
              org
            );
            console.hooks.debugger();
            return org;
          });
        }
      } catch (e) {
        this.rawlog(`${console.hooks.settings.prefix}Cookie hook failed!`);
      }
    },

    hookLocalStorage: function () {
      this.hookfunc(localStorage, "getItem");
      this.hookfunc(localStorage, "setItem");
      this.hookfunc(localStorage, "removeItem");
      this.hookfunc(localStorage, "clear");
      this.rawlog(`${console.hooks.settings.prefix}LocalStorage hooked!`);
    },

    hookValueViaGetSet: function (name, obj, key) {
      if (obj[key]) {
        this.hooked[key] = obj[key];
      }
      var obj_name = `${name}.${key}`;
      var org = obj.__lookupSetter__(key);
      obj.__defineSetter__(key, function (val) {
        org = console.hooks.hooked[key];
        console.hooks.rawlog(
          `${console.hooks.settings.prefix}Hook value set `,
          obj_name,
          "value->",
          org,
          "newvalue->",
          val
        );
        console.hooks.debugger();
        console.hooks.hooked[key] = val;
      });
      obj.__defineGetter__(key, function () {
        org = console.hooks.hooked[key];
        console.hooks.rawlog(
          `${console.hooks.settings.prefix}Hook value get `,
          obj_name,
          "value->",
          org
        );
        console.hooks.debugger();
        return org;
      });
    },

    hookValueViaProxy: function (name, obj, key = "default_all") {
      var obj_name = "OBJ_" + name;
      return new Proxy(obj, {
        get: function (target, property, receiver) {
          var ret = target[property];
          if (key === "default_all") {
            console.hooks.rawlog(
              `${console.hooks.settings.prefix}Hook Proxy value get`,
              `${obj_name}.${property}`,
              "value->",
              ret
            );
            console.hooks.debugger();
          }
          if (property == key && key != "default_all") {
            console.hooks.rawlog(
              `${console.hooks.settings.prefix}Hook Proxy value get`,
              `${obj_name}.${property}`,
              "value->",
              ret
            );
            console.hooks.debugger();
          }
          return target[property];
        },
        set: function (target, property, newValue, receiver) {
          var ret = target[property];
          if (key === "default_all") {
            console.hooks.rawlog(
              `${console.hooks.settings.prefix}Hook Proxy value set`,
              `${obj_name}.${property}`,
              "value->",
              ret,
              "newvalue->",
              newValue
            );
            console.hooks.debugger();
          }
          if (property == key && key != "default_all") {
            console.hooks.rawlog(
              `${console.hooks.settings.prefix}Hook Proxy value get`,
              `${obj_name}.${property}`,
              "value->",
              ret,
              "newvalue->",
              newValue
            );
            console.hooks.debugger();
          }
          target[property] = newValue;
          return true;
        },
      });
    },

    hookValueViaObject: function (name, obj, key) {
      var obj_desc = Object.getOwnPropertyDescriptor(obj, key);
      if (!obj_desc || !obj_desc.configurable || obj[key] === undefined) {
        return Error("No Priv to set Property or No such keys!");
      }
      var obj_name = "OBJ_" + name;
      this.hooked[obj_name] = obj[key];
      Object.defineProperty(obj, key, {
        configurable: true,
        get() {
          console.hooks.rawlog(
            `${console.hooks.settings.prefix}Hook Object value get`,
            `${obj_name}.${key}`,
            "value->",
            console.hooks.hooked[obj_name]
          );
          console.hooks.debugger();
          return console.hooks.hooked[obj_name];
        },
        set(v) {
          console.hooks.rawlog(
            `${console.hooks.settings.prefix}Hook Proxy value get`,
            `${obj_name}.${key}`,
            "value->",
            console.hooks.hooked[obj_name],
            "newvalue->",
            v
          );
          console.hooks.hooked[obj_name] = v;
        },
      });
    },

    hookEvents: function (params) {
      var placeToReplace;
      if (window.EventTarget && EventTarget.prototype.addEventListener) {
        placeToReplace = EventTarget;
      } else {
        placeToReplace = Element;
      }
      this.hookfunc(
        placeToReplace.prototype,
        "addEventListener",
        function (res) {
          let [ret, originalFunction, arguments] = res;
          console.hooks.rawlog(
            `${console.hooks.settings.prefix}Hook event listener added!`,
            arguments
          );
        }
      );
    },

    antiDebuggerLoops: function () {
      processDebugger = (type, res) => {
        let [originalFunction, arguments, t] = res;
        var handler = arguments[0];
        console.hooks.debugger();
        if (handler.toString().includes("debugger")) {
          console.hooks.log(
            `${console.hooks.settings.prefix}found debug loop in ${type}`
          );
          console.hooks.debugger();
          let func = handler.toString().replaceAll("debugger", "");
          arguments[0] = new Function("return " + func)();
          return arguments;
        } else {
          return arguments;
        }
      };

      this.hookfunc(
        window,
        "setInterval",
        () => {},
        (res) => {
          return processDebugger("setInterval", res);
        }
      );
      this.hookfunc(
        window,
        "setTimeout",
        () => {},
        (res) => {
          return processDebugger("setTimeout", res);
        }
      );

      this.hookfunc(Function.prototype, "constructor", (res) => {
        let [ret, originalFunction, arguments, env] = res;
        if (ret.toString().includes("debugger")) {
          console.hooks.log(
            `${console.hooks.settings.prefix}found debug loop in Function constructor`
          );
          console.hooks.debugger();
          let func = ret.toString().replaceAll("debugger", "");
          return new Function("return " + func)();
        }
        return ret;
      });
    },

    init: function () {
      if (this.settings.blockPageJump) {
        window.onbeforeunload = function () {
          return "ANTI LEAVE";
        };
      }
      if (this.settings.checkEventListnerAdded) {
        this.hookEvents();
      }
      if (this.settings.checkCookieChange) {
        this.hookCookie();
      }
      if (this.settings.checkLocalStorageGetSet) {
        this.hookLocalStorage();
      }
      if (this.settings.antiDeadLoopDebugger) {
        this.antiDebuggerLoops();
      }
    },

    main: function () {
      this.hookfunc(window, "eval");
      this.hookfunc(window, "Function");
      this.hookfunc(window, "atob");
      this.hookfunc(window, "btoa");
      this.hookfunc(window, "fetch");
      this.hookfunc(window, "encodeURI");
      this.hookfunc(window, "encodeURIComponent");

      this.hookfunc(JSON, "parse");
      this.hookfunc(JSON, "stringify");

      this.hookfunc(console, "log");
      // this.hookfunc(console, "warn")
      // this.hookfunc(console, "error")
      // this.hookfunc(console, "info")
      // this.hookfunc(console, "debug")
      // this.hookfunc(console, "table")
      // this.hookfunc(console, "trace")
      this.hookfunc(console, "clear");
    },
  };

  // auto run init
  console.hooks.init();
})();
