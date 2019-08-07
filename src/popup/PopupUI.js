import Constants from "../background/constants";
import "../common.css";
import "./popup.css";
import React, { Component } from "react";

class PopupUI extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loaded: false,
      backgroundApp: null,
      windowId: null,
    };

    this.actionDefault = this.actionDefault.bind(this);
    this.actionActive = this.actionActive.bind(this);
    this.actionLeft = this.actionLeft.bind(this);
    this.actionRight = this.actionRight.bind(this);
    this.actionAll = this.actionAll.bind(this);
    this.actionCancel = this.actionCancel.bind(this);
    this.showOptions = this.showOptions.bind(this);
    this.showDownloads = this.showDownloads.bind(this);
    this.showSidebar = this.showSidebar.bind(this);
  }

  async componentDidMount() {
    try {
      const page = await browser.runtime.getBackgroundPage();
      const windowId = await page.getWindowId();
      this.setState({
        loaded: true,
        backgroundApp: page.backgroundApp,
        windowId,
      });
    } catch (err) {
      console.error(err);
    }
  }

  async runAction(action) {
    await this.state.backgroundApp.run(this.state.windowId, action);
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

  async actionCancel() {
    await this.runAction(Constants.ACTION.CANCEL);
  }

  showOptions() {
    this.state.backgroundApp.handleCommandOptions();
  }

  showDownloads() {
    this.state.backgroundApp.handleCommandDownloads();
  }

  showSidebar() {
    this.state.backgroundApp.handleCommandSidebar();
  }

  render() {
    const { backgroundApp } = this.state;
    // dynamic action label
    const action = backgroundApp ? backgroundApp.getAction() : "default";
    return (
      <div id="popup-content" className="center">
        <h1 id="header">__MSG_extension_name__</h1>
        <div id="actions">
          <div className="center row">
            <div
              id="default-action"
              className="button selected"
              onClick={this.actionDefault}
            >
              <div className="default-icon icon">
                {browser.i18n.getMessage(`button_${action}_action_label`)}
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
            <div id="show-errors" className="button" onClick={this.showSidebar}>
              <div className="sidebar-icon icon">
                __MSG_browser_action_menu_sidebar__
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  init() {}
}

export default PopupUI;
