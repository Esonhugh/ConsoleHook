vueinfo = {
  findVueRoot(root) {
    const queue = [root];
    while (queue.length > 0) {
      const currentNode = queue.shift();

      if (
        currentNode.__vue__ ||
        currentNode.__vue_app__ ||
        currentNode._vnode
      ) {
        console.hooks.log("vue detected on root element:", currentNode);
        return currentNode;
      }

      for (let i = 0; i < currentNode.childNodes.length; i++) {
        queue.push(currentNode.childNodes[i]);
      }
    }

    return null;
  },
  findVueRouter(vueRoot) {
    let router;

    try {
      if (vueRoot.__vue_app__) {
        router =
          vueRoot.__vue_app__.config.globalProperties.$router.options.routes;
        console.hooks.log("find router in Vue object", vueRoot.__vue_app__);
      } else if (vueRoot.__vue__) {
        router = vueRoot.__vue__.$root.$options.router.options.routes;
        console.hooks.log("find router in Vue object", vueRoot.__vue__);
      }
    } catch (e) {}

    try {
      if (vueRoot.__vue__ && !router) {
        router = vueRoot.__vue__._router.options.routes;
        console.hooks.log("find router in Vue object", vueRoot.__vue__);
      }
    } catch (e) {}

    return router;
  },
  walkRouter(rootNode, callback) {
    const stack = [{ node: rootNode, path: "" }];

    while (stack.length) {
      const { node, path } = stack.pop();

      if (node && typeof node === "object") {
        if (Array.isArray(node)) {
          for (const key in node) {
            stack.push({
              node: node[key],
              path: this.mergePath(path, node[key].path),
            });
          }
        } else if (node.hasOwnProperty("children")) {
          stack.push({ node: node.children, path: path });
        }
      }

      callback(path, node);
    }
  },
  mergePath(parent, path) {
    if (path.indexOf(parent) === 0) {
      return path;
    }

    return (parent ? parent + "/" : "") + path;
  },
  dump() {
    const vueRoot = this.findVueRoot(document.body);
    if (!vueRoot) {
      console.error("This website is not developed by Vue");
      return;
    }

    let vueVersion;
    if (vueRoot.__vue__) {
      vueVersion = vueRoot.__vue__.$options._base.version;
    } else {
      vueVersion = vueRoot.__vue_app__.version;
    }

    console.hooks.log("Vue version is ", vueVersion);
    const routers = [];

    const vueRouter = this.findVueRouter(vueRoot);
    if (!vueRouter) {
      console.error("No Vue-Router detected");
      return;
    }

    console.hooks.log(vueRouter);
    this.walkRouter(vueRouter, function (path, node) {
      if (node.path) {
        routers.push({ name: node.name, path });
      }
    });
    console.table(routers);
    return routers;
  }
}
