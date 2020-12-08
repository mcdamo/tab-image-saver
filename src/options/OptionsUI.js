import Constants from "../background/constants";
import "../common.css";
import "./options.css";
import React, { Component, Fragment } from "react";
import { ReactSortable } from "react-sortablejs";

const MESSAGE_TYPE = { ...Constants.MESSAGE_TYPE };

class OptionsUI extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      loaded: false,
      backgroundApp: null,
      allowDownloadPrivate: false,
      schemas: {},
      options: {},
      rulesets: {},
      rulesetSelected: -1,
      rulesetKey: -1,
      focusInput: {},
      showText: {
        "options.pathRules": false,
        "ruleset.domainRules": false,
        "ruleset.pathRules": false,
      },
      testPathRulesUrl: "",
      testRulesetPathRulesUrl: "",
      testDomainRulesUrl: "",
      testPathRules: {},
      testRulesetPathRules: {},
      testDomainRules: {},
      pathRulesNewValue: "",
      domainRulesNewValue: "",
    };

    this.getRulesetKeyFromIndex = this.getRulesetKeyFromIndex.bind(this);
    this.getScopeName = this.getScopeName.bind(this);
    this.handleErrorClose = this.handleErrorClose.bind(this);
    this.handleLocalChange = this.handleLocalChange.bind(this);
    this.handleShowTextToggle = this.handleShowTextToggle.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleTyping = this.handleTyping.bind(this);
    this.handleShortcutInput = this.handleShortcutInput.bind(this);
    this.handleShortcutDelete = this.handleShortcutDelete.bind(this);
    this.handleRuleChange = this.handleRuleChange.bind(this);
    this.handleRuleTyping = this.handleRuleTyping.bind(this);
    this.setOption = this.setOption.bind(this);
    this.handleRulesetsSort = this.handleRulesetsSort.bind(this);
    this.handleRulesetDelete = this.handleRulesetDelete.bind(this);
    this.handleTestRules = this.handleTestRules.bind(this);
    this.testPathRules = this.testPathRules.bind(this);
    this.testDomainRules = this.testDomainRules.bind(this);
  }

  async componentDidMount() {
    // load options
    const { options, rulesets, schemas } = await this.sendMessage(
      MESSAGE_TYPE.OPTIONS_SCHEMAS
    );
    const page = await browser.runtime.getBackgroundPage();
    const allowDownloadPrivate = await browser.extension.isAllowedIncognitoAccess();

    this.setState({
      loaded: true,
      allowDownloadPrivate,
      options,
      rulesets,
      schemas,
      backgroundApp: page.backgroundApp,
    });
  }

  async sendMessage(type, body = null) {
    const res = await browser.runtime.sendMessage({
      type,
      body,
    });
    if (res.type === MESSAGE_TYPE.ERROR) {
      console.log(
        "sendMessage error",
        { type, body },
        res
      ); /* RemoveLogging:skip */
      this.setState({ error: res.body.error });
    }
    return res.body;
  }

  getRulesetKeyFromIndex(index, rulesetIndex) {
    if (index === -1) {
      return -1;
    }
    if (rulesetIndex !== undefined) {
      return rulesetIndex[index].key;
    }
    return this.state.options.rulesetIndex[index].key;
  }

  // 'extra' allows setting additional state variables
  async setOption(option, extra = {}) {
    const {
      loaded,
      options,
      rulesets,
      rulesetSelected,
      rulesetKey,
    } = this.state;
    if (!loaded) {
      return;
    }
    console.log("setOption", rulesetSelected, option, extra);
    if (rulesetSelected === -1) {
      const name = option.name;
      const value = await this.sendMessage(MESSAGE_TYPE.OPTIONS_OPTION_SAVE, {
        name,
        value: option.value,
      });
      options[option.name] = value;
      this.setState({ options, ...extra });
    } else {
      const name = option.name;
      const value = await this.sendMessage(
        MESSAGE_TYPE.OPTIONS_RULESET_OPTION_SAVE,
        {
          name,
          value: option.value,
          rulesetKey,
        }
      );
      rulesets[`ruleset_${rulesetKey}`][name] = value;
      this.setState({ rulesets, ...extra });
    }
  }

  // wrap list elements in objects for Sortable
  getSortable(list) {
    return list.map((o, index) => ({ id: index, value: o }));
  }

  // test if list has been sorted and unwrap objects
  handleSortable(list, callback) {
    if (list.find((o) => o.chosen === true)) {
      // don't save while object is being moved
      return;
    }
    // check if indexes have changed.
    if (!list.find((o, index) => o.id !== index)) {
      // no indexes have changed
      return;
    }
    callback(list);
  }

  async handleRulesetShow(selected = null) {
    let rulesetSelected =
      selected !== null ? selected : this.state.rulesetSelected;
    const rulesetKey = this.getRulesetKeyFromIndex(rulesetSelected);
    if (rulesetKey === -1) {
      rulesetSelected = -1;
    }
    this.setState({
      rulesetSelected,
      rulesetKey,
      testDomainRules: {}, // set to empty
      testRulesetPathRules: {}, // set to empty
    });
    //}
  }

  // creates empty ruleset and switches to it
  async handleRulesetAdd(ev) {
    ev && ev.preventDefault();
    const options = this.state.options;
    const { rulesetIndex, rulesets } = await this.sendMessage(
      MESSAGE_TYPE.OPTIONS_RULESET_CREATE
    );
    const rulesetSelected = rulesetIndex.length - 1;
    options.rulesetIndex = rulesetIndex;
    const rulesetKey = this.getRulesetKeyFromIndex(
      rulesetSelected,
      rulesetIndex
    );
    this.setState({
      options,
      rulesetSelected,
      rulesetKey,
      rulesets,
    });
  }

  getNewSelected(rulesetIndex, rulesetSelected) {
    if (rulesetIndex.length === 0) {
      return -1;
    }
    return rulesetSelected >= rulesetIndex.length
      ? rulesetIndex.length - 1
      : rulesetSelected;
  }

  async handleRulesetDelete(ev) {
    ev && ev.preventDefault();
    const { rulesetKey, rulesetSelected } = this.state;
    const { rulesetIndex, options, rulesets } = await this.sendMessage(
      MESSAGE_TYPE.OPTIONS_RULESET_DELETE,
      {
        rulesetKey,
      }
    );
    const newSelected = this.getNewSelected(rulesetIndex, rulesetSelected);
    const newKey = this.getRulesetKeyFromIndex(newSelected, rulesetIndex);
    this.setState({
      rulesetKey: newKey,
      rulesetSelected: newSelected,
      options,
      rulesets,
    });
  }

  getScopeName() {
    if (this.state.rulesetSelected === -1) {
      return "options";
    }
    return "ruleset";
  }

  handleErrorClose() {
    this.setState({ error: null });
  }

  handleLocalChange(ev, { name }) {
    ev && ev.preventDefault();
    const key = name ? name : ev.target.name;
    const value = ev.target.value;
    this.setState({ [key]: value });
  }

  handleShowTextToggle(name) {
    const showText = this.state.showText;
    showText[name] = !showText[name];
    this.setState({ showText });
  }

  handleChange(ev) {
    ev && ev.preventDefault();
    const { options, rulesets, rulesetKey, schemas } = this.state;
    const name = ev.target.name;
    let value;
    const scope = this.getScopeName();
    const option = schemas[scope][name];
    if (!option) {
      console.log(`invalid option name: ${name}`);
      return;
    }
    if (option.type === "BOOL") {
      // toggle
      value = !(scope === "options"
        ? options[name]
        : rulesets[`ruleset_${rulesetKey}`][name]);
    } else {
      value = ev.target.value;
    }
    if (option.regex) {
      const re = new RegExp(option.regex);
      if (!re.test(value)) {
        console.warn(`Regex failed for ${name}:${value}`);
        value = JSON.parse(JSON.stringify(option.default)); // deep clone
      }
    }
    this.setOption({ name, value });
  }

  handleTyping(ev) {
    ev && ev.preventDefault();
    const { options, rulesets, rulesetKey } = this.state;
    const { name, value } = ev.target;
    const scope = this.getScopeName();
    if (scope === "options") {
      options[name] = value;
      this.setState({ options });
    } else {
      rulesets[`ruleset_${rulesetKey}`][name] = value;
      this.setState({ rulesets });
    }
  }

  handleShortcutInput(ev) {
    ev && ev.preventDefault();
    let keys = [];
    if (ev.ctrlKey) {
      keys.push("Ctrl");
    }
    if (ev.altKey) {
      keys.push("Alt");
    }
    if (ev.shiftKey) {
      keys.push("Shift");
    }
    if (ev.key === "Control" || ev.key === "Alt" || ev.key === "Shift") {
      // not a valid key
      return false;
    }
    keys.push(ev.key.toUpperCase());
    const value = keys.join("+");
    const name = ev.target.name;
    this.setOption({ name, value });
    return value;
  }

  handleShortcutDelete(name) {
    this.setOption({ name, value: "" });
    return "";
  }

  // disable any shortcuts matching the selected value
  async disableShortcut(ev) {
    ev && ev.preventDefault();
    const value = ev.target.value;
    const commands = await browser.commands.getAll();
    commands.forEach((command) => {
      if (command.value === value) {
        browser.commands.reset(command.name);
      }
    });
  }

  handleRuleChange(ev, { rules, rulesName }) {
    ev && ev.preventDefault();
    console.log("handleRuleChange", rules, rulesName);
    const { name, value } = ev.target;
    const focusInput = {};
    if (name === "rulesText") {
      this.setOption(
        { name: rulesName, value: value.split("\n") },
        { focusInput }
      );
    } else {
      const index = parseInt(name, 10);
      rules[index] = value;
      this.setOption({ name: rulesName, value: rules }, { focusInput });
    }
  }

  handleRuleChangeNew(ev, { rules, rulesName }) {
    ev && ev.preventDefault();
    console.log("handleRuleChangeNew", rules, rulesName);
    const { value } = ev.target;
    if (!value || value.length === 0) {
      return;
    }
    const scope = this.getScopeName();
    rules.push(value);
    // set focus to newly created index
    const focusInput = {
      name: `${scope}.${rulesName}`,
      index: -1,
    };

    this.setOption(
      { name: rulesName, value: rules },
      { focusInput, [`${rulesName}NewValue`]: "" }
    );
  }

  // append default rules
  handleRulesDefault(ev, { rules, rulesName }) {
    ev && ev.preventDefault();
    const scope = this.getScopeName();
    console.log("handleRulesDefault", scope, rulesName);
    const defaults = this.state.schemas[scope][rulesName].default;
    this.setOption({ name: rulesName, value: [...rules, ...defaults] });
  }

  handleRuleTyping(ev, { rulesName }) {
    ev && ev.preventDefault();
    console.log("handleRuleTyping", rulesName);
    const { options, rulesets, rulesetKey } = this.state;
    const scope = this.getScopeName();
    let value;
    if (ev.target.name === "rulesText") {
      value = ev.target.value.split("\n");
      if (scope === "options") {
        options[rulesName] = value;
        this.setState({ options });
      } else {
        rulesets[`ruleset_${rulesetKey}`][rulesName] = value;
        this.setState({ rulesets });
      }
    } else {
      value = ev.target.value;
      const index = ev.target.name;
      if (scope === "options") {
        options[rulesName][index] = value;
        this.setState({ options });
      } else {
        rulesets[`ruleset_${rulesetKey}`][rulesName][index] = value;
        this.setState({ rulesets });
      }
    }
  }

  handleRuleTypingNew(ev, { rulesName }) {
    ev && ev.preventDefault();
    console.log("handleRuleTypingNew", rulesName);
    this.setState({ [`${rulesName}NewValue`]: ev.target.value });
  }

  handleRuleDelete({ index, rules, rulesName }) {
    rules.splice(index, 1);
    this.setOption({ name: rulesName, value: rules });
  }

  handleRulesSort({ list, rulesName }) {
    const rules = list.map((o) => o.value);
    // setState then use callback to save list
    // this is to prevent display flicker caused by the list state
    const callback = () => this.setOption({ name: rulesName, value: rules });
    if (this.getScopeName() === "options") {
      const options = this.state.options;
      options[rulesName] = rules;
      this.setState({ options }, callback);
    } else {
      const { rulesets, rulesetKey } = this.state;
      rulesets[`ruleset_${rulesetKey}`][rulesName] = rules;
      this.setState({ rulesets }, callback);
    }
  }

  async handleRulesetsSort(list) {
    let rulesetIndex = list.map((o) => o.value);
    let rulesetSelected = this.state.rulesetSelected;
    const options = this.state.options;
    if (this.getScopeName() !== "options") {
      rulesetSelected = list.findIndex((o) => o.id === rulesetSelected);
    }
    rulesetIndex = await this.sendMessage(MESSAGE_TYPE.OPTIONS_OPTION_SAVE, {
      name: "rulesetIndex",
      value: rulesetIndex,
    });
    options.rulesetIndex = rulesetIndex;
    //const callback = () => this.saveRulesets(rulesets, rulesetSelected);
    // setState then use callback to save list
    // this is to prevent display flicker caused by the list state
    this.setState({ options, rulesetSelected }); //, callback);
  }

  async testPathRules(url, _rules) {
    // URL() throws error if url is invalid
    // eslint-disable-next-line
    const rules = await this.sendMessage(MESSAGE_TYPE.OPTIONS_ONSAVERULES, {
      rules: _rules,
    });
    const results = [];
    for (const rule of rules) {
      const result = { rule };
      try {
        result.result = await this.state.backgroundApp.createFilename({
          tab: {},
          image: { src: url },
          index: 1,
          rules: [rule],
        });
      } catch (err) {
        console.log(err.message);
        result.error = err.message;
      }
      results.push(result);
    }
    return { result: results };
  }

  async testDomainRules(url, _rules) {
    const rules = await this.sendMessage(
      MESSAGE_TYPE.OPTIONS_DOMAIN_ONSAVERULES,
      {
        rules: _rules,
      }
    );
    const results = [];
    for (const rule of rules) {
      const ret = await this.sendMessage(
        MESSAGE_TYPE.OPTIONS_DOMAIN_RULEMATCH,
        { url, rule }
      );
      const result = { rule };
      if (ret.result !== undefined) {
        result.result = ret.result
          ? browser.i18n.getMessage("options_domain_rule_test_result_match")
          : browser.i18n.getMessage("options_domain_rule_test_result_mismatch");
      } else if (ret.error !== undefined) {
        result.error = ret.error;
      }
      results.push(result);
    }
    return { result: results };
  }

  async handleTestRules(ev, { url, rules, name }) {
    ev && ev.preventDefault();
    if (!url || url.length === 0) {
      this.setState({ [name]: { empty: true } });
      return;
    }
    try {
      // test if valid url, discard resulting variable.
      const location = new URL(url); // URL() throws error if url is invalid
      let result;
      if (name === "testDomainRules") {
        result = await this.testDomainRules(url, rules);
      } else {
        result = await this.testPathRules(url, rules);
      }
      this.setState({ [name]: result });
    } catch (err) {
      this.setState({ [name]: { error: err.message } });
      return;
    }
  }

  renderText({
    name,
    value,
    label,
    placeholder,
    className = "inputWrap",
    disabled,
  }) {
    return (
      <Fragment>
        <div className={className}>
          <label className="text">{label}</label>
          <input
            type="text"
            name={name}
            placeholder={placeholder}
            value={value || ""}
            onChange={this.handleTyping}
            onBlur={this.handleChange}
            disabled={disabled}
          />
        </div>
      </Fragment>
    );
  }

  renderRadio({ name, value, label, checked, disabled }) {
    return (
      <Fragment>
        <div className="inputWrap">
          <label className="radio">
            <input
              type="radio"
              name={name}
              value={value}
              checked={checked}
              onChange={this.handleChange}
              disabled={disabled}
            />
            {label}
          </label>
        </div>
      </Fragment>
    );
  }

  renderCheckbox({ name, value = 1, label, checked, disabled }) {
    return (
      <Fragment>
        <div className="inputWrap">
          <label className="checkbox">
            <input
              type="checkbox"
              name={name}
              value={value}
              checked={checked || false}
              onChange={this.handleChange}
              disabled={disabled}
            />
            {label}
          </label>
        </div>
      </Fragment>
    );
  }

  renderInheritGroup({ name, checked, title, children }) {
    return (
      <fieldset className="optionGroup">
        <legend>
          <span>
            {title}
            <label className="checkbox setInherit">
              <input
                type="checkbox"
                name={name}
                value={1}
                checked={checked || false}
                onChange={this.handleChange}
              />
              __MSG_options_rulesets_inherit_label__
            </label>
          </span>
        </legend>
        <fieldset className={`inheritGroup ${checked && "inherited"}`}>
          {children}
        </fieldset>
      </fieldset>
    );
  }

  renderShortcut({ name, value }) {
    return (
      <div className="inputWrap">
        <input
          type="text"
          name={name}
          placeholder="__MSG_options_shortcut_placeholder__"
          value={value || ""}
          onFocus={this.disableShortcuts}
          onKeyDown={this.handleShortcutInput}
          onChange={() => {}} /* dummy for controlled component */
        />
        <div
          className="icon-button delete button"
          onClick={(ev) => this.handleShortcutDelete(name)}
        >
          <div className="delete-icon"></div>
        </div>
      </div>
    );
  }

  renderRuleTestResult(test) {
    return test ? (
      <Fragment>
        {test.error && <span className={"error"}>{test.error}</span>}
        {test.result && <span className={"success"}>{test.result}</span>}
        {test.result === null && (
          <span className="error">
            {browser.i18n.getMessage("options_rule_test_null_result")}
          </span>
        )}
      </Fragment>
    ) : (
      ""
    );
  }

  renderRules({
    rules,
    ruleNewValue,
    scopeName,
    rulesName,
    focusInput,
    placeholder,
    showText,
    onTestChange,
    onTestSubmit,
    testUrl,
    testLabel,
    testNote,
    test,
  }) {
    const scope = `${scopeName}.${rulesName}`;
    const showTextChecked = showText[scope];
    const onToggle = (name) => this.handleShowTextToggle(name);
    const onTyping = (ev) => this.handleRuleTyping(ev, { rulesName });
    const onTypingNew = (ev) => this.handleRuleTypingNew(ev, { rulesName });
    const onChange = (ev) => this.handleRuleChange(ev, { rules, rulesName });
    const onChangeNew = (ev) =>
      this.handleRuleChangeNew(ev, { rules, rulesName });
    const onDelete = (index) =>
      this.handleRuleDelete({ index, rules, rulesName });
    const onSort = (ev) =>
      this.handleSortable(ev, (list) =>
        this.handleRulesSort({ list, rulesName })
      );
    const loadDefault = (ev) =>
      this.handleRulesDefault(ev, { rules, rulesName });

    // this array matches the test results to rules
    // allowing for rules to be reordered between tests
    const testResults =
      test &&
      test.result &&
      rules &&
      rules.map((r) => {
        // match result to rule
        const result = test.result.find((_) => _.rule === r);
        return result;
      });

    return (
      <Fragment>
        <div className="rulesInterface">
          <div className="rulesToolbar">
            <div>
              {rules && rules.length === 0 && (
                <div className="error">
                  <span className="error-icon icon"></span>
                  {browser.i18n.getMessage("options_rules_empty_error")}
                </div>
              )}
            </div>
            <div className="xright">
              <label className="checkbox note">
                <input
                  type="checkbox"
                  className="toggleChildren"
                  value={1}
                  checked={showTextChecked}
                  onChange={() => onToggle(scope)}
                />
                __MSG_options_rules_data_toggle__
              </label>
            </div>
            <div>
              {rulesName === "pathRules" && (
                <div className="button" onClick={loadDefault}>
                  {browser.i18n.getMessage(
                    "options_path_rules_append_default_label"
                  )}
                </div>
              )}
            </div>
          </div>
          {showTextChecked ? (
            <div>
              <textarea
                name="rulesText"
                cols="60"
                rows="6"
                onChange={onTyping}
                onBlur={onChange}
                value={rules ? rules.join("\n") : ""}
              ></textarea>
              <ol className="rulesTestResult">
                {testResults &&
                  testResults.map((_, index) => (
                    <li key={index}>{this.renderRuleTestResult(_)}</li>
                  ))}
              </ol>
            </div>
          ) : (
            <Fragment>
              {rules && rules.length > 0 && (
                <ReactSortable
                  list={this.getSortable(rules)}
                  setList={onSort}
                  handle=".handle"
                >
                  {rules.map((_, index) => (
                    <div key={index} className="inputRow">
                      <div className="inputWrap">
                        <div
                          className="handle drag-icon"
                          title={browser.i18n.getMessage(
                            "options_drag_tooltip"
                          )}
                        ></div>
                        <input
                          className="rule grow"
                          placeholder={placeholder}
                          name={index}
                          value={_}
                          onChange={onTyping}
                          onBlur={onChange}
                        />
                        <div
                          className="delete icon-button button"
                          title={browser.i18n.getMessage(
                            "options_path_rule_delete_tooltip"
                          )}
                          onClick={() => onDelete(index)}
                          name={index}
                        >
                          <div className="delete-icon"></div>
                        </div>
                        <div></div>
                        <div className="rulesTestResult">
                          {testResults &&
                            this.renderRuleTestResult(testResults[index])}
                        </div>
                      </div>
                    </div>
                  ))}
                </ReactSortable>
              )}
              {/* new pathRules row */}
              <div className="inputRow">
                <div className="inputWrap">
                  <div>{/* empty handle */}</div>
                  <input
                    className="rule grow"
                    placeholder={placeholder}
                    ref={(input) =>
                      focusInput &&
                      focusInput.index === -1 &&
                      input &&
                      input.focus()
                    }
                    value={ruleNewValue}
                    onChange={onTypingNew}
                    onBlur={onChangeNew}
                  />
                </div>
              </div>
            </Fragment>
          )}
        </div>
        <fieldset className="rulesTestInterface">
          <label className="text">{testLabel}</label>
          {testNote}
          <div className="inputWrap">
            <input
              className="grow rulesTestUrl"
              placeholder="http://example.com/image.jpg"
              name="url"
              value={testUrl}
              onChange={onTestChange}
            />
            <div className="button rulesTest" onClick={onTestSubmit}>
              __MSG_options_rule_test_button_label__
            </div>
          </div>
          {test && test.empty && (
            <span className="error rulesTestUrlError">
              {browser.i18n.getMessage("options_rule_test_url_error")}
            </span>
          )}
          {test && test.error && (
            <span className="error rulesTestUrlError">{test.error}</span>
          )}
        </fieldset>
      </Fragment>
    );
  }

  render() {
    const {
      error,
      options,
      rulesets,
      rulesetSelected,
      rulesetKey,
      focusInput,
      showText,
      testPathRulesUrl,
      testRulesetPathRulesUrl,
      testDomainRulesUrl,
      testPathRules,
      testRulesetPathRules,
      testDomainRules,
      allowDownloadPrivate,
      pathRulesNewValue,
      domainRulesNewValue,
    } = this.state;

    const ruleset = rulesetKey !== -1 ? rulesets[`ruleset_${rulesetKey}`] : {};

    const optionsError =
      !("pathRules" in options) || options.pathRules.length === 0;

    return (
      <div id="container">
        {error && (
          <div id="errorPopup" onClick={this.handleErrorClose}>
            {error}
          </div>
        )}
        <div id="sidebar">
          <h1 id="header">__MSG_options_title__</h1>
          <fieldset id="rulesetSelect">
            <div className="inputRow">
              <div className="inputWrap">
                <i></i>
                <div
                  onClick={() => this.handleRulesetShow(-1)}
                  id="rulesetSelectGlobal"
                  className={`button ${
                    rulesetSelected === -1 ? "selected" : ""
                  }`}
                >
                  <div
                    className={optionsError ? "error-icon icon" : ""}
                    title={browser.i18n.getMessage("options_rules_empty_error")}
                  >
                    __MSG_options_rulesets_global_title__
                  </div>
                </div>
              </div>
            </div>
            {options.rulesetIndex && options.rulesetIndex.length > 0 && (
              <div id="rulesetSelectRulesets">
                <ReactSortable
                  list={this.getSortable(options.rulesetIndex)}
                  setList={(list) =>
                    this.handleSortable(list, this.handleRulesetsSort)
                  }
                  handle=".handle"
                >
                  {options.rulesetIndex.map((obj, index) => {
                    const ruleset = rulesets[`ruleset_${obj.key}`];
                    const rulesetError =
                      (ruleset.pathRulesInherit === false &&
                        ruleset.pathRules.length === 0) ||
                      ruleset.domainRules.length === 0;
                    return (
                      <div key={index} className="inputRow">
                        <div className="inputWrap">
                          <i
                            className="handle drag-icon"
                            title={browser.i18n.getMessage(
                              "options_drag_tooltip"
                            )}
                          ></i>
                          <div
                            onClick={() => this.handleRulesetShow(index)}
                            className={`button ${
                              rulesetSelected === index ? "selected" : ""
                            }`}
                          >
                            <div
                              className={rulesetError ? "error-icon icon" : ""}
                              title={browser.i18n.getMessage(
                                "options_rules_empty_error"
                              )}
                            >
                              {ruleset.rulesetName}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </ReactSortable>
              </div>
            )}
            <div className="inputRow">
              <div className="inputWrap">
                <i></i>
                <div
                  onClick={() => this.handleRulesetAdd()}
                  id="rulesetAdd"
                  className="button"
                >
                  <em>__MSG_options_rulesets_add_label__</em>
                </div>
              </div>
            </div>
          </fieldset>
        </div>
        <div id="content">
          <form id="options">
            <div id="rulesetContainer">
              <div
                id="rulesetGlobal"
                className={rulesetSelected === -1 ? "" : "hidden"}
              >
                <h2 className="header2">
                  __MSG_options_rulesets_global_title__
                </h2>
                <p className="note">__MSG_options_rulesets_global_note__</p>
                <div className="optionGroups">
                  <div className="row">
                    <div className="column">
                      <fieldset className="optionGroup">
                        <legend>
                          <span>__MSG_options_action_title__</span>
                        </legend>
                        <fieldset>
                          {this.renderRadio({
                            name: "action",
                            label: "__MSG_options_action_label_active__",
                            value: Constants.ACTION.ACTIVE,
                            checked: options.action === Constants.ACTION.ACTIVE,
                          })}
                          {this.renderRadio({
                            name: "action",
                            label: "__MSG_options_action_label_left__",
                            value: Constants.ACTION.LEFT,
                            checked: options.action === Constants.ACTION.LEFT,
                          })}
                          {this.renderRadio({
                            name: "action",
                            label: "__MSG_options_action_label_right__",
                            value: Constants.ACTION.RIGHT,
                            checked: options.action === Constants.ACTION.RIGHT,
                          })}
                          {this.renderRadio({
                            name: "action",
                            label: "__MSG_options_action_label_all__",
                            value: Constants.ACTION.ALL,
                            checked: options.action === Constants.ACTION.ALL,
                          })}
                          {this.renderCheckbox({
                            name: "activeTab",
                            label: "__MSG_options_active_tab__",
                            checked: options.activeTab,
                          })}
                        </fieldset>
                      </fieldset>
                      <fieldset className="optionGroup">
                        <legend>
                          <span>__MSG_options_browser_action_title__</span>
                        </legend>
                        <fieldset>
                          {this.renderRadio({
                            name: "browserAction",
                            label:
                              "__MSG_options_browser_action_label_download__",
                            value: Constants.BROWSER_ACTION.DOWNLOAD,
                            checked:
                              options.browserAction ===
                              Constants.BROWSER_ACTION.DOWNLOAD,
                          })}
                          {this.renderRadio({
                            name: "browserAction",
                            label: "__MSG_options_browser_action_label_popup__",
                            value: Constants.BROWSER_ACTION.POPUP,
                            checked:
                              options.browserAction ===
                              Constants.BROWSER_ACTION.POPUP,
                          })}
                        </fieldset>
                      </fieldset>
                    </div>
                    <div className="column">
                      <fieldset id="shortcuts" className="optionGroup">
                        <legend>
                          <span>__MSG_options_shortcut_title__</span>
                        </legend>
                        <fieldset>
                          <span className="note">
                            __MSG_options_shortcut_example__
                          </span>
                          <a
                            target="_blank"
                            href="https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands#Shortcut_values"
                          >
                            __MSG_options_learn_more__
                          </a>
                          <div className="inputRow inputShortcut">
                            <label className="text">
                              __MSG_commands_default_action_label__
                            </label>
                            {this.renderShortcut({
                              name: "shortcut",
                              value: options.shortcut,
                            })}
                          </div>
                          <div className="inputRow inputShortcut">
                            <label className="text">
                              __MSG_commands_active_action_label__
                            </label>
                            {this.renderShortcut({
                              name: "shortcutActive",
                              value: options.shortcutActive,
                            })}
                          </div>
                          <div className="inputRow inputShortcut">
                            <label className="text">
                              __MSG_commands_left_action_label__
                            </label>
                            {this.renderShortcut({
                              name: "shortcutLeft",
                              value: options.shortcutLeft,
                            })}
                          </div>
                          <div className="inputRow inputShortcut">
                            <label className="text">
                              __MSG_commands_right_action_label__
                            </label>
                            {this.renderShortcut({
                              name: "shortcutRight",
                              value: options.shortcutRight,
                            })}
                          </div>
                          <div className="inputRow inputShortcut">
                            <label className="text">
                              __MSG_commands_all_action_label__
                            </label>
                            {this.renderShortcut({
                              name: "shortcutAll",
                              value: options.shortcutAll,
                            })}
                          </div>
                        </fieldset>
                      </fieldset>
                    </div>
                  </div>
                  <div className="row">
                    <div className="column">
                      <fieldset className="optionGroup">
                        <legend>
                          <span>__MSG_options_filter_title__</span>
                        </legend>
                        <fieldset>
                          {this.renderRadio({
                            name: "filter",
                            label: "__MSG_options_filter_label_max__",
                            value: Constants.FILTER.MAX,
                            checked: options.filter === Constants.FILTER.MAX,
                          })}
                          {this.renderRadio({
                            name: "filter",
                            label: "__MSG_options_filter_label_all__",
                            value: Constants.FILTER.ALL,
                            checked: options.filter === Constants.FILTER.ALL,
                          })}
                          {this.renderRadio({
                            name: "filter",
                            label: (
                              <Fragment>
                                __MSG_options_filter_label_direct__
                                <span className="note">
                                  __MSG_options_filter_label_direct_note__
                                </span>
                              </Fragment>
                            ),
                            value: Constants.FILTER.DIRECT,
                            checked: options.filter === Constants.FILTER.DIRECT,
                          })}
                          <fieldset>
                            <legend>
                              <span>__MSG_options_dimensions_title__</span>
                            </legend>
                            {this.renderText({
                              name: "minWidth",
                              label: "__MSG_options_dimensions_width_label__",
                              className: "",
                              value: options.minWidth,
                            })}
                            {this.renderText({
                              name: "minHeight",
                              label: "__MSG_options_dimensions_height_label__",
                              className: "",
                              value: options.minHeight,
                            })}
                          </fieldset>
                        </fieldset>
                      </fieldset>
                      <fieldset className="optionGroup">
                        <legend>
                          <span>__MSG_options_advanced_title__</span>
                        </legend>
                        <fieldset>
                          <label className="text">
                            __MSG_options_download_num__
                            <input
                              type="text"
                              name="downloadNum"
                              size="3"
                              value={options.downloadNum || ""}
                              onChange={this.handleChange}
                            />
                          </label>
                          {this.renderCheckbox({
                            name: "downloadAsync",
                            label: "__MSG_options_download_async__",
                            checked: options.downloadAsync,
                          })}
                          <span className="note">
                            __MSG_options_download_async_note__
                          </span>
                          {this.renderCheckbox({
                            name: "downloadPrivate",
                            disabled: !allowDownloadPrivate,
                            label: "__MSG_options_download_private__",
                            checked: options.downloadPrivate,
                          })}
                          <span className="note">
                            __MSG_options_download_private_note__
                          </span>
                          {!allowDownloadPrivate && (
                            <span className="note error">
                              <br />
                              __MSG_options_allow_download_private_error__
                            </span>
                          )}
                          {this.renderCheckbox({
                            name: "ignoreDiscardedTab",
                            label: "__MSG_options_ignore_discarded_tab__",
                            checked: options.ignoreDiscardedTab,
                          })}
                        </fieldset>
                      </fieldset>
                    </div>
                    <div className="column">
                      <fieldset className="optionGroup">
                        <legend>
                          <span>__MSG_options_download_path_title__</span>
                        </legend>
                        <fieldset>
                          <span className="note">
                            __MSG_options_download_path_note__
                          </span>
                          {this.renderText({
                            name: "downloadPath",
                            label: "__MSG_options_download_path_label__",
                            placeholder:
                              "__MSG_options_download_path_placeholder__",
                            value: options.downloadPath,
                          })}
                        </fieldset>
                      </fieldset>
                      <fieldset className="optionGroup">
                        <legend>
                          <span>__MSG_options_conflict_action_title__</span>
                        </legend>
                        <fieldset>
                          {this.renderRadio({
                            name: "conflictAction",
                            label:
                              "__MSG_options_conflict_action_label_uniquify__",
                            value: Constants.CONFLICT_ACTION.UNIQUIFY,
                            checked:
                              options.conflictAction ===
                              Constants.CONFLICT_ACTION.UNIQUIFY,
                          })}
                          {this.renderRadio({
                            name: "conflictAction",
                            label:
                              "__MSG_options_conflict_action_label_overwrite__",
                            value: Constants.CONFLICT_ACTION.OVERWRITE,
                            checked:
                              options.conflictAction ===
                              Constants.CONFLICT_ACTION.OVERWRITE,
                          })}
                        </fieldset>
                      </fieldset>
                      <fieldset className="optionGroup">
                        <legend>
                          <span>__MSG_options_download_complete_title__</span>
                        </legend>
                        <fieldset>
                          {this.renderCheckbox({
                            name: "closeTab",
                            label: "__MSG_options_close_tab__",
                            checked: options.closeTab,
                          })}
                          {this.renderCheckbox({
                            name: "notifyEnded",
                            label: "__MSG_options_notify_ended__",
                            checked: options.notifyEnded,
                          })}
                          {this.renderCheckbox({
                            name: "removeEnded",
                            label: "__MSG_options_remove_ended__",
                            checked: options.removeEnded,
                          })}
                        </fieldset>
                      </fieldset>
                    </div>
                  </div>
                  <div className="row">
                    <div className="column">
                      <fieldset className="optionGroup">
                        <legend>
                          <span>
                            __MSG_options_path_rules_title__{" "}
                            <a
                              target="_blank"
                              href="https://github.com/mcdamo/tab-image-saver/#path-rules"
                            >
                              __MSG_options_learn_more__
                            </a>
                          </span>
                        </legend>
                        <fieldset>
                          <span className="note">
                            __MSG_options_path_rules_note__
                          </span>
                          <label className="text">
                            __MSG_options_path_rules_label__
                          </label>
                          {this.renderRules({
                            rules: options.pathRules,
                            ruleNewValue: pathRulesNewValue,
                            scopeName: "options",
                            rulesName: "pathRules",
                            showText,
                            placeholder: browser.i18n.getMessage(
                              "options_path_rule_add_placeholder"
                            ),
                            focusInput:
                              focusInput &&
                              focusInput.name === "options.pathRules" &&
                              focusInput,
                            testLabel: "__MSG_options_path_rule_test_label__",
                            testNote: (
                              <span className="note">
                                __MSG_options_path_rule_test_note__
                              </span>
                            ),
                            testUrl: testPathRulesUrl,
                            test: testPathRules,
                            onTestChange: (ev) =>
                              this.handleLocalChange(ev, {
                                name: "testPathRulesUrl",
                              }),
                            onTestSubmit: (ev) =>
                              this.handleTestRules(ev, {
                                url: testPathRulesUrl,
                                name: "testPathRules",
                                rules: options.pathRules,
                              }),
                          })}
                        </fieldset>
                      </fieldset>
                    </div>
                  </div>
                </div>
              </div>
              <div
                id="rulesetContent"
                className={rulesetSelected !== -1 ? "" : "hidden"}
              >
                <div className="header2">
                  <div
                    id="rulesetDelete"
                    className="delete button"
                    onClick={this.handleRulesetDelete}
                  >
                    <div className="delete-icon">
                      __MSG_options_rulesets_delete_label__
                    </div>
                  </div>
                  <h2 id="rulesetName"></h2>
                </div>
                <p className="note">__MSG_options_rulesets_global_note__</p>
                <div className="row">
                  <div className="column">
                    <fieldset className="optionGroup">
                      <legend>
                        <span>__MSG_options_rulesets_ruleset_title__</span>
                      </legend>
                      <fieldset>
                        <div className="inputWrap">
                          <label className="text">
                            __MSG_options_rulesets_ruleset_name_label__
                          </label>
                          <input
                            type="text"
                            name="rulesetName"
                            value={ruleset.rulesetName || ""}
                            onChange={this.handleTyping}
                            onBlur={this.handleChange}
                          />
                        </div>
                        <fieldset>
                          <label className="text">
                            __MSG_options_domain_rules_label__
                          </label>
                          <div id="rulesetDomainRulesToggle">
                            {this.renderRules({
                              rules: ruleset.domainRules,
                              ruleNewValue: domainRulesNewValue,
                              rulesName: "domainRules",
                              scopeName: "ruleset",
                              showText,
                              placeholder: browser.i18n.getMessage(
                                "options_domain_rule_add_placeholder"
                              ),
                              focusInput:
                                focusInput &&
                                focusInput.name === "ruleset.domainRules" &&
                                focusInput,
                              testLabel:
                                "__MSG_options_domain_rule_test_label__",
                              testUrl: testDomainRulesUrl,
                              test: testDomainRules,
                              onTestChange: (ev) =>
                                this.handleLocalChange(ev, {
                                  name: "testDomainRulesUrl",
                                }),
                              onTestSubmit: (ev) =>
                                this.handleTestRules(ev, {
                                  url: testDomainRulesUrl,
                                  name: "testDomainRules",
                                  rules: ruleset.domainRules,
                                }),
                            })}
                          </div>
                        </fieldset>
                      </fieldset>
                    </fieldset>
                  </div>
                </div>
                <div className="optionGroups">
                  <div className="row">
                    <div className="column">
                      {this.renderInheritGroup({
                        name: "filterInherit",
                        checked: ruleset.filterInherit,
                        title: "__MSG_options_filter_title__",
                        children: (
                          <Fragment>
                            {this.renderRadio({
                              name: "filter",
                              label: "__MSG_options_filter_label_max__",
                              value: Constants.FILTER.MAX,
                              checked: ruleset.filter === Constants.FILTER.MAX,
                              disabled: ruleset.filterInherit,
                            })}
                            {this.renderRadio({
                              name: "filter",
                              label: "__MSG_options_filter_label_all__",
                              value: Constants.FILTER.ALL,
                              checked: ruleset.filter === Constants.FILTER.ALL,
                              disabled: ruleset.filterInherit,
                            })}
                            {this.renderRadio({
                              name: "filter",
                              label: (
                                <Fragment>
                                  __MSG_options_filter_label_direct__
                                  <span className="note">
                                    __MSG_options_filter_label_direct_note__
                                  </span>
                                </Fragment>
                              ),
                              value: Constants.FILTER.DIRECT,
                              checked:
                                ruleset.filter === Constants.FILTER.DIRECT,
                              disabled: ruleset.filterInherit,
                            })}
                            <fieldset>
                              <legend>
                                <span>__MSG_options_dimensions_title__</span>
                              </legend>
                              {this.renderText({
                                name: "minWidth",
                                label: "__MSG_options_dimensions_width_label__",
                                className: "",
                                value: ruleset.minWidth,
                                disabled: ruleset.filterInherit,
                              })}
                              {this.renderText({
                                name: "minHeight",
                                label:
                                  "__MSG_options_dimensions_height_label__",
                                className: "",
                                value: ruleset.minHeight,
                                disabled: ruleset.filterInherit,
                              })}
                            </fieldset>
                          </Fragment>
                        ),
                      })}
                      {this.renderInheritGroup({
                        name: "downloadAdvancedInherit",
                        checked: ruleset.downloadAdvancedInherit,
                        title: "__MSG_options_advanced_title__",
                        children: (
                          <Fragment>
                            {this.renderCheckbox({
                              name: "downloadPrivate",
                              label: "__MSG_options_download_private__",
                              checked: ruleset.downloadPrivate,
                              disabled: ruleset.downloadAdvancedInherit,
                            })}
                            <span className="note">
                              __MSG_options_download_private_note__
                            </span>
                          </Fragment>
                        ),
                      })}
                    </div>
                    <div className="column">
                      {this.renderInheritGroup({
                        name: "downloadPathInherit",
                        checked: ruleset.downloadPathInherit,
                        title: "__MSG_options_download_path_title__",
                        children: (
                          <Fragment>
                            <span className="note">
                              __MSG_options_download_path_note__
                            </span>
                            {this.renderText({
                              name: "downloadPath",
                              label: "__MSG_options_download_path_label__",
                              placeholder:
                                "__MSG_options_download_path_placeholder__",
                              value: ruleset.downloadPath,
                              disabled: ruleset.downloadPathInherit,
                            })}
                          </Fragment>
                        ),
                      })}
                      {this.renderInheritGroup({
                        name: "conflictActionInherit",
                        checked: ruleset.conflictActionInherit,
                        title: "__MSG_options_conflict_action_title__",
                        children: (
                          <Fragment>
                            {this.renderRadio({
                              name: "conflictAction",
                              label:
                                "__MSG_options_conflict_action_label_uniquify__",
                              value: Constants.CONFLICT_ACTION.UNIQUIFY,
                              checked:
                                ruleset.conflictAction ===
                                Constants.CONFLICT_ACTION.UNIQUIFY,
                              disabled: ruleset.conflictActionInherit,
                            })}
                            {this.renderRadio({
                              name: "conflictAction",
                              label:
                                "__MSG_options_conflict_action_label_overwrite__",
                              value: Constants.CONFLICT_ACTION.OVERWRITE,
                              checked:
                                ruleset.conflictAction ===
                                Constants.CONFLICT_ACTION.OVERWRITE,
                              disabled: ruleset.conflictActionInherit,
                            })}
                          </Fragment>
                        ),
                      })}
                      {this.renderInheritGroup({
                        name: "downloadCompleteInherit",
                        checked: ruleset.downloadCompleteInherit,
                        title: "__MSG_options_download_complete_title__",
                        children: (
                          <Fragment>
                            {this.renderCheckbox({
                              name: "closeTab",
                              label: "__MSG_options_close_tab__",
                              checked: ruleset.closeTab,
                              disabled: ruleset.downloadCompleteInherit,
                            })}
                            {this.renderCheckbox({
                              name: "removeEnded",
                              label: "__MSG_options_remove_ended__",
                              checked: ruleset.removeEnded,
                              disabled: ruleset.downloadCompleteInherit,
                            })}
                          </Fragment>
                        ),
                      })}
                    </div>
                  </div>
                  <div className="row">
                    <div className="column">
                      {this.renderInheritGroup({
                        name: "pathRulesInherit",
                        checked: ruleset.pathRulesInherit,
                        title: (
                          <Fragment>
                            __MSG_options_path_rules_title__ &nbsp;
                            <a
                              target="_blank"
                              href="https://github.com/mcdamo/tab-image-saver/#path-rules"
                            >
                              __MSG_options_learn_more__
                            </a>
                          </Fragment>
                        ),
                        children: (
                          <Fragment>
                            <span className="note">
                              __MSG_options_path_rules_note__
                            </span>
                            <label className="text">
                              __MSG_options_path_rules_label__
                            </label>
                            {this.renderRules({
                              rules: ruleset.pathRules,
                              ruleNewValue: pathRulesNewValue,
                              rulesName: "pathRules",
                              scopeName: "ruleset",
                              showText,
                              placeholder: browser.i18n.getMessage(
                                "options_path_rule_add_placeholder"
                              ),
                              focusInput:
                                focusInput &&
                                focusInput.name === "ruleset.pathRules" &&
                                focusInput,
                              testLabel: "__MSG_options_path_rule_test_label__",
                              testNote: (
                                <span className="note">
                                  __MSG_options_path_rule_test_note__
                                </span>
                              ),
                              testUrl: testRulesetPathRulesUrl,
                              test: testRulesetPathRules,
                              onTestChange: (ev) =>
                                this.handleLocalChange(ev, {
                                  name: "testRulesetPathRulesUrl",
                                }),
                              onTestSubmit: (ev) =>
                                this.handleTestRules(ev, {
                                  url: testRulesetPathRulesUrl,
                                  name: "testRulesetPathRules",
                                  rules: ruleset.pathRules,
                                }),
                            })}
                          </Fragment>
                        ),
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

export default OptionsUI;
