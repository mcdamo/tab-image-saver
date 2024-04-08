// rule based expressions
import ExpressionEval from "jse-eval";
import regex from "@jsep-plugin/regex";
ExpressionEval.jsep.plugins.register(regex);

const Expressions = {
  parse: (string) => {
    const ast = ExpressionEval.parse(string);
    return ast;
  },

  evaluate: async (string, obj) => {
    const ast = Expressions.parse(string);
    // use proxy for case insensitive lookups of properties and functions
    const proxyObj = new Proxy(obj, {
      get: (target, name) => {
        if (/^(sanitize|safe)path$/i.test(name)) {
          // call proxied function from Utils
          return (...args) => target.sanitizePath.apply(null, args);
        }
        if (/^(sanitize|safe)file(name)?$/i.test(name)) {
          // call proxied function from Utils
          return (...args) => target.sanitizeFilename.apply(null, args);
        }
        if (/^(xname|xext|xmimeext)$/i.test(name)) {
          // call async function from Background.createFilename
          return target[name.toLowerCase()]();
        }
        if (Object.prototype.hasOwnProperty.call(target, name.toLowerCase())) {
          return target[name.toLowerCase()];
        }
        return "";
      },
    });
    const ret = await ExpressionEval.evalAsync(ast, proxyObj);
    return ret;
  },
};

export default Expressions;
