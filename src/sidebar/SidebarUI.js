import React, { Component, Fragment } from "react";
import Constants from "../background/constants";

import "../common.css";
import "./sidebar.css";

const MESSAGE_TYPE = { ...Constants.MESSAGE_TYPE };

async function getWindowId() {
  const mywindow = await browser.windows.getCurrent();
  return mywindow.id;
}

class SidebarUI extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loaded: false,
      backgroundApp: null,
      windowId: null,
      showErrors: false,
      runtime: null,
      status: null,
    };

    this.actionDefault = this.actionDefault.bind(this);
    this.actionActive = this.actionActive.bind(this);
    this.actionLeft = this.actionLeft.bind(this);
    this.actionRight = this.actionRight.bind(this);
    this.actionAll = this.actionAll.bind(this);
    this.actionCancel = this.actionCancel.bind(this);
    this.actionTest = this.actionTest.bind(this);
    this.showOptions = this.showOptions.bind(this);
    this.showDownloads = this.showDownloads.bind(this);
    this.showErrors = this.showErrors.bind(this);
  }

  async componentDidMount() {
    const page = await browser.runtime.getBackgroundPage();
    this.setState({
      loaded: true,
      backgroundApp: page && page.backgroundApp,
    });
  }

  // privateWindows
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

  async runAction(action) {
    const windowId = await getWindowId();
    if (this.state.backgroundApp) {
      // reset state before calling action
      const finishedCallback = (runtime) => {
        console.debug("actionTest finishedCallback");
        this.showErrors(runtime);
      };
      return this.setState(
        {
          windowId,
          showErrors: false,
          runtime: null,
        },
        async () =>
          await this.state.backgroundApp.run(
            this.state.windowId,
            action,
            finishedCallback
          )
      );
    }
    // privateWindow
    return this.setState(
      {
        windowId,
        showErrors: false,
        runtime: null,
      },
      async () => {
        await this.sendMessage(MESSAGE_TYPE.RUN_ACTION, { windowId, action });
        // FIXME finishedCallback();
        await this.showErrors();
      }
    );
  }

  async actionDefault() {
    await this.runAction();
  }

  async actionActive() {
    await this.runAction(Constants.ACTION.ACTIVE);
  }

  async actionLeft() {
    await this.runAction(Constants.ACTION.LEFT);
  }

  async actionRight() {
    await this.runAction(Constants.ACTION.RIGHT);
  }

  async actionAll() {
    await this.runAction(Constants.ACTION.ALL);
  }

  async actionTest() {
    await this.runAction(Constants.ACTION.TEST);
  }

  async actionCancel() {
    await this.runAction(Constants.ACTION.CANCEL);
  }

  async showOptions() {
    this.state.backgroundApp
      ? this.state.backgroundApp.handleCommandOptions()
      : this.sendMessage(MESSAGE_TYPE.COMMAND_OPTIONS);
  }

  async showDownloads() {
    this.state.backgroundApp
      ? this.state.backgroundApp.handleCommandDownloads()
      : this.sendMessage(MESSAGE_TYPE.COMMAND_DOWNLOADS);
  }

  async getRuntimeLast() {
    const windowId = await getWindowId();
    if (this.state.backgroundApp) {
      return this.state.backgroundApp.getRuntimeLast(await getWindowId());
    }
    // privateWindow
    return await this.sendMessage(MESSAGE_TYPE.RUNTIME_LAST, { windowId });
  }

  async showErrors(loaded) {
    const runtime = loaded ? loaded : await this.getRuntimeLast();
    console.debug("runtime", runtime);
    return this.setState({
      showErrors: true,
      runtime,
    });
  }

  // test or error result
  renderResults(results) {
    return (
      <Fragment>
        {results.map((props, key) => {
          console.debug("renderResults", props);
          const { url, tabUrl, path, index, options, message } = props;
          let rulesetName = null;
          if (options) {
            rulesetName =
              "rulesetName" in options
                ? options.rulesetName
                : browser.i18n.getMessage("options_rulesets_global_title");
          }
          return (
            <div className="imageWrapper" key={key}>
              <a href={url}>
                <img src={url} />
              </a>
              {index && <div className="imageNum">{index}</div>}
              <div className="imageLabels">
                {tabUrl && (
                  <div>
                    <em>
                      <a href={tabUrl}>{tabUrl}</a>
                    </em>
                  </div>
                )}
                {rulesetName && (
                  <div>
                    <em>{rulesetName}</em>
                  </div>
                )}
                {path && <div>{path}</div>}
                {message && <div className="error">{message}</div>}
              </div>
            </div>
          );
        })}
      </Fragment>
    );
  }

  renderErrors(runtime) {
    console.debug("renderErrors", runtime);
    if (!runtime || !runtime.pathsFailed || !runtime.imagesFailed) {
      return (
        <h3 className="title">{browser.i18n.getMessage("no_history_title")}</h3>
      );
    }
    if (runtime.pathsFailed.length === 0 && runtime.imagesFailed.length === 0) {
      return (
        <h3 className="title">{browser.i18n.getMessage("no_errors_title")}</h3>
      );
    }
    return (
      <Fragment>
        {runtime.pathsFailed.length > 0 && (
          <Fragment>
            <h3 className="title">
              {browser.i18n.getMessage("paths_failed_title")}
            </h3>
            {this.renderResults(runtime.pathsFailed)}
          </Fragment>
        )}
        {runtime.imagesFailed.length > 0 && (
          <Fragment>
            <h3 className="title">
              {browser.i18n.getMessage("downloads_failed_title")}
            </h3>
            {this.renderResults(runtime.imagesFailed)}
          </Fragment>
        )}
      </Fragment>
    );
  }

  renderTest(runtime) {
    if (!runtime || !runtime.dlTest) {
      return "";
    }
    return (
      <Fragment>
        {runtime.dlTest.length > 0 && (
          <Fragment>
            <h3 className="title">
              {browser.i18n.getMessage("test_downloads_title")}
            </h3>
            {this.renderResults(runtime.dlTest)}
          </Fragment>
        )}
      </Fragment>
    );
  }

  render() {
    const { runtime, showErrors } = this.state;
    return (
      <div id="sidebar-content" className="center">
        <div id="actions">
          <div className="center row">
            <div
              id="default-action"
              className="button selected"
              onClick={this.actionDefault}
            >
              <div className="default-icon icon">
                __MSG_button_default_action_label__
              </div>
            </div>
            <div
              id="cancel-action"
              className="button"
              onClick={this.actionCancel}
            >
              <div className="cancel-action-icon icon">
                __MSG_button_cancel_action_label__
              </div>
            </div>
          </div>
          <div className="center row">
            <div
              id="active-action"
              className="button"
              onClick={this.actionActive}
            >
              <div className="active-action-icon icon">
                __MSG_button_active_action_label__
              </div>
            </div>
            <div id="left-action" className="button" onClick={this.actionLeft}>
              <div className="left-action-icon icon">
                __MSG_button_left_action_label__
              </div>
            </div>
            <div
              id="right-action"
              className="button"
              onClick={this.actionRight}
            >
              <div className="right-action-icon icon">
                __MSG_button_right_action_label__
              </div>
            </div>
            <div id="all-action" className="button" onClick={this.actionAll}>
              <div className="all-action-icon icon">
                __MSG_button_all_action_label__
              </div>
            </div>
          </div>
          <div className="center row">
            <div
              id="show-options"
              className="button"
              onClick={this.showOptions}
            >
              <div className="options-icon icon">
                __MSG_browser_action_menu_options__
              </div>
            </div>
            <div
              id="show-downloads"
              className="button"
              onClick={this.showDownloads}
            >
              <div className="downloads-icon icon">
                __MSG_browser_action_menu_downloads__
              </div>
            </div>
          </div>
          <div className="center row">
            <div id="show-errors" className="button" onClick={this.actionTest}>
              <div className="test-action-icon icon">
                __MSG_button_test_action_label__
              </div>
            </div>
            <div
              id="show-errors"
              className="button"
              onClick={() => this.showErrors(runtime)}
            >
              <div className="errors-action-icon icon">
                __MSG_button_errors_action_label__
              </div>
            </div>
          </div>
        </div>
        <div id="errors">{showErrors && this.renderErrors(runtime)}</div>
        <div id="test">{showErrors && this.renderTest(runtime)}</div>
      </div>
    );
  }

  init() {}
}

export default SidebarUI;
