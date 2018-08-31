const OptionsUI = {
  getOptionsSchema: async () => {
    const res = await browser.runtime.sendMessage({type: "OPTIONS_SCHEMA"});
    return res.body;
  },

  // option object with name and value
  onSaveOption: async o => {
    const res = await browser.runtime.sendMessage({
      type: "OPTIONS_ONSAVE",
      body: {
        name: o.name,
        value: o.value
      }
    });
    return (res.type === "OK");
  },

  saveOptions: async e => {
    if (e) {
      e.preventDefault();
    }
    const schema = await OptionsUI.getOptionsSchema();
    const toSave = await schema.keys.reduce(async (accP, val) => {
      const acc = await accP;
      const sel = (val.type === schema.types.RADIO) ? ":checked" : "";
      const el = document.querySelector(`[name=${val.name}]${sel}`);
      if (!el) {
        return acc;// TODO
      }
      const propMap = {
        [schema.types.BOOL]: "checked",
        [schema.types.RADIO]: "value",
        [schema.types.VALUE]: "value"
      };
      // const fn = val.onSave || (x => x);
      // const optionValue = fn(el[propMap[val.type]]);
      let optionValue = el[propMap[val.type]];
      // validate radio options
      if (
        val.type === schema.types.RADIO &&
        val.values &&
        !val.values.includes(optionValue)
      ) {
        console.log("Invalid radio option", optionValue, val.values);
        optionValue = val.default;
      }
      if (val.onSave) {
        if (!await OptionsUI.onSaveOption({name: val.name, value: optionValue})) {
          console.log("Shortcut rejected");
          optionValue = val.default;
          // TODO error message
        }
      }

      return Object.assign(acc, {[val.name]: optionValue});
    }, {});
    console.log("toSave", toSave);

    await browser.storage.local.set(toSave);
    // redraw ui incase some options where rejected
    OptionsUI.restoreOptionsHandler(toSave, schema);
  },

  // Set UI elements' value/checked
  restoreOptionsHandler: (result, schema) => {
    const schemaWithValues = schema.keys.map(o =>
      Object.assign({}, o, {value: result[o.name]})
    );
    schemaWithValues.forEach(o => {
      // const fn = o.onOptionsLoad || (x => x); // onLoad is triggered in background script
      const val = typeof o.value === "undefined" ? o.default : o.value;
      const sel = (o.type === schema.types.RADIO) ? `[value=${val}]` : "";
      const el = document.querySelector(`[name=${o.name}]${sel}`);
      if (!el) {
        return;
      }

      const propMap = {
        [schema.types.BOOL]: "checked",
        [schema.types.RADIO]: "checked",
        [schema.types.VALUE]: "value"
      };
      el[propMap[o.type]] = val;
    });
  },

  restoreOptions: async () => {
    const schema = await OptionsUI.getOptionsSchema();
    const keys = schema.keys.map(o => o.name);
    const loaded = await browser.storage.local.get(keys);
    OptionsUI.restoreOptionsHandler(loaded, schema);
  },

  setupAutosave: el => {
    const autosaveCb = e => {
      console.log("autosaveCb", e);
      OptionsUI.saveOptions(e);
    };

    let sel = "";
    if (el.type === "radio") {
      sel = `[value=${el.value}]`;
    }
    document.querySelector(`input[name=${el.name}]${sel}`)
      .addEventListener("change", autosaveCb);
  }
};

document.addEventListener("DOMContentLoaded", OptionsUI.restoreOptions);

["textarea", "input", "select"].forEach(type => {
  document.querySelectorAll(type).forEach(OptionsUI.setupAutosave);
});

// Export for testing
if (typeof module !== "undefined") {
  module.exports = {OptionsUI};
}
